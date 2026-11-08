# Setup script for Dubbing Vidans
# Configures shared directories and creates desktop shortcuts.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "نصب و پیکربندی ویدانس (Dubbing Vidans)"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "             نصب و راه‌اندازی آفلاین ویدانس (Dubbing Vidans)" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$AppRoot = $PSScriptRoot
if (-not $AppRoot) { $AppRoot = Get-Location }

# 1. Setup ProgramData shared directory
$ProgramDataPath = "$env:ProgramData\DubbingVidans"
Write-Host "[1/4] ایجاد و تنظیم دسترسی دایرکتوری اشتراکی چندکاربره: $ProgramDataPath" -ForegroundColor Yellow

if (-not (Test-Path $ProgramDataPath)) {
    New-Item -ItemType Directory -Force -Path $ProgramDataPath | Out-Null
}

$ModelsPath = Join-Path $ProgramDataPath "models"
if (-not (Test-Path $ModelsPath)) {
    New-Item -ItemType Directory -Force -Path $ModelsPath | Out-Null
}

# Grant modify permissions on ProgramData folder so all users can write license files
try {
    $Acl = Get-Acl $ProgramDataPath
    $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("BUILTIN\Users", "Modify, Synchronize", "ContainerInherit, ObjectInherit", "None", "Allow")
    $Acl.AddAccessRule($AccessRule)
    Set-Acl $ProgramDataPath $Acl
    Write-Host "  -> دسترسی همگانی کاربران ویندوز (BUILTIN\Users) با موفقیت تنظیم شد." -ForegroundColor Green
} catch {
    Write-Host "  -> توجه: تنظیم ACL نیازمند دسترسی مدیر سیستم است. دسترسی پیش‌فرض اعمال شد." -ForegroundColor DarkGray
}

# 2. Check Node.js and Python prerequisites
Write-Host "[2/4] بررسی پیش‌نیازهای سیستمی (Node.js و Python)..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd -and (Test-Path "C:\Program Files\nodejs\node.exe")) {
    $nodeCmd = [PSCustomObject]@{ Source = "C:\Program Files\nodejs\node.exe" }
}

if ($nodeCmd) {
    Write-Host "  -> Node.js یافت شد: $($nodeCmd.Source)" -ForegroundColor Green
} else {
    Write-Host "  -> مفسر Node.js یافت نشد. در حال نصب خودکار از طریق winget..." -ForegroundColor Cyan
    try {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        if (Test-Path "C:\Program Files\nodejs\node.exe") {
            Write-Host "  -> Node.js با موفقیت به صورت خودکار نصب شد." -ForegroundColor Green
        }
    } catch {
        Write-Host "  -> نصب خودکار نیازمند دسترسی اینترنت است." -ForegroundColor DarkYellow
    }
}

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCmd) {
    Write-Host "  -> Python یافت شد: $($pythonCmd.Source)" -ForegroundColor Green
} else {
    Write-Host "  -> [هشدار] مفسر Python در PATH یافت نشد." -ForegroundColor DarkYellow
}

# 3. Create Desktop shortcut
Write-Host "[3/4] ایجاد میان‌بر در دسکتاپ (Desktop Shortcut)..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path $DesktopPath "Dubbing Vidans.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = Join-Path $AppRoot "Start-DubbingVidans.bat"
    $Shortcut.WorkingDirectory = $AppRoot
    $IconPath = Join-Path $AppRoot "public\Vidans.ico"
    if (Test-Path $IconPath) {
        $Shortcut.IconLocation = "$IconPath, 0"
    }
    $Shortcut.Description = "نرم‌افزار جامع و آفلاین دوبله هوشمند ویدیو Vidans با لایسنس دائمی"
    $Shortcut.Save()
    Write-Host "  -> میان‌بر دسکتاپ با موفقیت در مسیر زیر ایجاد شد:" -ForegroundColor Green
    Write-Host "     $ShortcutPath" -ForegroundColor Cyan
} catch {
    Write-Host "  -> ایجاد میان‌بر با خطا مواجه شد: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Finish
Write-Host "[4/4] نصب و پیکربندی اولیه با موفقیت پایان یافت." -ForegroundColor Green
Write-Host ""
Write-Host "جهت اجرای برنامه می‌توانید روی فایل Start-DubbingVidans.bat یا آیکون دسکتاپ کلیک کنید." -ForegroundColor White
Write-Host "در صورت عدم فعال‌سازی لایسنس، پس از باز شدن برنامه فایل درخواست (.vidansreq) را ذخیره و برای پشتیبانی ارسال فرمایید." -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Cyan
