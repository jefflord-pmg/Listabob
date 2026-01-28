from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Template, List, Column, View
from app.schemas import TemplateResponse, ListResponse

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[TemplateResponse])
def get_templates(category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Template)
    if category:
        query = query.filter(Template.category == category)
    return query.all()


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: str, db: Session = Depends(get_db)):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("/{template_id}/create-list", response_model=ListResponse, status_code=status.HTTP_201_CREATED)
def create_list_from_template(
    template_id: str,
    name: str | None = None,
    db: Session = Depends(get_db)
):
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create the list
    db_list = List(
        name=name or template.name,
        description=template.description,
        icon=template.icon,
        template_id=template_id
    )
    db.add(db_list)
    db.flush()
    
    # Create columns from template config
    columns_config = template.columns_config.get("columns", [])
    for i, col_config in enumerate(columns_config):
        column = Column(
            list_id=db_list.id,
            name=col_config.get("name", f"Column {i+1}"),
            column_type=col_config.get("type", "text"),
            position=i,
            is_required=col_config.get("required", False),
            config=col_config.get("config")
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
