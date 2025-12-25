@echo off
title Create Desktop Shortcut
cd /d "%~dp0"

echo Generating Desktop Shortcut...
powershell -ExecutionPolicy Bypass -File "tools\create_shortcut.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to create shortcut.
    pause
) else (
    echo.
    echo Done! You can now use the "Schema Editor" shortcut on your Desktop.
    timeout /t 5
)
