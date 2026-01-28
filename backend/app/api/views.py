from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import List, View
from app.schemas import ViewCreate, ViewUpdate, ViewResponse

router = APIRouter(prefix="/lists/{list_id}/views", tags=["views"])


@router.get("", response_model=list[ViewResponse])
def get_views(list_id: str, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    return db_list.views


@router.post("", response_model=ViewResponse, status_code=status.HTTP_201_CREATED)
def create_view(list_id: str, data: ViewCreate, db: Session = Depends(get_db)):
    db_list = db.query(List).filter(List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    # Get next position
    max_pos = db.query(View).filter(View.list_id == list_id).count()
    
    view = View(
        list_id=list_id,
        name=data.name,
        view_type=data.view_type.value,
        config=data.config,
        position=max_pos
    )
    db.add(view)
    db.commit()
    db.refresh(view)
    return view


@router.put("/{view_id}", response_model=ViewResponse)
def update_view(list_id: str, view_id: str, data: ViewUpdate, db: Session = Depends(get_db)):
    view = db.query(View).filter(View.id == view_id, View.list_id == list_id).first()
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(view, key, value)
    
    db.commit()
    db.refresh(view)
    return view


@router.delete("/{view_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_view(list_id: str, view_id: str, db: Session = Depends(get_db)):
    view = db.query(View).filter(View.id == view_id, View.list_id == list_id).first()
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Don't allow deleting the default view if it's the only one
    if view.is_default:
        view_count = db.query(View).filter(View.list_id == list_id).count()
        if view_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the only view")
    
    db.delete(view)
    db.commit()
