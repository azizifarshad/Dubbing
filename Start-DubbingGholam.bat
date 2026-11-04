@echo off
chcp 65001 >nul
title دوبله غلام - Dubbing Gholam (Offline Desktop)
echo =====================================================================
echo               دوبله غلام (Dubbing Gholam)
echo           نرم‌افزار جامع و آفلاین دوبله هوشمند ویدیو
echo =====================================================================
echo.

cd /d "%~dp0"

REM Verify Node.js presence
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] محیط Node.js روی سیستم شما یافت نشد.
    echo لطفاً Node.js نسخه 18 یا بالاتر را نصب نمایید.
    pause
    exit /b 1
)

REM Verify Python presence
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] مفسر Python در متغیر PATH یافت نشد. برخی قابلیت‌های آفلاین Whisper ممکن است به پایتون نیاز داشته باشند.
)

REM Ensure machine-wide ProgramData directory exists
if not exist "%ProgramData%\DubbingGholam" (
    mkdir "%ProgramData%\DubbingGholam" 2>nul
)

echo [INFO] در حال اجرای سرور محلی و آفلاین...
echo [INFO] آدرس برنامه: http://localhost:3000
echo.

REM Launch browser in 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

REM Run Node/TSX server
npx tsx server.ts

pause
