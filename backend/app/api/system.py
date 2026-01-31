import os
import sys
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import json
import sqlite3
from datetime import datetime

from app.database import SessionLocal
from app.models import List, Column, Item, ItemValue, View
from app.config import DATA_DIR

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


class UpdateConfigRequest(BaseModel):
    backup_path: str | None = None
    use_tristate_sort: bool | None = None


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
        use_tristate_sort=config.get("use_tristate_sort", True)
    )


@router.put("/config")
def update_system_config(request: UpdateConfigRequest):
    """Update system configuration."""
    config = get_config()
    
    if request.backup_path is not None:
        config["backup_path"] = request.backup_path
    
    if request.use_tristate_sort is not None:
        config["use_tristate_sort"] = request.use_tristate_sort
    
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
