@echo off
setlocal enabledelayedexpansion
REM Build script for Listabob standalone executable

echo ============================================
echo   Listabob Build Script
echo ============================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Run this script from the Listabob root directory
    exit /b 1
)

REM Step 1: Build frontend
echo [1/4] Building frontend...
cd frontend
call npm install
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    cd ..
    exit /b 1
)
cd ..
echo Frontend built successfully!
echo.

REM Step 2: Install PyInstaller if needed
echo [2/4] Checking PyInstaller...
cd backend
call venv\Scripts\activate
pip install pyinstaller
cd ..
echo.

REM Step 3: Build executable
echo [3/4] Building executable...
call backend\venv\Scripts\activate
pyinstaller --clean --noconfirm listabob.spec
if errorlevel 1 (
    echo ERROR: PyInstaller build failed
    exit /b 1
)
echo.

REM Create data directory in output
mkdir dist\Listabob\data 2>nul

REM Step 4: Create compressed archive
echo [4/4] Creating compressed archive...
if exist dist\Listabob.7z del dist\Listabob.7z
"C:\Program Files\7-Zip\7z.exe" a -t7z -mx=9 -m0=lzma2 -md=64m -mfb=64 -ms=on dist\Listabob.7z dist\Listabob
if errorlevel 1 (
    echo WARNING: 7-Zip compression failed. Archive not created.
) else (
    echo Archive created: dist\Listabob.7z
)
echo.

echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo Output: dist\Listabob\
echo Archive: dist\Listabob.7z
echo.
echo To run: dist\Listabob\Listabob.exe
echo.

REM Offer to publish to GitHub
echo.
for /f %%i in ('git rev-parse --short HEAD') do set COMMIT_ID=%%i
for /f %%i in ('powershell -command "Get-Date -Format yyyyMMdd"') do set TODAY=%%i
set RELEASE_TAG=preview-!TODAY!-!COMMIT_ID!
echo.
echo Command to run:
echo   gh release create "!RELEASE_TAG!" dist\Listabob.7z
echo.
set /p CONFIRM="Publish to GitHub? (y/N): "
if /i "!CONFIRM!"=="y" (
    echo Publishing to GitHub...
    gh release create "!RELEASE_TAG!" dist\Listabob.7z
    if errorlevel 1 (
        echo ERROR: GitHub release failed.
    ) else (
        echo Release created: !RELEASE_TAG!
    )
) else (
    echo Skipped.
)
echo.
pause
