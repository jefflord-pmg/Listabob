"""CSV Import API endpoints."""
import csv
import io
import re
from datetime import datetime
from typing import Any
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import List, Column, Item, ItemValue, View
from app.schemas import ColumnType

router = APIRouter(prefix="/import", tags=["import"])


class ColumnPreview(BaseModel):
    name: str
    guessed_type: ColumnType
    sample_values: list[str]
    distinct_values: list[str] | None = None  # For choice/multiple_choice


class CSVPreviewResponse(BaseModel):
    columns: list[ColumnPreview]
    sample_rows: list[dict[str, str]]
    total_rows: int


class ColumnConfig(BaseModel):
    name: str
    column_type: ColumnType


class CreateListFromCSVRequest(BaseModel):
    list_name: str
    list_description: str = ""
    has_header_row: bool = True
    columns: list[ColumnConfig]
    data: list[dict[str, str]]


def guess_column_type(values: list[str]) -> tuple[ColumnType, list[str] | None]:
    """Guess the column type based on sample values."""
    non_empty = [v.strip() for v in values if v and v.strip()]
    
    if not non_empty:
        return ColumnType.TEXT, None
    
    # Check for array-like values (comma-separated, bracketed, etc.)
    array_pattern = re.compile(r'^\[.*\]$|^.*,.*$')
    array_count = sum(1 for v in non_empty if array_pattern.match(v) and ',' in v)
    if array_count > len(non_empty) * 0.5:  # More than 50% look like arrays
        # Collect all distinct values across all cells
        all_choices = set()
        for v in non_empty:
            # Remove brackets if present
            cleaned = v.strip('[]')
            # Split by comma and clean
            parts = [p.strip().strip('"\'') for p in cleaned.split(',')]
            all_choices.update(p for p in parts if p)
        return ColumnType.MULTIPLE_CHOICE, sorted(all_choices)
    
    # Check for boolean
    bool_values = {'true', 'false', 'yes', 'no', '1', '0', 'y', 'n'}
    if all(v.lower() in bool_values for v in non_empty):
        return ColumnType.BOOLEAN, None
    
    # Check for numbers
    def is_number(s: str) -> bool:
        try:
            # Handle currency symbols
            cleaned = re.sub(r'[$€£¥,]', '', s)
            float(cleaned)
            return True
        except ValueError:
            return False
    
    if all(is_number(v) for v in non_empty):
        # Check if it looks like currency
        if any(re.match(r'^[$€£¥]', v) for v in non_empty):
            return ColumnType.CURRENCY, None
        # Check if it looks like ratings (1-5 integers)
        try:
            nums = [float(re.sub(r'[$€£¥,]', '', v)) for v in non_empty]
            if all(1 <= n <= 5 and n == int(n) for n in nums):
                return ColumnType.RATING, None
        except:
            pass
        return ColumnType.NUMBER, None
    
    # Check for dates and datetimes using common formats
    datetime_patterns = [
        # ISO formats with time
        r'^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?',  # 2024-01-15T10:30:00 or 2024-01-15 10:30
        r'^\d{2}/\d{2}/\d{4}\s+\d{1,2}:\d{2}',  # 01/15/2024 10:30
        r'^\d{2}-\d{2}-\d{4}\s+\d{1,2}:\d{2}',  # 01-15-2024 10:30
    ]
    
    date_patterns = [
        r'^\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD (ISO)
        r'^\d{2}/\d{2}/\d{4}$',  # MM/DD/YYYY
        r'^\d{2}-\d{2}-\d{4}$',  # MM-DD-YYYY
        r'^\d{4}/\d{2}/\d{2}$',  # YYYY/MM/DD
        r'^\d{1,2}/\d{1,2}/\d{2,4}$',  # M/D/YY or M/D/YYYY
        r'^\d{1,2}-\d{1,2}-\d{2,4}$',  # M-D-YY or M-D-YYYY
        r'^\d{1,2}\s+\w{3,9}\s+\d{2,4}$',  # 15 January 2024 or 15 Jan 24
        r'^\w{3,9}\s+\d{1,2},?\s+\d{2,4}$',  # January 15, 2024 or Jan 15 2024
        r'^\d{8}$',  # YYYYMMDD or MMDDYYYY
    ]
    
    # First check for datetime (must have time component)
    datetime_match_count = 0
    for v in non_empty:
        if any(re.match(p, v, re.IGNORECASE) for p in datetime_patterns):
            datetime_match_count += 1
    if datetime_match_count > len(non_empty) * 0.7:
        return ColumnType.DATETIME, None
    
    # Then check for date only
    date_match_count = 0
    for v in non_empty:
        if any(re.match(p, v, re.IGNORECASE) for p in date_patterns):
            date_match_count += 1
    if date_match_count > len(non_empty) * 0.7:  # 70% match date patterns
        return ColumnType.DATE, None
    
    # Check for URLs
    url_pattern = re.compile(r'^https?://')
    if all(url_pattern.match(v) for v in non_empty):
        return ColumnType.HYPERLINK, None
    
    # Check if it could be a choice field (limited distinct values)
    distinct = set(non_empty)
    if len(distinct) <= min(10, len(non_empty) * 0.3):  # Few distinct values
        return ColumnType.CHOICE, sorted(distinct)
    
    return ColumnType.TEXT, None


