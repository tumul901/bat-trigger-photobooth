@echo off
:: This script is a workaround for the terminal quoting bug where short commands fail or hang.
:: It ensures that commands are executed through a fresh 'cmd /c' with explicit arguments.

if "%~1"=="" (
    echo Usage: terminal_fix.bat ^<command^> [args...]
    echo Example: terminal_fix.bat dir /b
    exit /b 1
)

:: Execute the command with cmd /c and ensure at least one argument exists (even if it's just a space)
cmd /c "%* "
