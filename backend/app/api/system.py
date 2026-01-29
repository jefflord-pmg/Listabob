from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import json
import shutil
from datetime import datetime

from app.database import SessionLocal
from app.models import List, Column, Item, ItemValue, View

router = APIRouter(prefix="/api/system", tags=["system"])

CONFIG_PATH = Path(__file__).parent.parent.parent.parent / "config.json"
DATA_DIR = Path(__file__).parent.parent.parent / "data"
DB_PATH = DATA_DIR / "listabob.db"


class StatsResponse(BaseModel):
    total_lists: int
    total_items: int
    total_columns: int
    total_views: int
    total_values: int
    database_size_mb: float


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class BackupRequest(BaseModel):
    backup_path: str


class BackupResponse(BaseModel):
    success: bool
    message: str
    backup_file: str | None = None


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
    
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
    
    # Verify current password
    if config.get("password") != request.current_password:
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Update password and revoke timestamp to invalidate all sessions
    config["password"] = request.new_password
    config["revoke_timestamp"] = datetime.utcnow().isoformat()
    
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)
    
    return {"success": True, "message": "Password changed successfully. Please log in again."}


@router.post("/backup", response_model=BackupResponse)
def backup_database(request: BackupRequest):
    """Backup the database to the specified path."""
    backup_dir = Path(request.backup_path)
    
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
    backup_path = backup_dir / backup_filename
    
    try:
        shutil.copy2(DB_PATH, backup_path)
        return BackupResponse(
            success=True,
            message=f"Database backed up successfully",
            backup_file=str(backup_path)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")
