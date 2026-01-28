from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.models import List, Item, ItemValue, Column
from app.schemas import ItemCreate, ItemUpdate, ItemResponse
from typing import Any

router = APIRouter(prefix="/lists/{list_id}/items", tags=["items"])


def get_value_for_column(value: Any, column_type: str) -> dict:
    """Convert a value to the appropriate storage fields based on column type."""
    result = {
        "value_text": None,
        "value_number": None,
        "value_date": None,
        "value_boolean": None,
        "value_json": None
    }
    
    if value is None:
        return result
    
    if column_type in ("text", "hyperlink", "person", "location"):
        result["value_text"] = str(value)
    elif column_type in ("number", "currency", "rating"):
        result["value_number"] = float(value) if value else None
    elif column_type in ("date", "datetime"):
        result["value_text"] = str(value)  # Store as ISO string for simplicity
    elif column_type == "boolean":
        result["value_boolean"] = bool(value)
    elif column_type in ("choice", "multiple_choice", "image", "attachment"):
        result["value_json"] = value if isinstance(value, dict) else {"value": value}
    else:
        result["value_text"] = str(value)
    
    return result


def extract_value(item_value: ItemValue, column_type: str) -> Any:
    """Extract the actual value from ItemValue based on column type."""
    if column_type in ("text", "hyperlink", "person", "location", "date", "datetime"):
        return item_value.value_text
    elif column_type in ("number", "currency", "rating"):
        return item_value.value_number
    elif column_type == "boolean":
        return item_value.value_boolean
    elif column_type in ("choice", "multiple_choice"):
        # Choice values are stored as {"value": "..."}, extract the actual value
        if item_value.value_json and isinstance(item_value.value_json, dict):
            return item_value.value_json.get("value")
        return item_value.value_json
    elif column_type in ("image", "attachment"):
        return item_value.value_json
    return item_value.value_text


def item_to_response(item: Item, columns: list[Column], db: Session) -> ItemResponse:
    """Convert an Item model to ItemResponse with flattened values."""
    column_types = {col.id: col.column_type for col in columns}
    values = {}
    
    # Query ItemValues directly to avoid relationship issues
    item_values = db.query(ItemValue).filter(ItemValue.item_id == item.id).all()
    for iv in item_values:
        col_type = column_types.get(iv.column_id, "text")
        values[iv.column_id] = extract_value(iv, col_type)
    
    return ItemResponse(
        id=item.id,
        list_id=item.list_id,
        position=item.position,
        values=values,
        created_at=item.created_at,
        updated_at=item.updated_at
    )


@router.get("", response_model=list[ItemResponse])
def get_items(
    list_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    items = db.query(Item).filter(Item.list_id == list_id).offset(skip).limit(limit).all()
    return [item_to_response(item, db_list.columns, db) for item in items]


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(list_id: str, data: ItemCreate, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    # Get column types
    column_types = {col.id: col.column_type for col in db_list.columns}
    
    # Get next position
    max_pos = db.query(Item).filter(Item.list_id == list_id).count()
    
    # Create item
    item = Item(list_id=list_id, position=max_pos)
    db.add(item)
    db.flush()
    
    # Create item values
    for column_id, value in data.values.items():
        if column_id not in column_types:
            continue
        
        col_type = column_types[column_id]
        value_fields = get_value_for_column(value, col_type)
        
        item_value = ItemValue(
            item_id=item.id,
            column_id=column_id,
            **value_fields
        )
        db.add(item_value)
    
    db.commit()
    
    # Reload item
    item = db.query(Item).filter(Item.id == item.id).first()
    return item_to_response(item, db_list.columns, db)


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(list_id: str, item_id: str, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    item = db.query(Item).filter(Item.id == item_id, Item.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return item_to_response(item, db_list.columns, db)


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(list_id: str, item_id: str, data: ItemUpdate, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    item = db.query(Item).filter(Item.id == item_id, Item.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    column_types = {col.id: col.column_type for col in db_list.columns}
    
    # Update item values
    for column_id, value in data.values.items():
        if column_id not in column_types:
            continue
        
        col_type = column_types[column_id]
        value_fields = get_value_for_column(value, col_type)
        
        # Find existing value or create new
        item_value = db.query(ItemValue).filter(
            ItemValue.item_id == item_id,
            ItemValue.column_id == column_id
        ).first()
        
        if item_value:
            for key, val in value_fields.items():
                setattr(item_value, key, val)
        else:
            item_value = ItemValue(
                item_id=item_id,
                column_id=column_id,
                **value_fields
            )
            db.add(item_value)
    
    db.commit()
    
    # Reload item
    item = db.query(Item).filter(Item.id == item.id).first()
    return item_to_response(item, db_list.columns, db)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(list_id: str, item_id: str, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id, Item.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
