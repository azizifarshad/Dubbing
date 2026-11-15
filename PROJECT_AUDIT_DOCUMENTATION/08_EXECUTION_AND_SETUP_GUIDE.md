# 08 - Execution, Build & Setup Guide

## Overview

This guide provides verified, step-by-step instructions for installing, configuring, running, building, testing, and debugging **Dubbing Vidans**.

All commands in this guide are strictly verified against the actual `package.json`, scripts, and project configuration.

---

## 1. System Prerequisites

### Minimum System Requirements
- **Operating System**: Microsoft Windows 10 / 11 (64-bit x64 recommended). Also compatible with Ubuntu 22.04+ / macOS 13+ for server and development mode.
- **Node.js**: v18.0.0 or higher (Node.js 22 LTS recommended).
- **Python**: v3.11 or v3.12 (64-bit).
- **FFmpeg**: v6.0 or higher (Must include `ffmpeg` and `ffprobe`).
- **Memory (RAM)**: Minimum 8 GB (16 GB recommended for Whisper base model inference).
- **Storage**: Minimum 2 GB free disk space.

### Optional Build Tools (Only for Compiling Installers & Launchers)
- **.NET Framework 4.0+ SDK** (Includes `csc.exe` for compiling `launcher.cs`).
- **Inno Setup 6.x** (Includes `ISCC.exe` for compiling `Dubbing-Vidans-Setup.exe`).

---

## 2. Initial Installation & Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/azizifarshad/Dubbing.git
cd Dubbing
```

### Step 2: Install Node.js Dependencies
```bash
npm ci
```
*(Or use `npm install` if working on dependency modifications).*

### Step 3: Set Up Python Environment
Create and activate a Python virtual environment, then install runtime libraries:
```powershell
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install faster-whisper cryptography soundfile numpy
```
*(On Linux/macOS: `source venv/bin/activate`).*

### Step 4: Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
Open `.env` in an editor and configure your AI endpoints:
```env
# Optional Hormouz AI / OpenAI Provider Configuration
API_BASE_URL=https://api.hormouz.net/v1
HORMOUZ_API_KEY=your_hormouz_api_key_here
TRANSLATION_MODEL=openai/gpt-6-luna
TTS_MODEL=google/gemini-3.8-flash-lite-tts

# Optional Direct Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Server Port
PORT=3000
```
> [!NOTE]
> If all API keys are left blank, Dubbing Vidans operates in **100% Offline Mode**, utilizing local Faster-Whisper for transcription, local technical dictionaries for translation, and procedural Web Audio for preview synthesis.

---

## 3. Running the Application

### Option A: Development Mode (Hot Reloading)
Runs Vite with live TypeScript watch mode on `server.ts`:
```bash
npm run dev
```
Open your browser to: `http://localhost:3000`

---

### Option B: Production Desktop Mode (Native Windows Launcher)
To run Dubbing Vidans as a native, borderless desktop application without command prompt windows:
```powershell
# Double-click or run from PowerShell:
.\DubbingVidans.exe
```
This binary (`launcher.cs`):
1. Verifies local Node.js availability.
2. Injects `runtime\ffmpeg` and `runtime\python` into PATH.
3. Starts `server.cjs` as a silent background process.
4. Opens Microsoft Edge or Google Chrome in dedicated app mode (`--app=http://localhost:3000`).
5. Automatically kills the background server when you close the window.

---

### Option C: Windows Batch Launcher
Double-click `Start-DubbingVidans.bat` in Windows File Explorer or execute from PowerShell:
```powershell
.\Start-DubbingVidans.bat
```

---

### Option D: Cross-Platform Unix/Linux/macOS Launcher
```bash
chmod +x start-dubbing.sh
./start-dubbing.sh
```

---

## 4. Running the Automated Test Suite

### 4.1 Run Fast CI Test Suite (8 Suites - Zero API Keys Required)
Executes all unit tests, cryptographic licensing checks, auto-update signature verification, candidate scoring formulas, and timeline auto-fix algorithms:
```bash
npm run test:ci
```
Expected output:
```text
All 10/10 Audio-Video Sync Engine tests passed!
All 18/18 Balanced Dubbing tests passed!
All 15/15 Overlap & Bulk Speed tests passed!
All 19/19 AutoFix Timeline tests passed!
All 8/8 Zero-Silence & Flexible Placement tests passed!
All 8/8 Hormouz JSON Extractor tests passed!
All 6/6 Offline Licensing tests passed!
All 8/8 Auto-Update Subsystem tests passed!
```

