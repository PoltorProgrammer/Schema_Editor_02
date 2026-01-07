@echo off
title MediXtract FACTORY RESET
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo       MediXtract Schema Editor - FACTORY RESET
echo ===================================================
echo.
echo [WARNING] This will DELETE ALL DATA (projects, etc).
echo.

:: Check for PowerShell
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PowerShell is required.
    pause
    exit /b 1
)

:: Run the hard reset script
powershell -ExecutionPolicy Bypass -File "tools\hard_reset.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] The process encountered a problem.
    pause
) else (
    echo.
    echo Done! The program has been completely reset.
    echo.
    pause
)
