"""CSV Export API endpoints."""
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import List, Column, Item, ItemValue
from app.schemas import ColumnType

router = APIRouter(prefix="/export", tags=["export"])


def extract_value_for_export(item_value: ItemValue, column_type: str) -> str:
    """Extract and format value for CSV export."""
    if column_type in ("text", "hyperlink", "person", "location", "date", "datetime"):
        return item_value.value_text or ""
    elif column_type in ("number", "currency", "rating"):
        if item_value.value_number is not None:
            # Format as integer if whole number
            if item_value.value_number == int(item_value.value_number):
                return str(int(item_value.value_number))
            return str(item_value.value_number)
        return ""
    elif column_type == "boolean":
        if item_value.value_boolean is not None:
            return "True" if item_value.value_boolean else "False"
        return ""
    elif column_type in ("choice", "multiple_choice"):
        # Check value_json first, then value_text
        if item_value.value_json and isinstance(item_value.value_json, dict):
            return item_value.value_json.get("value", "")
        if item_value.value_json:
            return str(item_value.value_json)
        return item_value.value_text or ""
    return item_value.value_text or ""


@router.get("/csv/{list_id}")
async def export_list_to_csv(
    list_id: str,
    include_header: bool = Query(True, description="Include column headers in CSV"),
    db: Session = Depends(get_db)
):
    """Export a list to CSV format."""
    # Get the list
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    # Get columns ordered by position
    columns = db.query(Column).filter(Column.list_id == list_id).order_by(Column.position).all()
    
    # Get items ordered by position
    items = db.query(Item).filter(Item.list_id == list_id).order_by(Item.position).all()
    
    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header row if requested
    if include_header:
        header = [col.name for col in columns]
        writer.writerow(header)
    
    # Build column type lookup
    column_types = {col.id: col.column_type for col in columns}
    column_order = [col.id for col in columns]
    
    # Write data rows
    for item in items:
        # Get all values for this item
        item_values = db.query(ItemValue).filter(ItemValue.item_id == item.id).all()
        value_map = {iv.column_id: iv for iv in item_values}
        
        row = []
        for col_id in column_order:
            if col_id in value_map:
                col_type = column_types.get(col_id, "text")
                row.append(extract_value_for_export(value_map[col_id], col_type))
            else:
                row.append("")
        writer.writerow(row)
    
    # Prepare response
    output.seek(0)
    
    # Generate filename
    safe_name = "".join(c for c in db_list.name if c.isalnum() or c in (' ', '-', '_')).strip()
    filename = f"{safe_name}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