@router.post("/csv/preview", response_model=CSVPreviewResponse)
async def preview_csv(
    file: UploadFile = File(...),
    has_header_row: bool = Form(True)
):
    """Preview a CSV file and guess column types."""
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('latin-1')
    
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    
    # Determine column names
    if has_header_row:
        # Strip BOM, quotes and whitespace from column names
        column_names = []
        for name in rows[0]:
            # Remove BOM if present (common in Excel CSVs)
            cleaned = name.lstrip('\ufeff').strip().strip('"\'').strip()
            column_names.append(cleaned)
        data_rows = rows[1:]
    else:
        column_names = [f"Column {i+1}" for i in range(len(rows[0]))]
        data_rows = rows
    
    # Sample first 10 rows for type guessing
    sample_rows = data_rows[:10]
    
    # Build column previews
    columns: list[ColumnPreview] = []
    for i, name in enumerate(column_names):
        # Get all values for this column
        col_values = [row[i] if i < len(row) else "" for row in data_rows]
        sample_values = [row[i] if i < len(row) else "" for row in sample_rows]
        
        # Get unique sample values while preserving order
        seen = set()
        unique_samples = []
        for v in sample_values:
            if v not in seen:
                seen.add(v)
                unique_samples.append(v)
        
        guessed_type, distinct_values = guess_column_type(col_values)
        
        columns.append(ColumnPreview(
            name=name.strip() or f"Column {i+1}",
            guessed_type=guessed_type,
            sample_values=unique_samples[:5],  # First 5 unique samples
            distinct_values=distinct_values
        ))
    
    # Build sample row dicts
    sample_row_dicts = []
    for row in sample_rows:
        row_dict = {}
        for i, name in enumerate(column_names):
            row_dict[name] = row[i] if i < len(row) else ""
        sample_row_dicts.append(row_dict)
    
    return CSVPreviewResponse(
        columns=columns,
        sample_rows=sample_row_dicts,
        total_rows=len(data_rows)
    )


@router.post("/csv/create")
async def create_list_from_csv(
    request: CreateListFromCSVRequest,
    db: Session = Depends(get_db)
):
    """Create a new list from CSV data."""
    import uuid
    
    # Create the list
    new_list = List(
        id=str(uuid.uuid4()),
        name=request.list_name,
        description=request.list_description,
        icon="📋"
    )
    db.add(new_list)
    db.flush()
    
    # Create columns
    column_map: dict[str, Column] = {}
    for i, col_config in enumerate(request.columns):
        # Determine config based on column type
        config = None
        if col_config.column_type in (ColumnType.CHOICE, ColumnType.MULTIPLE_CHOICE):
            # Collect distinct values from all data rows
            distinct = set()
            for row in request.data:
                val = row.get(col_config.name, "")
                if val:
                    if col_config.column_type == ColumnType.MULTIPLE_CHOICE:
                        # Split array-like values
                        cleaned = val.strip('[]')
                        parts = [p.strip().strip('"\'') for p in cleaned.split(',')]
                        distinct.update(p for p in parts if p)
                    else:
                        distinct.add(val.strip())
            config = {"choices": sorted(distinct)}
        
        column = Column(
            id=str(uuid.uuid4()),
            list_id=new_list.id,
            name=col_config.name,
            column_type=col_config.column_type,
            position=i,
            config=config
        )
        db.add(column)
        column_map[col_config.name] = column
    
    db.flush()
    
    # Create default view
    default_view = View(
        id=str(uuid.uuid4()),
        list_id=new_list.id,
        name="Grid View",
        view_type="grid"
    )
    db.add(default_view)
    
    # Create items (rows)
    for i, row_data in enumerate(request.data):
        item = Item(
            id=str(uuid.uuid4()),
            list_id=new_list.id,
            position=i
        )
        db.add(item)
        db.flush()
        
        # Create item values
        for col_name, column in column_map.items():
            raw_value = row_data.get(col_name, "")
            if not raw_value:
                continue
            
            item_value = ItemValue(
                id=str(uuid.uuid4()),
                item_id=item.id,
                column_id=column.id
            )
            
            # Convert value based on column type
            if column.column_type == ColumnType.TEXT:
                item_value.value_text = raw_value
            elif column.column_type == ColumnType.NUMBER:
                try:
                    cleaned = re.sub(r'[,$]', '', raw_value)
                    item_value.value_number = float(cleaned)
                except ValueError:
                    item_value.value_text = raw_value
            elif column.column_type == ColumnType.CURRENCY:
                try:
                    cleaned = re.sub(r'[$€£¥,]', '', raw_value)
                    item_value.value_number = float(cleaned)
                except ValueError:
                    item_value.value_text = raw_value
            elif column.column_type == ColumnType.RATING:
                try:
                    item_value.value_number = float(raw_value)
                except ValueError:
                    pass
            elif column.column_type == ColumnType.BOOLEAN:
                lower = raw_value.lower()
                item_value.value_boolean = lower in ('true', 'yes', '1', 'y')
            elif column.column_type == ColumnType.DATE:
                item_value.value_text = raw_value  # Store as text, frontend handles parsing
            elif column.column_type == ColumnType.DATETIME:
                item_value.value_text = raw_value
            elif column.column_type == ColumnType.CHOICE:
                item_value.value_text = raw_value.strip()
            elif column.column_type == ColumnType.MULTIPLE_CHOICE:
                # Normalize array-like values to comma-separated
                cleaned = raw_value.strip('[]')
                parts = [p.strip().strip('"\'') for p in cleaned.split(',')]
                item_value.value_text = ','.join(p for p in parts if p)
            elif column.column_type == ColumnType.HYPERLINK:
                item_value.value_text = raw_value
            else:
                item_value.value_text = raw_value
            
            db.add(item_value)
    
    db.commit()
    
    return {
        "list_id": new_list.id,
        "name": new_list.name,
        "columns_created": len(column_map),
        "rows_created": len(request.data)
    }
