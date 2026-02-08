import os
import sys
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pathlib import Path
import json
import sqlite3
from datetime import datetime

from app.database import SessionLocal, get_db
from app.models import List, Column, Item, ItemValue, View
from app.config import DATA_DIR
from app.schemas import ItemResponse

router = APIRouter(prefix="/api/system", tags=["system"])


def get_base_dir() -> Path:
    """Get the base directory for config file."""
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).parent.parent.parent.parent


CONFIG_PATH = get_base_dir() / "config.json"
DB_PATH = DATA_DIR / "listabob.db"


def get_config():
    """Read config file."""
    if not CONFIG_PATH.exists():
        return {}
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


def save_config(config: dict):
    """Save config file."""
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


class StatsResponse(BaseModel):
    total_lists: int
    total_items: int
    total_columns: int
    total_views: int
    total_values: int
    database_size_mb: float


class ConfigResponse(BaseModel):
    backup_path: str | None = None
    use_tristate_sort: bool = True
    unknown_sort_position: str = "bottom"
    confirm_delete: bool = False


class UpdateConfigRequest(BaseModel):
    backup_path: str | None = None
    use_tristate_sort: bool | None = None
    unknown_sort_position: str | None = None
    confirm_delete: bool | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class BackupRequest(BaseModel):
    backup_path: str


class BackupResponse(BaseModel):
    success: bool
    message: str
    backup_file: str | None = None


@router.get("/config", response_model=ConfigResponse)
def get_system_config():
    """Get system configuration (non-sensitive fields only)."""
    config = get_config()
    return ConfigResponse(
        backup_path=config.get("backup_path"),
        use_tristate_sort=config.get("use_tristate_sort", True),
        unknown_sort_position=config.get("unknown_sort_position", "bottom"),
        confirm_delete=config.get("confirm_delete", False)
    )


@router.put("/config")
def update_system_config(request: UpdateConfigRequest):
    """Update system configuration."""
    config = get_config()
    
    if request.backup_path is not None:
        config["backup_path"] = request.backup_path
    
    if request.use_tristate_sort is not None:
        config["use_tristate_sort"] = request.use_tristate_sort
    
    if request.unknown_sort_position is not None:
        if request.unknown_sort_position not in ("top", "bottom"):
            raise HTTPException(status_code=400, detail="unknown_sort_position must be 'top' or 'bottom'")
        config["unknown_sort_position"] = request.unknown_sort_position
    
    if request.confirm_delete is not None:
        config["confirm_delete"] = request.confirm_delete
    
    save_config(config)
    return {"success": True}


@router.get("/stats", response_model=StatsResponse)
def get_stats():
    """Get database statistics."""
    db = SessionLocal()
    try:
        total_lists = db.query(List).count()
        total_items = db.query(Item).count()
        total_columns = db.query(Column).count()
        total_views = db.query(View).count()
        total_values = db.query(ItemValue).count()
        
        # Get database file size
        db_size_bytes = DB_PATH.stat().st_size if DB_PATH.exists() else 0
        db_size_mb = round(db_size_bytes / (1024 * 1024), 2)
        
        return StatsResponse(
            total_lists=total_lists,
            total_items=total_items,
            total_columns=total_columns,
            total_views=total_views,
            total_values=total_values,
            database_size_mb=db_size_mb
        )
    finally:
        db.close()


@router.post("/change-password")
def change_password(request: ChangePasswordRequest):
    """Change the system password."""
    if not CONFIG_PATH.exists():
        raise HTTPException(status_code=500, detail="Config file not found")
    
    config = get_config()
    
    # Verify current password
    if config.get("password") != request.current_password:
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Update password and revoke timestamp to invalidate all sessions
    config["password"] = request.new_password
    config["revoke_timestamp"] = datetime.utcnow().isoformat()
    
    save_config(config)
    
    return {"success": True, "message": "Password changed successfully. Please log in again."}


