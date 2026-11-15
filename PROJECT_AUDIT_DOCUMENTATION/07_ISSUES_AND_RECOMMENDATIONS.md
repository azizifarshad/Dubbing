# 07 - Issues, Technical Risks & Recommendations

## Overview

During the technical audit and file-by-file inspection of **Dubbing Vidans**, a comprehensive code audit was conducted across security, architectural integrity, build automation, file hygiene, and performance.

Each finding below is classified by severity (**Critical**, **High**, **Medium**, **Low**), clearly distinguishing **Confirmed Problems** from **Potential Architectural Risks**, with actionable recommendations.

---

## 1. Summary of Identified Findings

| ID | Category | Severity | File Path / Area | Status | Issue Title |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Security | **Critical** | `Sadra/2-ابزار صدور لایسنس/keys/owner_private_key.pem` | Confirmed | Software Owner Private Key in Customer Distribution Staging Folder |
| **GIT-01** | Repository | **High** | `Dubb/` | Confirmed | Untracked Nested Git Repository in Project Root |
| **STO-01** | Storage | **Medium** | `Dubbing-Vidans-Setup.exe` (Root & `Sadra/`) | Confirmed | Obsolete 365 MB Installer Binaries Consuming Redundant Disk Space |
| **AST-01** | File Hygiene | **Medium** | `assets/Logo-Vidans .png` & `assets/Final  (1).mp4` | Confirmed | Malformed Asset Filenames (Trailing Spaces, Parentheses) and Duplicates |
| **AST-02** | File Hygiene | **Medium** | `public/assets/` | Confirmed | Redundant Duplication of Media Assets Between `assets/` and `public/assets/` |
| **CFG-01** | Architecture | **Low** | `update-server/src/server.ts` & `DubbingVidans_Setup.iss` | Potential Risk | Hardcoded Repository Owner and Project URLs |
| **DIR-01** | Repository | **Low** | `dist-server/`, `src-launcher/`, `app/applet/` | Confirmed | Abandoned / Empty Placeholder Directories |
| **DEP-01** | Build | **Low** | Project Root | Potential Risk | Absence of a Standardized `requirements.txt` in Root Directory |
| **LCH-01** | Maintenance | **Low** | `launcher.cs:221` | Confirmed | Inconsistent Fallback Reference to Non-Existent `server.js` |

---

## 2. Detailed Technical Audit Findings

---

### Finding SEC-01: Software Owner Private Key Located in Customer Distribution Folder
- **File Path**: `Sadra/2-ابزار صدور لایسنس/keys/owner_private_key.pem`
- **Severity**: **Critical**
- **Type**: Confirmed Security Vulnerability
- **Description**:
  The directory `Sadra/` is organized as an offline delivery folder with Persian instructions (`راهنمای_کامل_نصب_و_فعالسازی.txt`). Inside subfolder `2-ابزار صدور لایسنس/keys/`, the Software Owner's **unencrypted master Ed25519 private key** (`owner_private_key.pem`) is present alongside the public key.
- **Why It Matters**:
  If the `Sadra/` folder is copied to an external flash drive or delivered to a customer or contractor, the customer gains full access to the Software Owner's private signing key. With this key, any party can forge permanent offline licenses for arbitrary machine fingerprints, completely bypassing the licensing system.
- **Recommended Solution**:
  1. Immediately move `owner_private_key.pem` out of `Sadra/` and store it in a secure developer-only vault or keep only in `tools/license-generator/keys/` (which is git-ignored and restricted to the software publisher).
  2. Ensure customer delivery packages contain **only** the `1-نصاب اصلی نرم افزار` folder and documentation.

---

### Finding GIT-01: Untracked Nested Git Repository in Project Root
- **File Path**: `Dubb/`
- **Severity**: **High**
- **Type**: Confirmed Repository Anomaly
- **Description**:
  A directory named `Dubb/` exists in the local project root. It contains its own `.git` directory pointing to remote `https://github.com/azizifarshad/Dubb.git` and `.gitattributes`.
