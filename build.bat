@echo off
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
echo [1/3] Building frontend...
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
echo [2/3] Checking PyInstaller...
cd backend
call venv\Scripts\activate
pip install pyinstaller
cd ..
echo.

REM Step 3: Build executable
echo [3/3] Building executable...
call backend\venv\Scripts\activate
pyinstaller --clean listabob.spec
if errorlevel 1 (
    echo ERROR: PyInstaller build failed
    exit /b 1
)
echo.

REM Create data directory in output
mkdir dist\Listabob\data 2>nul

echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo Output: dist\Listabob\
echo.
echo To run: dist\Listabob\Listabob.exe
echo.
echo To distribute: Zip the entire dist\Listabob folder
echo.
pause
