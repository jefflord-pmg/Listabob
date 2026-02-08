import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import engine, Base
from app.api import lists, items, views, templates, imports, exports, auth, system
from app.migrations import run_migrations

# Run lightweight migrations for existing databases (before create_all for new ones)
run_migrations()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    description="A smart information-tracking app for managing lists and structured data",
    version="1.0.0"
)

# Configure CORS for frontend (development mode)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(lists.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(views.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(system.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


# Serve static frontend files in production/standalone mode
# Check for static files directory
if getattr(sys, 'frozen', False):
    # Running as exe - PyInstaller puts data in _MEIPASS or _internal
    if hasattr(sys, '_MEIPASS'):
        static_dir = Path(sys._MEIPASS) / 'static'
    else:
        static_dir = Path(sys.executable).parent / '_internal' / 'static'
else:
    # Running as script - check for built frontend
    static_dir = Path(__file__).parent.parent.parent / 'frontend' / 'dist'

print(f"Looking for static files at: {static_dir}")
print(f"Static dir exists: {static_dir.exists()}")

if static_dir.exists():
    # Mount static assets
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")
    
    # Serve index.html for all non-API routes (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Check if it's a static file
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # Otherwise serve index.html for SPA routing
        return FileResponse(static_dir / "index.html")
else:
    @app.get("/")
    def root():
        return {"message": f"Welcome to {settings.app_name} API", "docs": "/docs"}
