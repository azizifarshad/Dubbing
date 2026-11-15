# 03 - Deleted Files, Code & Sanitization Log

## Overview

This document records the exact paths, sizes, and justifications for all files, directories, and code removed during the cleanup of **Dubbing Vidans**.

---

## 1. Inventory of Deleted Files & Directories

| Item Path | Original Size | Category | Justification & Verification Before Deletion |
| :--- | :--- | :--- | :--- |
| `Sadra\2-ابزار صدور لایسنس\keys\owner_private_key.pem` | 122 B | Security Sanitization | **Critical security leak prevention**. Unencrypted software owner private key removed from customer delivery staging folder. Verified that the primary master key is safely preserved in `tools/license-generator/keys/owner_private_key.pem`. |
| `Dubb\` (entire directory) | ~28.5 KB (32 items) | Repository Hygiene | Accidental nested Git clone of remote `Dubb.git`. Verified it was untracked, contained zero project code, and was not a Git submodule. |
| `Dubbing-Vidans-Setup.exe` (Root) | 365,010,931 B | Storage Optimization | Older installer build (11/9/2026). Verified that the official release build for v1.0.1 is in `dist-installer/Dubbing-Vidans-Setup.exe` (365,038,648 B). Reclaimed 365 MB in root. |
| `build\` (entire directory) | 51,993,423 B (16 files) | Cache / Dead Build | Old PyInstaller intermediate build tree for Whisper engine. Verified it was git-ignored and not used by current runtime. Reclaimed 52 MB. |
| `public\assets\` (entire directory) | ~10.98 MB (5 files) | Asset Deduplication | Verbatim copy of `assets/` media. Verified that frontend source code has zero references to `/assets/` and that `mux_video.py` looks strictly in `assets/`. Reclaimed ~11 MB from repository and prevents Vite from copying 11 MB into `dist/assets/`. |
| `assets\Logo-Vidans .png` | 43,856 B | File Hygiene | Malformed filename containing an accidental trailing space before `.png`. Verified it is an exact SHA-256 duplicate of `assets/Logo-Vidans.png`. |
| `assets\Final  (1).mp4` | 5,456,710 B | Asset Deduplication | Malformed filename containing spaces and parentheses. Verified it is an exact SHA-256 duplicate of `assets/intro.mp4`. Reclaimed 5.45 MB. |
| `assets\logos\Logo-Vidans - Copy.png` | 12,441 B | Asset Hygiene | Redundant draft image copy in logo folder. |
| `assets\logos\Logo-Vidans Reverse copy.png` | 92,547 B | Asset Hygiene | Redundant draft image copy in logo folder. |
| `dist-server\` | 0 B | Directory Cleanup | Empty placeholder directory. Verified zero references in build scripts. |
| `src-launcher\` | 0 B | Directory Cleanup | Empty placeholder directory. Verified zero references in build scripts. |

---

## 2. Updated Files

| File Path | Action | Description |
| :--- | :--- | :--- |
| `Sadra\1-نصاب اصلی نرم افزار\Dubbing-Vidans-Setup.exe` | **Updated / Upgraded** | Replaced the older 11/9/2026 installer build with the official, signed v1.0.1 installer build from `dist-installer/Dubbing-Vidans-Setup.exe` (365,038,648 B). |

---

## 3. Storage Savings Summary

- **Total Local Disk Space Reclaimed**: **~433.5 MB**
  - Root installer: 365 MB
  - PyInstaller build cache: 52 MB
  - Redundant media assets: 16.5 MB
- **Git Repository Working Tree Cleaned**: Eliminated accidental nested Git repository and duplicate committed binary assets.
