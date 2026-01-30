import os
import sys
from pydantic_settings import BaseSettings
from pathlib import Path


def get_data_dir() -> Path:
    """Get the data directory, supporting both dev and standalone modes."""
    # Check for environment variable (set by standalone launcher)
    if 'LISTABOB_DATA_DIR' in os.environ:
        return Path(os.environ['LISTABOB_DATA_DIR'])
    
    # Check if running as frozen exe
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent / 'data'
    
    # Development mode - use backend/data
    return Path(__file__).parent.parent / 'data'


DATA_DIR = get_data_dir()
DATA_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    app_name: str = "Listabob"
    debug: bool = True
    
    # Database - use resolved data directory
    database_url: str = f"sqlite:///{DATA_DIR / 'listabob.db'}"
    
    # File storage
    upload_dir: Path = DATA_DIR / "uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"


settings = Settings()

# Ensure upload directory exists
settings.upload_dir.mkdir(parents=True, exist_ok=True)