@router.post("/backup", response_model=BackupResponse)
def backup_database(request: BackupRequest):
    """Backup the database to the specified path."""
    backup_dir = Path(request.backup_path)
    
    # Save the backup path to config
    config = get_config()
    config["backup_path"] = request.backup_path
    save_config(config)
    
    # Validate backup path
    if not backup_dir.exists():
        try:
            backup_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot create backup directory: {str(e)}")
    
    if not backup_dir.is_dir():
        raise HTTPException(status_code=400, detail="Backup path must be a directory")
    
    # Create backup filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"listabob_backup_{timestamp}.db"
    backup_file_path = backup_dir / backup_filename
    
    try:
        # Use SQLite's safe backup API
        source_conn = sqlite3.connect(str(DB_PATH))
        dest_conn = sqlite3.connect(str(backup_file_path))
        source_conn.backup(dest_conn)
        dest_conn.close()
        source_conn.close()
        
        return BackupResponse(
            success=True,
            message=f"Database backed up successfully",
            backup_file=str(backup_file_path)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


# --- Recycle Bin Endpoints ---

class RecycleBinItemResponse(BaseModel):
    id: str
    list_id: str
    list_name: str
    list_icon: str | None = None
    list_color: str | None = None
    position: int | None
    values: dict
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime

    class Config:
        from_attributes = True


@router.get("/recycle-bin", response_model=list[RecycleBinItemResponse])
def get_recycle_bin(db: Session = Depends(get_db)):
    """Get all soft-deleted items across all lists."""
    deleted_items = (
        db.query(Item)
        .filter(Item.deleted_at.isnot(None))
        .order_by(Item.deleted_at.desc())
        .all()
    )
    
    results = []
    # Cache list info to avoid repeated queries
    list_cache: dict[str, List] = {}
    for item in deleted_items:
        if item.list_id not in list_cache:
            db_list = db.query(List).filter(List.id == item.list_id).first()
            if db_list:
                list_cache[item.list_id] = db_list
        
        db_list = list_cache.get(item.list_id)
        if not db_list:
            continue
        
        # Build values dict
        from app.api.items import extract_value
        column_types = {col.id: col.column_type for col in db_list.columns}
        values = {}
        item_values = db.query(ItemValue).filter(ItemValue.item_id == item.id).all()
        for iv in item_values:
            col_type = column_types.get(iv.column_id, "text")
            values[iv.column_id] = extract_value(iv, col_type)
        
        results.append(RecycleBinItemResponse(
            id=item.id,
            list_id=item.list_id,
            list_name=db_list.name,
            list_icon=db_list.icon,
            list_color=db_list.color,
            position=item.position,
            values=values,
            created_at=item.created_at,
            updated_at=item.updated_at,
            deleted_at=item.deleted_at,
        ))
    
    return results


@router.post("/recycle-bin/{item_id}/restore", response_model=ItemResponse)
def restore_from_recycle_bin(item_id: str, db: Session = Depends(get_db)):
    """Restore a soft-deleted item from the recycle bin."""
    item = db.query(Item).filter(Item.id == item_id, Item.deleted_at.isnot(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Deleted item not found")
    
    db_list = db.query(List).filter(List.id == item.list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="Parent list no longer exists")
    
    # Use bulk update to only clear deleted_at without touching updated_at
    db.query(Item).filter(Item.id == item_id).update(
        {"deleted_at": None}, synchronize_session="fetch"
    )
    db.commit()
    
    from app.api.items import item_to_response
    item = db.query(Item).filter(Item.id == item_id).first()
    return item_to_response(item, db_list.columns, db)


@router.delete("/recycle-bin/{item_id}", status_code=204)
def permanent_delete_from_recycle_bin(item_id: str, db: Session = Depends(get_db)):
    """Permanently delete an item from the recycle bin."""
    item = db.query(Item).filter(Item.id == item_id, Item.deleted_at.isnot(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Deleted item not found")
    
    db.delete(item)
    db.commit()
