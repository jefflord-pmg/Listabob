from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import List, Column, View
from app.schemas import (
    ListCreate, ListUpdate, ListResponse, ListSummary,
    ColumnCreate, ColumnUpdate, ColumnResponse, ColumnReorder
)

router = APIRouter(prefix="/lists", tags=["lists"])


@router.get("", response_model=list[ListSummary])
def get_lists(
    favorite_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(List)
    if favorite_only:
        query = query.filter(List.is_favorite == True)
    return query.order_by(List.updated_at.desc()).all()


@router.post("", response_model=ListResponse, status_code=status.HTTP_201_CREATED)
def create_list(data: ListCreate, db: Session = Depends(get_db)):
    # Create the list
    db_list = List(
        name=data.name,
        description=data.description,
        icon=data.icon
    )
    db.add(db_list)
    db.flush()  # Get the ID
    
    # Create columns if provided
    if data.columns:
        for i, col_data in enumerate(data.columns):
            column = Column(
                list_id=db_list.id,
                name=col_data.name,
                column_type=col_data.column_type.value,
                position=i,
                is_required=col_data.is_required,
                config=col_data.config
            )
            db.add(column)
    
    # Create default grid view
    default_view = View(
        list_id=db_list.id,
        name="All Items",
        view_type="grid",
        is_default=True,
        position=0
    )
    db.add(default_view)
    
    db.commit()
    db.refresh(db_list)
    return db_list


@router.get("/{list_id}", response_model=ListResponse)
def get_list(list_id: str, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    return db_list


@router.put("/{list_id}", response_model=ListResponse)
def update_list(list_id: str, data: ListUpdate, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_list, key, value)
    
    db.commit()
    db.refresh(db_list)
    return db_list


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(list_id: str, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    db.delete(db_list)
    db.commit()


# Column endpoints
@router.get("/{list_id}/columns", response_model=list[ColumnResponse])
def get_columns(list_id: str, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    return db_list.columns


@router.post("/{list_id}/columns", response_model=ColumnResponse, status_code=status.HTTP_201_CREATED)
def create_column(list_id: str, data: ColumnCreate, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    # Get next position
    max_pos = db.query(Column).filter(Column.list_id == list_id).count()
    
    column = Column(
        list_id=list_id,
        name=data.name,
        column_type=data.column_type.value,
        position=max_pos,
        is_required=data.is_required,
        config=data.config
    )
    db.add(column)
    db.commit()
    db.refresh(column)
    return column


@router.put("/{list_id}/columns/reorder", response_model=list[ColumnResponse])
def reorder_columns(list_id: str, data: ColumnReorder, db: Session = Depends(get_db)):
    """Reorder columns by providing the new order of column IDs."""
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    # Update positions based on the order in column_ids
    for position, col_id in enumerate(data.column_ids):
        column = db.query(Column).filter(Column.id == col_id, Column.list_id == list_id).first()
        if column:
            column.position = position
    
    db.commit()
    
    # Return updated columns in new order
    return db.query(Column).filter(Column.list_id == list_id).order_by(Column.position).all()


@router.put("/{list_id}/columns/{column_id}", response_model=ColumnResponse)
def update_column(list_id: str, column_id: str, data: ColumnUpdate, db: Session = Depends(get_db)):
    column = db.query(Column).filter(Column.id == column_id, Column.list_id == list_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(column, key, value)
    
    db.commit()
    db.refresh(column)
    return column


@router.delete("/{list_id}/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(list_id: str, column_id: str, db: Session = Depends(get_db)):
    column = db.query(Column).filter(Column.id == column_id, Column.list_id == list_id).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    
    db.delete(column)
    db.commit()
