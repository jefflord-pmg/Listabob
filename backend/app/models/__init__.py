import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class List(Base):
    __tablename__ = "lists"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(20))
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    template_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    columns: Mapped[list["Column"]] = relationship("Column", back_populates="list", cascade="all, delete-orphan", order_by="Column.position")
    items: Mapped[list["Item"]] = relationship("Item", back_populates="list", cascade="all, delete-orphan")
    views: Mapped[list["View"]] = relationship("View", back_populates="list", cascade="all, delete-orphan")


class Column(Base):
    __tablename__ = "columns"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    list_id: Mapped[str] = mapped_column(String(36), ForeignKey("lists.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    column_type: Mapped[str] = mapped_column(String(50), nullable=False)  # text, number, currency, date, choice, boolean, etc.
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    config: Mapped[dict | None] = mapped_column(JSON)  # Type-specific config (choices, formula, etc.)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    list: Mapped["List"] = relationship("List", back_populates="columns")
    values: Mapped[list["ItemValue"]] = relationship("ItemValue", back_populates="column", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    list_id: Mapped[str] = mapped_column(String(36), ForeignKey("lists.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
    
    # Relationships
    list: Mapped["List"] = relationship("List", back_populates="items")
    values: Mapped[list["ItemValue"]] = relationship("ItemValue", back_populates="item", cascade="all, delete-orphan")


class ItemValue(Base):
    __tablename__ = "item_values"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    item_id: Mapped[str] = mapped_column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    column_id: Mapped[str] = mapped_column(String(36), ForeignKey("columns.id", ondelete="CASCADE"), nullable=False)
    value_text: Mapped[str | None] = mapped_column(Text)
    value_number: Mapped[float | None] = mapped_column()
    value_date: Mapped[datetime | None] = mapped_column(DateTime)
    value_boolean: Mapped[bool | None] = mapped_column(Boolean)
    value_json: Mapped[dict | None] = mapped_column(JSON)  # For complex types
    
    # Relationships
    item: Mapped["Item"] = relationship("Item", back_populates="values")
    column: Mapped["Column"] = relationship("Column", back_populates="values")


class View(Base):
    __tablename__ = "views"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    list_id: Mapped[str] = mapped_column(String(36), ForeignKey("lists.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    view_type: Mapped[str] = mapped_column(String(50), nullable=False)  # grid, gallery, calendar, board
    config: Mapped[dict | None] = mapped_column(JSON)  # Filters, sorts, grouping, visible columns
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    list: Mapped["List"] = relationship("List", back_populates="views")


class Template(Base):
    __tablename__ = "templates"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(50))
    category: Mapped[str | None] = mapped_column(String(100))
    columns_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    sample_data: Mapped[dict | None] = mapped_column(JSON)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=True)
