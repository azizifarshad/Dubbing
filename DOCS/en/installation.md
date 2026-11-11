# Installation & Deployment Guide

This document provides complete instructions for installing, configuring, and deploying **Dubbing Vidans** across supported desktop environments and development workstations.

---

## 1. Supported Operating Systems & Environments

| Platform | Architecture | Mode | Requirements |
| :--- | :--- | :--- | :--- |
| **Windows 10 / 11 / Server** | `x64` (64-bit) | **Native Desktop & Portable** | .NET Framework 4.5+, 4 GB RAM, 2 GB Disk |
| **macOS 12+** | `x64` / `arm64` | CLI & Web Studio | Node.js 18+, Python 3.10+, FFmpeg |
| **Linux (Ubuntu/Debian)** | `x64` | CLI & Web Studio | Node.js 18+, Python 3.10+, FFmpeg |

---

## 2. End-User Windows Installation (Standard Package)

The recommended production delivery format is the standalone Inno Setup installer package:
`Dubbing-Vidans-Setup.exe`.

### Installation Steps:
1. Download the verified installer `Dubbing-Vidans-Setup.exe` distributed via the authorized update server or direct release.
2. Run `Dubbing-Vidans-Setup.exe` with Administrative privileges (required to configure machine-wide licensing in `C:\ProgramData\DubbingVidans`).
3. Follow the setup wizard:
   - Accept the Proprietary License Agreement (EULA).
   - The default destination directory is `C:\Program Files\Dubbing Vidans`.
   - The installer creates desktop and Start Menu shortcuts.
4. Launch **Dubbing Vidans** from the desktop shortcut or Start Menu.
5. The C# launcher (`DubbingVidans.exe`) starts the local background server on `127.0.0.1:3000` and automatically opens the user's default web browser.

---

## 3. Portable Execution (Zero-Installation Mode)

Dubbing Vidans fully supports portable execution without installation:
1. Extract the portable ZIP bundle to any directory (e.g., `D:\DubbingVidans_Portable`).
2. Run `DubbingVidans.exe` directly from the directory, or execute `Start-DubbingVidans.bat`.
3. Portable execution preserves machine-wide licensing compatibility:
   - Device identity and offline licenses remain securely anchored in `C:\ProgramData\DubbingVidans` (or fallback `.license_data` if running in restricted environments).
   - User settings and temporary work files are kept local to the portable directory.

---

## 4. Developer Workstation Setup (From Source)

### Prerequisites:
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher
- **Python:** v3.10 or higher with `pip`
- **FFmpeg:** Installed and added to system `PATH` (or placed in `runtime/ffmpeg/`)
- **C# Compiler (`csc.exe`):** Included with Windows .NET Framework 4.0/4.5+

### Step-by-Step Setup:
```powershell
# 1. Clone the private repository
git clone https://github.com/azizifarshad/Dubbing.git
cd Dubbing

# 2. Install Node.js dependencies from package-lock.json
npm ci

# 3. Set up Python environment & install required packages
pip install cryptography soundfile numpy faster-whisper

# 4. Copy environment template
cp .env.example .env

# 5. Compile Vite frontend and backend bundle
npm run build

# 6. Run automated test suite
npm run test:ci

# 7. Start development server with live reload
npm run dev
```

---

## 5. Directory Structure Overview

```
Dubbing-Vidans/
├── assets/                 # Icons, splash images, brand assets
├── dist/                   # Compiled Vite production web app
├── dist-installer/         # Output Inno Setup installers and manifests
├── installer/              # Inno Setup compilation scripts and assets
├── models/                 # Offline Faster-Whisper models (optional local)
├── runtime/                # Bundled standalone Python and FFmpeg runtimes
├── src/                    # React 19 + TypeScript frontend application
│   ├── components/         # Studio UI components & dialogs
│   ├── types/              # Dubbing & subtitle domain types
│   └── utils/              # Sync engines, voice synthesis, licensing
├── tests/                  # Unit and integration automated test suites
├── tools/
│   ├── license-generator/  # Owner offline license generator GUI/CLI
│   └── update-signer/      # Dedicated Ed25519 update package signer
├── update-server/          # Standalone secure multi-user update proxy
├── launcher.cs             # Native Windows launcher source
├── server.ts               # Local Express backend API and sync processor
├── server.cjs              # Standalone bundled CommonJS server
└── package.json            # Node.js project manifest & test scripts
```
