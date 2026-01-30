# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Listabob standalone executable.
"""

import os
from pathlib import Path

block_cipher = None

# Paths
backend_dir = Path('backend')
frontend_dist = Path('frontend/dist')

a = Analysis(
    ['backend/run_standalone.py'],
    pathex=[str(backend_dir)],
    binaries=[],
    datas=[
        # Include the app package
        (str(backend_dir / 'app'), 'app'),
        # Include frontend static files
        (str(frontend_dist), 'static'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'app',
        'app.main',
        'app.config',
        'app.database',
        'app.models',
        'app.schemas',
        'app.api',
        'app.api.lists',
        'app.api.items',
        'app.api.views',
        'app.api.templates',
        'app.api.imports',
        'app.api.exports',
        'app.api.auth',
        'app.api.system',
        'sqlalchemy.dialects.sqlite',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Listabob',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Show console window for logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='frontend/public/lb-1.jpg',  # App icon
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Listabob',
)
