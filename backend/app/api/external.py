"""
External REST API (v1) for Listabob.

Designed for programmatic access from Python tools and other HTTP clients.
All endpoints require Bearer token authentication.
Item values use human-readable column names instead of internal UUIDs.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any
from datetime import datetime

from app.database import get_db
from app.models import List, Column, Item, ItemValue
from app.api.dependencies import require_token
from app.api.items import get_value_for_column, extract_value

router = APIRouter(
    prefix="/v1",
    tags=["external-api"],
    dependencies=[Depends(require_token)],
)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ExternalListSummary(BaseModel):
    id: str
    name: str
    description: str | None = None
    icon: str | None = None
    item_count: int = 0
    created_at: datetime
    updated_at: datetime


class ExternalColumnInfo(BaseModel):
    id: str
    name: str
    type: str
    position: int
    is_required: bool = False
    config: dict | None = None


class ExternalListDetail(BaseModel):
    id: str
    name: str
    description: str | None = None
    icon: str | None = None
    item_count: int = 0
    columns: list[ExternalColumnInfo] = []
    created_at: datetime
    updated_at: datetime


class ExternalItemResponse(BaseModel):
    id: str
    list_id: str
    position: int | None = None
    values: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class ExternalItemCreate(BaseModel):
    values: dict[str, Any] = {}


class ExternalItemUpdate(BaseModel):
    values: dict[str, Any] = {}


class ExternalItemsResponse(BaseModel):
    list_id: str
    list_name: str
    total: int
    items: list[ExternalItemResponse]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _col_name_to_id(columns: list[Column]) -> dict[str, Column]:
    """Build a case-insensitive column-name → Column lookup."""
    return {col.name.lower(): col for col in columns}


def _col_id_to_name(columns: list[Column]) -> dict[str, str]:
    """Build column-id → column-name lookup."""
    return {col.id: col.name for col in columns}


def _item_to_external(
    item: Item, columns: list[Column], db: Session
) -> ExternalItemResponse:
    """Convert an Item to the external response format with column names as keys."""
    col_types = {col.id: col.column_type for col in columns}
    id_to_name = _col_id_to_name(columns)

    item_values = db.query(ItemValue).filter(ItemValue.item_id == item.id).all()
    values: dict[str, Any] = {}
    for iv in item_values:
        col_type = col_types.get(iv.column_id, "text")
        col_name = id_to_name.get(iv.column_id)
        if col_name:
            values[col_name] = extract_value(iv, col_type)

    return ExternalItemResponse(
        id=item.id,
        list_id=item.list_id,
        position=item.position,
        values=values,
        created_at=item.created_at,
        updated_at=item.updated_at,
        deleted_at=item.deleted_at,
    )


def _resolve_values(
    raw: dict[str, Any], columns: list[Column]
) -> dict[str, Any]:
    """Map column-name-keyed values to column-id-keyed values.

    Raises HTTPException 400 if a column name is not found.
    """
    name_map = _col_name_to_id(columns)
    resolved: dict[str, Any] = {}
    for name, value in raw.items():
        col = name_map.get(name.lower())
        if col is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown column: '{name}'. Available columns: {[c.name for c in columns]}",
            )
        resolved[col.id] = value
    return resolved


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/lists", response_model=list[ExternalListSummary])
def list_all_lists(db: Session = Depends(get_db)):
    """Return all lists with their item counts."""
    lists = db.query(List).order_by(List.updated_at.desc()).all()
    results = []
    for lst in lists:
        count = (
            db.query(Item)
            .filter(Item.list_id == lst.id, Item.deleted_at.is_(None))
            .count()
        )
        results.append(
            ExternalListSummary(
                id=lst.id,
                name=lst.name,
                description=lst.description,
                icon=lst.icon,
                item_count=count,
                created_at=lst.created_at,
                updated_at=lst.updated_at,
            )
        )
    return results


@router.get("/lists/{list_id}", response_model=ExternalListDetail)
def get_list_detail(list_id: str, db: Session = Depends(get_db)):
    """Return list metadata including column schema."""
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    count = (
        db.query(Item)
        .filter(Item.list_id == list_id, Item.deleted_at.is_(None))
        .count()
    )
    return ExternalListDetail(
        id=db_list.id,
        name=db_list.name,
        description=db_list.description,
        icon=db_list.icon,
        item_count=count,
        columns=[
            ExternalColumnInfo(
                id=c.id,
                name=c.name,
                type=c.column_type,
                position=c.position,
                is_required=c.is_required,
                config=c.config,
            )
            for c in db_list.columns
        ],
        created_at=db_list.created_at,
        updated_at=db_list.updated_at,
    )


@router.get("/lists/{list_id}/items", response_model=ExternalItemsResponse)
def get_items(
    list_id: str,
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Return all items in a list. Values are keyed by column name."""
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    query = db.query(Item).filter(Item.list_id == list_id)
    if not include_deleted:
        query = query.filter(Item.deleted_at.is_(None))
    items = query.order_by(Item.position).all()

    return ExternalItemsResponse(
        list_id=db_list.id,
        list_name=db_list.name,
        total=len(items),
        items=[_item_to_external(i, db_list.columns, db) for i in items],
    )


