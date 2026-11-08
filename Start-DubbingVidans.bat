@echo off
chcp 65001 >nul
title دوبله ویدانس - Dubbing Vidans
echo =====================================================================
echo                     ویدانس (Dubbing Vidans)
echo             نرم‌افزار جامع و آفلاین دوبله هوشمند ویدیو
echo =====================================================================
echo.

cd /d "%~dp0"

REM Find Node.js
set "NODE_CMD=node"
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files\nodejs\node.exe"
    ) else if exist "runtime\node.exe" (
        set "NODE_CMD=runtime\node.exe"
    ) else (
        echo [INFO] در حال تلاش برای نصب خودکار Node.js...
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        if exist "C:\Program Files\nodejs\node.exe" (
            set "NODE_CMD=C:\Program Files\nodejs\node.exe"
        ) else (
            echo [ERROR] محیط Node.js روی سیستم شما یافت نشد.
            pause
            exit /b 1
        )
    )
)

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] مفسر Python در متغیر PATH یافت نشد.
)

REM Ensure shared ProgramData directory exists
if not exist "%ProgramData%\DubbingVidans" (
    mkdir "%ProgramData%\DubbingVidans" 2>nul
)

echo [INFO] در حال اجرای سرور محلی و آفلاین Dubbing Vidans...
echo [INFO] آدرس برنامه: http://localhost:3000
echo.

REM Open browser after 1 second
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://localhost:3000"

REM Start server
set "NODE_ENV=production"
set "PORT=3000"

if exist "server.cjs" (
    "%NODE_CMD%" server.cjs
) else if exist "server.js" (
    "%NODE_CMD%" server.js
) else (
    npx tsx server.ts
)

pause
