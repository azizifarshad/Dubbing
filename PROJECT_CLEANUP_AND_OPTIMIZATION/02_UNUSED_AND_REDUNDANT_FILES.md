# 02 - Unused, Redundant & Duplicate Files Catalog

## Overview

This catalog documents every file, folder, and asset identified as unnecessary, redundant, or duplicate across **Dubbing Vidans**, explaining its original purpose, reason for redundancy, and disposal decision.

---

## 1. Complete Catalog of Identified Candidate Items

| Item Path | Type | Size | Original Purpose | Reason for Redundancy / Risk | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Sadra/2-ابزار صدور لایسنس/keys/owner_private_key.pem` | File (PEM) | 122 B | Private signing key for license generation | **CRITICAL SECURITY RISK**: Exposed in customer distribution folder. The master copy is securely stored in `tools/license-generator/keys/owner_private_key.pem`. | **REMOVED (Securely)** |
| `Dubb/` | Directory | ~28.5 KB (32 items) | Independent Git clone of remote `Dubb.git` | Accidental nested Git clone created in project root. Not part of Dubbing Vidans. Pollutes `git status`. | **REMOVED** |
| `Dubbing-Vidans-Setup.exe` (Root) | File (PE32+) | 365,010,931 B | Old installer build (11/9/2026) | Redundant duplicate of older build. Official v1.0.1 installer is in `dist-installer/`. Consumes 365 MB in root. | **REMOVED** |
| `build/whisper_engine/` | Directory | ~51.99 MB (16 files) | PyInstaller build cache for Whisper executable | Intermediate build artifacts from an earlier compilation experiment. Ignored by Git. | **REMOVED** |
| `public/assets/Final  (1).mp4` | File (MP4) | 5,456,710 B | Intro video clip | Exact duplicate of `assets/intro.mp4`. Copied by Vite into `dist/assets/`, bloating web build. | **REMOVED** |
| `public/assets/intro.mp4` | File (MP4) | 5,456,710 B | Intro video clip | Exact duplicate of `assets/intro.mp4`. Copied by Vite into `dist/assets/`, bloating web build. | **REMOVED** |
| `public/assets/Logo-Vidans .png` | File (PNG) | 43,856 B | Watermark logo (trailing space) | Malformed filename; duplicate of `assets/Logo-Vidans.png`. | **REMOVED** |
| `public/assets/Logo-Vidans.png` | File (PNG) | 43,856 B | Watermark logo | Duplicate of `assets/Logo-Vidans.png`. | **REMOVED** |
| `public/assets/logo_watermark.png` | File (PNG) | 43,856 B | Watermark logo | Duplicate of `assets/Logo-Vidans.png`. | **REMOVED** |
| `assets/Logo-Vidans .png` | File (PNG) | 43,856 B | Watermark logo | Malformed filename (space before `.png`); duplicate of `assets/Logo-Vidans.png`. | **REMOVED** |
| `assets/Final  (1).mp4` | File (MP4) | 5,456,710 B | Intro video clip | Malformed filename (double spaces/parentheses); duplicate of `assets/intro.mp4`. | **REMOVED** |
| `assets/logos/Logo-Vidans - Copy.png` | File (PNG) | 12,441 B | Icon draft | Redundant draft copy in logo design folder. | **REMOVED** |
| `assets/logos/Logo-Vidans Reverse copy.png` | File (PNG) | 92,547 B | Inverted icon draft | Redundant draft copy in logo design folder. | **REMOVED** |
| `dist-server/` | Directory | 0 B | Build output placeholder | Completely empty directory (0 files); server build outputs to root `server.cjs`. | **REMOVED** |
| `src-launcher/` | Directory | 0 B | Launcher placeholder | Completely empty directory (0 files); launcher source is in root `launcher.cs`. | **REMOVED** |

---

## 2. Items Retained & Justification

| Item Path | Type | Reason Retained |
| :--- | :--- | :--- |
| `tools/license-generator/keys/owner_private_key.pem` | File (PEM) | The authentic master software owner Ed25519 private key. Strictly git-ignored and restricted to the software publisher. |
| `tools/update-signer/keys/update_signer_private_key.pem` | File (PEM) | The authentic update-signing private key. Strictly git-ignored and used for signing release packages. |
| `models/faster-whisper-base/` | Directory (141 MB) | Essential for 100% offline speech-to-text inference. |
| `runtime/` | Directory (870 MB) | Essential for self-contained, zero-install portable Windows execution. |
| `assets/cache/intro_normalized_1080p.mp4` | File (1.14 MB) | High-speed pre-rendered intro video cache saving 15-30 seconds per video export. |
| `assets/intro.mp4` & `assets/Logo-Vidans.png` | Files | Canonical media assets referenced by `mux_video.py` and `ExportStudio.tsx`. |
| `.env` | File | Local environment configuration. Preserved without modification. |
