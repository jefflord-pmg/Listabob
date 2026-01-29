from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api import lists, items, views, templates, imports, exports

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    description="A smart information-tracking app for managing lists and structured data",
    version="1.0.0"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(lists.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(views.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
app.include_router(exports.router, prefix="/api")


@app.get("/")
def root():
    return {"message": f"Welcome to {settings.app_name} API", "docs": "/docs"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
