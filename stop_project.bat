@echo off
title 🛑 Stop Photobooth Servers
color 0C
echo ==========================================
echo    STOPPING ALL SERVERS...
echo ==========================================
echo.

echo [KILL] Stopping Python (Backend)...
taskkill /F /IM python.exe /T 2>nul

echo [KILL] Stopping Node (Frontend)...
taskkill /F /IM node.exe /T 2>nul

echo.
echo ==========================================
echo          ALL SERVERS STOPPED.
echo ==========================================
timeout /t 3
