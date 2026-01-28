from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Listabob"
    debug: bool = True
    
    # Database
    database_url: str = "sqlite:///./data/listabob.db"
    
    # File storage
    upload_dir: Path = Path("./data/uploads")
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"


settings = Settings()

# Ensure upload directory exists
settings.upload_dir.mkdir(parents=True, exist_ok=True)