- **Why It Matters**:
  This was created accidentally via `git clone` into the active workspace. It is untracked by the parent repository (`git status` reports `?? Dubb/`). It is not configured as a Git submodule. Running bulk Git commands (like `git add .`) risks committing nested Git references or generating corrupted Git tree objects.
- **Recommended Solution**:
  Safely remove the `Dubb/` folder from the local workspace:
  ```powershell
  Remove-Item -Recurse -Force "C:\Users\Sadra\Desktop\Sadra\Dub\Dubbing\Dubb"
  ```

---

### Finding STO-01: Obsolete 365 MB Installer Binaries Consuming Redundant Disk Space
- **File Path**: `Dubbing-Vidans-Setup.exe` (Root) and `Sadra/1-نصاب اصلی نرم افزار/Dubbing-Vidans-Setup.exe`
- **Severity**: **Medium**
- **Type**: Confirmed Technical Debt / Storage Waste
- **Description**:
  The project root contains `Dubbing-Vidans-Setup.exe` (365,010,931 bytes, dated 11/9/2026), and `Sadra/1-نصاب اصلی نرم افزار/` contains an identical copy. The current official release build for v1.0.1 is located at `dist-installer/Dubbing-Vidans-Setup.exe` (365,038,648 bytes, dated 11/11/2026).
- **Why It Matters**:
  The older 11/9/2026 binaries consume over 730 MB of local disk space and can lead developers or operators to distribute an outdated build lacking the latest fixes in v1.0.1.
- **Recommended Solution**:
  1. Delete `Dubbing-Vidans-Setup.exe` from the project root.
  2. Replace `Sadra/1-نصاب اصلی نرم افزار/Dubbing-Vidans-Setup.exe` with the latest build from `dist-installer/`.

---

### Finding AST-01: Malformed Asset Filenames and Identical Duplicate Media Files
- **File Path**: `assets/Logo-Vidans .png` and `assets/Final  (1).mp4`
- **Severity**: **Medium**
- **Type**: Confirmed Code Hygiene & Portability Defect
- **Description**:
  - `assets/Logo-Vidans .png` has an accidental trailing space before the extension (`Logo-Vidans .png`).
  - `assets/Final  (1).mp4` contains spaces and parentheses, which is an exact duplicate (SHA-256 match) of `assets/intro.mp4`.
  - `assets/Logo-Vidans.png`, `assets/Logo-Vidans .png`, and `assets/logo_watermark.png` are three identical copies of the exact same PNG file.
- **Why It Matters**:
  Filenames with trailing spaces cause major issues on POSIX/Linux systems, Inno Setup scripts, Docker containers, and web servers. In `mux_video.py:31`, fallback logic searches for candidate filenames to compensate for these naming discrepancies:
  ```python
  DEFAULT_INTRO_VIDEO = find_asset(["Final  (1).mp4", "intro.mp4"])
  DEFAULT_LOGO_IMAGE = find_asset(["Logo-Vidans .png", "logo_watermark.png", "Logo-Vidans.png"])
  ```
- **Recommended Solution**:
  1. Standardize on canonical filenames: `intro.mp4` and `logo_watermark.png`.
  2. Remove `assets/Final  (1).mp4`, `assets/Logo-Vidans .png`, and `assets/Logo-Vidans.png`.
  3. Simplify `mux_video.py` to point directly to `intro.mp4` and `logo_watermark.png`.

---

### Finding AST-02: Redundant Media Asset Duplication Between `assets/` and `public/assets/`
- **File Path**: `public/assets/*`
- **Severity**: **Medium**
- **Type**: Confirmed Storage & Repository Redundancy
- **Description**:
  The folder `public/assets/` contains verbatim copies of `Final  (1).mp4` (5.45 MB), `intro.mp4` (5.45 MB), and all three logo variants. During `npm run build`, Vite copies `public/assets/*` into `dist/assets/*`, while Inno Setup packages both `assets/` and `public/` into the installer.