### 4.2 Run Integration Test Suite (Real FFmpeg & Offline Subsystems)
Tests real FFmpeg video branding, intro concatenation, and local Faster-Whisper execution:
```bash
npm run test:integration
```

### 4.3 Run Complete Test Suite
```bash
npm test
```

### 4.4 Run TypeScript Static Type Checking & Linting
```bash
npm run lint
```

---

## 5. Building for Production

### Step 1: Compile Frontend & Server Bundle
```bash
npm run build
```
This executes:
1. `vite build`: Compiles and minifies React 19 app into `dist/`.
2. `npm run build:server`: Uses `esbuild` to bundle `server.ts` into a standalone CommonJS binary `server.cjs` targeting Node 18+.

---

### Step 2: Compile Native C# Windows Launcher
Compile `launcher.cs` into `DubbingVidans.exe` with the custom icon:
```powershell
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /win32icon:assets\Vidans.ico /out:DubbingVidans.exe launcher.cs
```

---

### Step 3: Compile Standalone Windows Installer (Inno Setup)
Compiles the complete single-file installer `Dubbing-Vidans-Setup.exe` (~348 MB LZMA2 compressed):
```powershell
$iscc = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
& $iscc "/DMyAppVersion=1.0.1" "installer\DubbingVidans_Setup.iss"
```
The compiled installer is generated in `dist-installer\Dubbing-Vidans-Setup.exe`.

---

### Step 4: Digitally Sign Release Package
Sign the compiled installer using the Ed25519 update signing key:
```powershell
python tools\update-signer\sign_release.py "dist-installer\Dubbing-Vidans-Setup.exe" "1.0.1" "stable" "dist-installer"
```
This outputs:
- `dist-installer\update-manifest.json` (Signed JSON manifest)
- `dist-installer\sha256sums.txt` (SHA-256 checksums)

---

## 6. Offline License Generation Workflow

To issue permanent offline licenses for customers:

### Step 1: Customer Generates Request
1. The customer opens Dubbing Vidans on their machine.
2. In the header bar, clicks **فعال‌سازی لایسنس** (Activate License).
3. Clicks **دریافت فایل درخواست فعال‌سازی (.vidansreq)**.
4. Sends the exported `.vidansreq` file to the software owner.

### Step 2: Software Owner Issues License
1. Run the graphical license generator:
   ```powershell
   python tools\license-generator\license_generator_gui.py
   # Or run the compiled standalone executable:
   .\tools\license-generator\dist\LicenseGenerator.exe
   ```
2. Click **انتخاب و باز کردن فایل درخواست (.vidansreq)** and select the customer's request file.
3. Enter the **Customer Name** (نام مشتری).
4. Select license type (**Permanent Active**) and enabled features.
5. Click **تولید و ذخیره لایسنس دائمی (.vidanslic)**.
6. Send the generated `.vidanslic` file back to the customer.

### Step 3: Customer Installs License
1. In Dubbing Vidans, open the License Modal and switch to the **وارد کردن فایل لایسنس** (Import License) tab.
2. Select the `.vidanslic` file.
3. The license is automatically verified against `MASTER_AUTHORITY_PUBLIC_KEY_PEM`, bound to the customer's hardware fingerprint, and installed machine-wide into `C:\ProgramData\DubbingVidans\license.vidanslic`.
4. All studio export features are permanently unlocked.

---

## 7. Running the Update Proxy Server

To host your own private update server:
```bash
cd update-server
npm install
npm start
```
By default, the update server binds to `http://localhost:4000`. Refer to `update-server/README.md` for Docker deployment instructions.

---

## 8. Common Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `Cannot find module 'express'` | Dependencies not installed | Run `npm ci` in project root. |
| `FFmpeg not found in PATH` | FFmpeg missing from system PATH | Ensure FFmpeg is installed or placed in `runtime\ffmpeg\ffmpeg.exe`. |
| `License Status: invalid_signature` | Modified or forged `.vidanslic` file | Re-generate license with genuine `owner_private_key.pem`. |
| `License Status: fingerprint_mismatch` | License copied to a different physical PC | Issue a new license for the new PC's `.vidansreq`. |
| `Rate limit exceeded (429)` on Gemini | Free API quota exhausted | The server automatically retries with backoff. For heavy usage, configure a paid tier key in `ApiKeyModal`. |
| Port 3000 already in use | Another instance is running | Kill existing Node.js instances: `taskkill /F /IM node.exe`. |
