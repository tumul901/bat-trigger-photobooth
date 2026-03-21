@echo off
title 🏏 Photobooth Project Launcher
color 0A
echo ==========================================
echo    STARTING PHOTOBOOTH PROJECT...
echo ==========================================
echo.

:: 1. Find the Local IP Address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4 Address" ^| findstr 192') do set "IP=%%a"
set IP=%IP: =%

:: 2. Display the links for the user
echo [INFO] Detected PC IP: %IP%
echo [WAL] TV Wall:     http://localhost:5173/wall
echo [TAB] Tablet:      http://%IP%:5173/capture
echo.
echo 🚀 Launching servers in separate windows...
echo.

:: 3. Start the Backend (FastAPI)
start "🏏 Photobooth Backend (8000)" cmd /k "cd photobooth && python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"

:: 4. Start the Frontend (Vite)
:: Note: --host 0.0.0.0 is needed for tablet access
start "🎨 Photobooth Frontend (5173)" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0"

echo ==========================================
echo          PROJECT IS NOW RUNNING!
echo ==========================================
echo Keep this window open or close it. 
echo Use stop_project.bat to kill all servers.
echo.
pause
