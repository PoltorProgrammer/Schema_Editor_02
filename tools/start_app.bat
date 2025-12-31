@echo off
title MediXtract Schema Editor
cd /d "%~dp0.."

echo ---------------------------------------------------
echo Starting MediXtract Schema Editor
echo Port: 2512
echo URL: http://localhost:2512
echo ---------------------------------------------------

:: Start the browser
start "" "http://localhost:2512"

:: Run discovery and start server from root
npx serve -l 2512 .

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start the server.
    pause
)
