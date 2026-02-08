"""Lightweight startup migrations for existing SQLite databases."""
import sqlite3
from pathlib import Path
from app.config import DATA_DIR


DB_PATH = DATA_DIR / "listabob.db"

# Each migration: (table, column_name, column_def)
MIGRATIONS = [
    ("items", "deleted_at", "DATETIME DEFAULT NULL"),
]


def run_migrations():
    """Check for missing columns and add them via ALTER TABLE."""
    if not DB_PATH.exists():
        return

    conn = sqlite3.connect(str(DB_PATH))
    try:
        cursor = conn.cursor()
        for table, column, col_def in MIGRATIONS:
            cursor.execute(f"PRAGMA table_info({table})")
            existing_columns = {row[1] for row in cursor.fetchall()}
            if column not in existing_columns:
                print(f"Migration: Adding column '{column}' to table '{table}'")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
        conn.commit()
    finally:
        conn.close()
