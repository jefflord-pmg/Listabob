"""
Listabob - Standalone Application Entry Point
This is used when building the executable with PyInstaller.
"""
import os
import sys
import webbrowser
import threading
import time
import json
from pathlib import Path

# Determine if running as exe or script
if getattr(sys, 'frozen', False):
    # Running as compiled exe
    BASE_DIR = Path(sys.executable).parent
    os.environ['LISTABOB_DATA_DIR'] = str(BASE_DIR / 'data')
else:
    # Running as script
    BASE_DIR = Path(__file__).parent
    os.environ['LISTABOB_DATA_DIR'] = str(BASE_DIR / 'data')

# Ensure data directory exists
data_dir = Path(os.environ['LISTABOB_DATA_DIR'])
data_dir.mkdir(exist_ok=True)

# Create default config if it doesn't exist
config_path = BASE_DIR / 'config.json'
default_config = {
    "password": "listabob",
    "revoke_timestamp": "2026-01-01T00:00:00Z",
    "backup_path": "",
    "port": 8000
}

if not config_path.exists():
    with open(config_path, 'w') as f:
        json.dump(default_config, f, indent=2)
    print(f"Created default config at {config_path}")
    print("Default password is: listabob")

# Load config
with open(config_path, 'r') as f:
    config = json.load(f)

# Get port from config (default 8000)
PORT = config.get('port', 8000)


def open_browser():
    """Open browser after a short delay to let server start."""
    time.sleep(2)
    webbrowser.open(f'http://localhost:{PORT}')


def main():
    import uvicorn
    
    print("=" * 50)
    print("  Listabob - List Management Application")
    print("=" * 50)
    print(f"Data directory: {os.environ['LISTABOB_DATA_DIR']}")
    print(f"Config file: {config_path}")
    print()
    print(f"Starting server at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    print("=" * 50)
    
    # Open browser in background thread
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=PORT,
        log_level="info",
        reload=False
    )


if __name__ == "__main__":
    main()