- **Why It Matters**:
  The 5.45 MB intro video is duplicated four times across the filesystem (`assets/`, `public/assets/`, `dist/assets/`, `assets/cache/`), consuming over 20 MB in Git history for a single video clip.
- **Recommended Solution**:
  Serve media assets from a single canonical location (either `public/assets/` or reference via Express static endpoint) and remove the redundant duplicates.

---

### Finding CFG-01: Hardcoded Repository Owner in Update Server and URLs
- **File Path**: `update-server/src/server.ts:10` and `installer/DubbingVidans_Setup.iss:7`
- **Severity**: **Low**
- **Type**: Potential Architectural Risk
- **Description**:
  `update-server/src/server.ts` defaults to:
  ```typescript
  const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'azizifarshad';
  const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'Dubbing';
  ```
  `DubbingVidans_Setup.iss` hardcodes:
  ```iss
  #define MyAppURL "https://github.com/azizifarshad/Dubbing"
  ```
- **Why It Matters**:
  If the repository is transferred to an organization or forked under another GitHub account, the update server and installer metadata will default to the previous URL if environment variables are omitted.
- **Recommended Solution**:
  Enforce mandatory environment variable specification in production deployments and document the parameters in `update-server/README.md`.

---

### Finding DIR-01: Abandoned / Empty Placeholder Directories
- **File Path**: `dist-server/`, `src-launcher/`, `app/applet/`
- **Severity**: **Low**
- **Type**: Confirmed Codebase Clutter
- **Description**:
  - `dist-server/` is completely empty (0 files).
  - `src-launcher/` is completely empty (0 files).
  - `app/applet/` contains only an old `.env.example` file from an early scaffold.
- **Why It Matters**:
  Empty and obsolete directories clutter the project tree and create confusion for new contributors.
- **Recommended Solution**:
  Remove `dist-server/`, `src-launcher/`, and `app/`.

---

### Finding DEP-01: Absence of a Standardized `requirements.txt` in Project Root
- **File Path**: Project Root
- **Severity**: **Low**
- **Type**: Potential Developer Experience Risk
- **Description**:
  While the Python runtime dependencies (`faster-whisper`, `cryptography`, `soundfile`, `numpy`) are installed in the bundled `runtime/python` and listed in CI workflows (`release.yml`, `windows-integration.yml`), there is no top-level `requirements.txt` in the root for Python developers setting up a local virtual environment (`venv`).
- **Why It Matters**:
  Developers setting up the project on a new machine must manually inspect CI workflow files to know which Python packages to install.
- **Recommended Solution**:
  Add a standard `requirements.txt` to the project root:
  ```text
  faster-whisper>=1.0.0
  cryptography>=42.0.0
  soundfile>=0.12.0
  numpy>=1.26.0
  ```

---

### Finding LCH-01: Inconsistent Fallback Reference to Non-Existent `server.js` in Launcher
- **File Path**: `launcher.cs:197`, `launcher.cs:221`, `Start-DubbingVidans.bat:57`
- **Severity**: **Low**
- **Type**: Confirmed Minor Inconsistency
- **Description**:
  In `launcher.cs` and `Start-DubbingVidans.bat`, the launcher checks for `server.cjs`, then falls back to `server.js`:
  ```csharp
  if (File.Exists(serverCjs)) { ... }
  else if (File.Exists(serverJs)) { ... }
  ```
  However, `package.json` script `clean` deletes `server.js`, and `build:server` strictly outputs `server.cjs`. A file named `server.js` is never generated.
- **Why It Matters**:
  Harmless because `server.cjs` exists, but represents dead code/fallback logic.
- **Recommended Solution**:
  Clean up the launcher code to reference `server.cjs` and fallback directly to `server.ts` via `npx tsx`.
