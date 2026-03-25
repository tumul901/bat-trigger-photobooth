@echo off
title 🚀 Frontend Deployer
color 0B

echo ==========================================
echo    STARTING FRONTEND DEPLOYMENT...
echo ==========================================

:: 1. Navigate to frontend directory
cd /d %~dp0frontend

:: 2. Build the project
echo [INFO] Building frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b %ERRORLEVEL%
)

:: 3. Deploy via SCP
echo [INFO] Transferring dist to remote server...
:: Using the command from your error message
scp -r dist root@69.164.247.115:/var/www/bat-trigger-photobooth/frontend/
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Transfer failed! 
    echo [HINT] Check your connection or SSH keys.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ✅ Deployment successful!
echo ==========================================
pause
