@echo off
chcp 65001 >nul
title دوبله ویدانس - Dubbing Vidans
echo =====================================================================
echo                     ویدانس (Dubbing Vidans)
echo             نرم‌افزار جامع و آفلاین دوبله هوشمند ویدیو
echo =====================================================================
echo.

cd /d "%~dp0"

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] محیط Node.js روی سیستم شما یافت نشد.
    echo لطفاً Node.js نسخه 18 یا بالاتر را نصب نمایید.
    pause
    exit /b 1
)

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] مفسر Python در متغیر PATH یافت نشد. برخی قابلیت‌های آفلاین Whisper ممکن است به پایتون نیاز داشته باشند.
)

REM Ensure shared ProgramData directory exists
if not exist "%ProgramData%\DubbingVidans" (
    mkdir "%ProgramData%\DubbingVidans" 2>nul
)

echo [INFO] در حال اجرای سرور محلی و آفلاین Dubbing Vidans...
echo [INFO] آدرس برنامه: http://localhost:3000
echo.

REM Open browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

REM Start server
npx tsx server.ts

pause
