@echo off
title MediXtract Schema Editor
cd /d "%~dp0.."

echo ---------------------------------------------------
echo Starting MediXtract Schema Editor
echo Port: 2512
echo URL: http://localhost:2512
echo ---------------------------------------------------

:: Start the browser with a small delay to ensure the server is ready
:: This prevents the "localhost refused to connect" error on first launch
start /min cmd /c "timeout /t 3 > nul && start http://localhost:2512"

:: Start server from root
npx serve -l 2512 .

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start the server.
    pause
)