@router.get("/lists/{list_id}/items/{item_id}", response_model=ExternalItemResponse)
def get_item(list_id: str, item_id: str, db: Session = Depends(get_db)):
    """Return a single item by ID."""
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    item = db.query(Item).filter(
        Item.id == item_id, Item.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    return _item_to_external(item, db_list.columns, db)


@router.post(
    "/lists/{list_id}/items",
    response_model=ExternalItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_item(
    list_id: str, data: ExternalItemCreate, db: Session = Depends(get_db)
):
    """Create a new item. Provide values keyed by column name."""
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    column_map = {col.id: col for col in db_list.columns}
    resolved = _resolve_values(data.values, db_list.columns)

    max_pos = db.query(Item).filter(Item.list_id == list_id).count()
    item = Item(list_id=list_id, position=max_pos)
    db.add(item)
    db.flush()

    for col_id, value in resolved.items():
        col = column_map[col_id]
        value_fields = get_value_for_column(value, col.column_type)
        iv = ItemValue(item_id=item.id, column_id=col_id, **value_fields)
        db.add(iv)

    db.commit()
    item = db.query(Item).filter(Item.id == item.id).first()
    return _item_to_external(item, db_list.columns, db)


@router.put("/lists/{list_id}/items/{item_id}", response_model=ExternalItemResponse)
def update_item(
    list_id: str,
    item_id: str,
    data: ExternalItemUpdate,
    db: Session = Depends(get_db),
):
    """Update item values. Only provided columns are changed."""
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    item = db.query(Item).filter(
        Item.id == item_id, Item.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    column_map = {col.id: col for col in db_list.columns}
    resolved = _resolve_values(data.values, db_list.columns)

    for col_id, value in resolved.items():
        col = column_map[col_id]
        value_fields = get_value_for_column(value, col.column_type)

        existing = db.query(ItemValue).filter(
            ItemValue.item_id == item_id, ItemValue.column_id == col_id
        ).first()

        if existing:
            for key, val in value_fields.items():
                setattr(existing, key, val)
        else:
            iv = ItemValue(item_id=item_id, column_id=col_id, **value_fields)
            db.add(iv)

    item.updated_at = datetime.utcnow()
    db.commit()

    item = db.query(Item).filter(Item.id == item.id).first()
    return _item_to_external(item, db_list.columns, db)


@router.delete(
    "/lists/{list_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_item(list_id: str, item_id: str, db: Session = Depends(get_db)):
    """Soft-delete an item (can be restored from the UI)."""
    item = db.query(Item).filter(
        Item.id == item_id, Item.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.query(Item).filter(Item.id == item_id).update(
        {"deleted_at": datetime.utcnow()}, synchronize_session="fetch"
    )
    db.commit()
