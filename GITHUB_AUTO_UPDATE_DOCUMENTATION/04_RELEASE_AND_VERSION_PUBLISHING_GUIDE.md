# 04. Release and Version Publishing Guide

## 1. Overview

This guide provides a step-by-step walkthrough for building, packaging, and publishing a new release (e.g., version `1.0.2`) on GitHub. Following these exact steps guarantees that all active users running version `1.0.1` will automatically discover, download, and install the new version when they launch the application.

---

## 2. Step 1: Update Version Numbers in Code

Before compiling, synchronize the version string across the application configuration files:

1. **`package.json`**:
   ```json
   {
     "name": "dubbing-vidans",
     "version": "1.0.2",
     ...
   }
   ```
2. **`server.ts`**:
   ```typescript
   const CURRENT_APP_VERSION = '1.0.2';
   ```
3. **`src/utils/updateManager.ts`**:
   ```typescript
   export const CURRENT_APP_VERSION = '1.0.2';
   ```
4. **`installer/DubbingVidans.iss`**:
   ```pascal
   #define MyAppVersion "1.0.2"
   ```

---

## 3. Step 2: Compile the Production Application & Installer

Run the automated build and packaging commands in PowerShell:

```powershell
# 1. Run lint and automated test battery to ensure zero regressions
npm run lint
npm run test

# 2. Compile frontend and backend production bundles
npm run build

# 3. Compile Inno Setup 6 Installer
# (If Inno Setup compiler is installed at standard location)
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "installer\DubbingVidans.iss"
```
The compiled installer will be generated at:
`dist-installer\Dubbing-Vidans-Setup.exe` (approximately 348 MB).

---

## 4. Step 3 (Optional but Recommended): Generate Signed Manifest

To enable cryptographic Ed25519 signature and SHA-256 integrity validation:

```powershell
# Compute SHA-256 of the new installer
$hash = (Get-FileHash -Path "dist-installer\Dubbing-Vidans-Setup.exe" -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item "dist-installer\Dubbing-Vidans-Setup.exe").Length

# Create update-manifest.json
$manifest = @{
    appName = "Dubbing Vidans"
    version = "1.0.2"
    channel = "stable"
    os = "windows"
    arch = "x64"
    sha256 = $hash
    fileSizeBytes = $size
    minSupportedVersion = "1.0.0"
    releaseNotesFa = "به‌روزرسانی خودکار مبتنی بر گیت‌هاب، بهینه‌سازی سرعت و پایداری سیستم."
    releaseNotes = "Direct GitHub auto-update system, performance optimizations, and stability improvements."
} | ConvertTo-Json -Depth 4

$manifest | Out-File -FilePath "dist-installer\update-manifest.json" -Encoding utf8
```

---

## 5. Step 4: Publish Release on GitHub Web UI

1. Open your browser and navigate to:
   **`https://github.com/azizifarshad/Dubbing/releases/new`**
2. **Choose a tag**:
   Type `v1.0.2` and select **"Create new tag: v1.0.2 on publish"** (targeting `main`).
3. **Release title**:
   ```text
   Dubbing Vidans v1.0.2 - استودیو دوبله ویدانس نسخه ۱.۰.۲
   ```
4. **Release Description (Release Notes)**:
   Provide notes in Persian and English:
   ```markdown
   ## تغییرات نسخه جدید (v1.0.2)
   - سیستم بررسی خودکار آپدیت مستقیم از گیت‌هاب بدون نیاز به سرور محلی
   - بهینه‌سازی عملکرد و رفع خطای دکمه خاموش/روشن بررسی خودکار
   - ارتقای کارایی و سرعت اجرای برنامه

   ## What's New in v1.0.2
   - Direct GitHub-based auto-update engine (no local server dependency)
   - Fixed auto-check toggle switch alignment and session dismissal
   - Performance enhancements and build footprint reduction
   ```
5. **Attach Binaries**:
   Drag and drop the following files into the **"Attach binaries by dropping them here or selecting them"** box:
   - `dist-installer\Dubbing-Vidans-Setup.exe` (Mandatory)
   - `dist-installer\update-manifest.json` (Optional)
6. **Release Options**:
   - Ensure **"Set as the latest release"** is checked.
   - Leave **"Set as a pre-release"** unchecked (unless you are intentionally publishing to the Beta channel).
7. Click **"Publish release"**.

---

## 6. Alternative: Publish via GitHub CLI (`gh`)

If you have GitHub CLI installed and authenticated:

```powershell
gh release create v1.0.2 `
  dist-installer\Dubbing-Vidans-Setup.exe `
  dist-installer\update-manifest.json `
  --title "Dubbing Vidans v1.0.2" `
  --notes "Direct GitHub-based auto-update engine and performance enhancements."
```

---

## 7. What Happens on User Machines Immediately After Publishing

1. When any existing user launches Dubbing Vidans (v1.0.1):
   - The application queries `https://api.github.com/repos/azizifarshad/Dubbing/releases`.
   - It discovers release `v1.0.2`.
   - It evaluates `compareSemver("1.0.2", "1.0.1") > 0`.
   - The user is immediately presented with the update modal displaying:
     - New version: **v1.0.2**
     - Current version: **v1.0.1**
     - Release notes in Persian and English.
     - **"به‌روزرسانی اکنون (Update Now)"** button.
     - **"بعداً (Later)"** button.
2. Clicking **"به‌روزرسانی اکنون (Update Now)"** streams `Dubbing-Vidans-Setup.exe` directly from GitHub CDN, verifies the checksum, and triggers the installer.
