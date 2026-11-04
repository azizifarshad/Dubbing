# ==============================================================================
# Dubbing Gholam - Automated Windows Offline Setup & Permissive Environment Script
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "نصب و پیکربندی دوبله غلام (Dubbing Gholam)"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "             نصب و راه‌اندازی آفلاین دوبله غلام" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$AppRoot = $PSScriptRoot
if (-not $AppRoot) { $AppRoot = Get-Location }

# 1. Setup machine-wide ProgramData directory with full permissions for all Windows users
$ProgramDataPath = "$env:ProgramData\DubbingGholam"
Write-Host "[1/4] ایجاد و تنظیم دسترسی دایرکتوری اشتراکی چندکاربره: $ProgramDataPath" -ForegroundColor Yellow

if (-not (Test-Path $ProgramDataPath)) {
    New-Item -ItemType Directory -Force -Path $ProgramDataPath | Out-Null
}

$ModelsPath = Join-Path $ProgramDataPath "models"
if (-not (Test-Path $ModelsPath)) {
    New-Item -ItemType Directory -Force -Path $ModelsPath | Out-Null
}

# Grant modify permissions on C:\ProgramData\DubbingGholam to BUILTIN\Users so standard non-admin accounts can write licenses
try {
    $Acl = Get-Acl $ProgramDataPath
    $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("BUILTIN\Users", "Modify, Synchronize", "ContainerInherit, ObjectInherit", "None", "Allow")
    $Acl.AddAccessRule($AccessRule)
    Set-Acl $ProgramDataPath $Acl
    Write-Host "  -> دسترسی همگانی کاربران ویندوز (BUILTIN\Users) با موفقیت تنظیم شد." -ForegroundColor Green
} catch {
    # Non-fatal if running as standard user and folder was already created by current user
    Write-Host "  -> توجه: تنظیم ACL نیازمند دسترسی مدیر سیستم است. دسترسی پیش‌فرض اعمال شد." -ForegroundColor DarkGray
}

# 2. Check Node.js and Python prerequisites
Write-Host "[2/4] بررسی پیش‌نیازهای سیستمی (Node.js و Python)..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    Write-Host "  -> Node.js یافت شد: $($nodeCmd.Source)" -ForegroundColor Green
} else {
    Write-Host "  -> [هشدار] مفسر Node.js یافت نشد. لطفاً Node.js را نصب کنید." -ForegroundColor Red
}

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCmd) {
    Write-Host "  -> Python یافت شد: $($pythonCmd.Source)" -ForegroundColor Green
} else {
    Write-Host "  -> [هشدار] مفسر Python در PATH یافت نشد." -ForegroundColor DarkYellow
}

# 3. Create Desktop and Start Menu Shortcuts
Write-Host "[3/4] ایجاد میان‌بر در دسکتاپ (Desktop Shortcut)..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path $DesktopPath "دوبله غلام (Dubbing Gholam).lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = Join-Path $AppRoot "Start-DubbingGholam.bat"
    $Shortcut.WorkingDirectory = $AppRoot
    $Shortcut.Description = "نرم‌افزار جامع و آفلاین دوبله هوشمند ویدیو با لایسنس دائمی"
    $Shortcut.Save()
    Write-Host "  -> میان‌بر دسکتاپ با موفقیت در مسیر زیر ایجاد شد:" -ForegroundColor Green
    Write-Host "     $ShortcutPath" -ForegroundColor Cyan
} catch {
    Write-Host "  -> ایجاد میان‌بر با خطا مواجه شد: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Completion
Write-Host "[4/4] نصب و پیکربندی اولیه با موفقیت پایان یافت." -ForegroundColor Green
Write-Host ""
Write-Host "جهت اجرای برنامه می‌توانید روی فایل Start-DubbingGholam.bat یا آیکون دسکتاپ کلیک کنید." -ForegroundColor White
Write-Host "در صورت عدم فعال‌سازی لایسنس، پس از باز شدن برنامه فایل درخواست (.dbreq) را ذخیره و برای پشتیبانی ارسال فرمایید." -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Cyan
