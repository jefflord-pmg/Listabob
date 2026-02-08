from datetime import datetime
from pydantic import BaseModel, Field
from typing import Any
from enum import Enum


class ColumnType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    CURRENCY = "currency"
    DATE = "date"
    DATETIME = "datetime"
    CHOICE = "choice"
    MULTIPLE_CHOICE = "multiple_choice"
    BOOLEAN = "boolean"
    HYPERLINK = "hyperlink"
    IMAGE = "image"
    ATTACHMENT = "attachment"
    RATING = "rating"
    PERSON = "person"
    LOCATION = "location"


class ViewType(str, Enum):
    GRID = "grid"
    GALLERY = "gallery"
    CALENDAR = "calendar"
    BOARD = "board"


# Column Schemas
class ColumnBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    column_type: ColumnType
    is_required: bool = False
    config: dict | None = None


class ColumnCreate(ColumnBase):
    pass


class ColumnUpdate(BaseModel):
    name: str | None = None
    column_type: ColumnType | None = None
    is_required: bool | None = None
    config: dict | None = None


class ColumnReorder(BaseModel):
    column_ids: list[str]


class ColumnResponse(ColumnBase):
    id: str
    list_id: str
    position: int
    created_at: datetime

    class Config:
        from_attributes = True


# List Schemas
class ListBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    icon: str | None = None
    color: str | None = None


class ListCreate(ListBase):
    columns: list[ColumnCreate] | None = None


class ListUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    is_favorite: bool | None = None


class ListSummary(ListBase):
    id: str
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ListResponse(ListSummary):
    columns: list[ColumnResponse] = []
    views: list["ViewResponse"] = []

    class Config:
        from_attributes = True


# Item Value Schemas
class ItemValueBase(BaseModel):
    column_id: str
    value: Any  # Will be validated based on column type


class ItemValueResponse(BaseModel):
    column_id: str
    value_text: str | None = None
    value_number: float | None = None
    value_date: datetime | None = None
    value_boolean: bool | None = None
    value_json: dict | None = None

    class Config:
        from_attributes = True


# Item Schemas
class ItemCreate(BaseModel):
    values: dict[str, Any] = {}  # column_id -> value


class ItemUpdate(BaseModel):
    values: dict[str, Any] = {}  # column_id -> value


class ItemResponse(BaseModel):
    id: str
    list_id: str
    position: int | None
    values: dict[str, Any] = {}  # column_id -> value (flattened)
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


# View Schemas
class ViewBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    view_type: ViewType
    config: dict | None = None


class ViewCreate(ViewBase):
    pass


class ViewUpdate(BaseModel):
    name: str | None = None
    config: dict | None = None
    is_default: bool | None = None


class ViewResponse(ViewBase):
    id: str
    list_id: str
    is_default: bool
    position: int | None
    created_at: datetime

    class Config:
        from_attributes = True


# Template Schemas
class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str | None
    icon: str | None
    category: str | None
    columns_config: dict
    is_builtin: bool

    class Config:
        from_attributes = True
