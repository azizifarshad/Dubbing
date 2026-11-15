# 02 - Project Directory Structure: Dubbing Vidans

## Overview

This document provides a comprehensive structural audit of the entire filesystem layout for the **Dubbing Vidans** project located at `C:\Users\Sadra\Desktop\Sadra\Dub\Dubbing`.

---

## Directory Inventory Summary

| Directory | Type | File Count | Size on Disk | Role & Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `.` (Root) | Core | 24 files | ~353.4 MB | Application root, configuration files, launchers, and servers |
| `.git/` | Internal | 187 items | ~75.4 MB | Git repository history, refs, objects, and configuration |
| `.github/` | Tracked | 5 files | ~13.6 KB | GitHub Actions CI/CD workflows and repository governance |
| `app/` | Tracked | 1 file | 111 bytes | Legacy applet configuration scaffold |
| `assets/` | Tracked | 18 files | ~18.5 MB | Brand assets, watermarks, logos, and intro video clips |
| `build/` | Ignored | 16 files | ~52.0 MB | PyInstaller build artifacts for Whisper engine compilation |
| `dist/` | Ignored | 14 files | ~12.7 MB | Vite production build output (HTML, JS, CSS, client assets) |
| `dist-installer/` | Ignored | 3 files | ~348.1 MB | Inno Setup compiled installer and signed update manifests |
| `dist-server/` | Ignored | 0 files | 0 bytes | Output placeholder for server builds |
| `DOCS/` | Tracked | 17 files | ~84.2 KB | Bilingual English/Persian architecture and setup documentation |
| `Dubb/` | Untracked | 32 items | ~28.5 KB | Accidental nested Git clone of remote repository `Dubb.git` |
| `installer/` | Tracked | 4 files | ~164.7 KB | Inno Setup script (`.iss`), license text, and setup wizard images |
| `models/` | Ignored | 4 files | ~141.2 MB | Offline CTranslate2 `faster-whisper-base` model weights |
| `node_modules/` | Ignored | 8,553 files | ~186.5 MB | Node.js runtime and development packages |
| `public/` | Tracked | 11 files | ~12.1 MB | Public static web assets served directly by Vite/Express |
| `runtime/` | Ignored | 7,668 files | ~870.0 MB | Embedded portable Windows runtimes (Python 3.12, FFmpeg, Node) |
| `Sadra/` | Ignored | 11 files | ~858.4 MB | Persian customer distribution and installer bundle |
| `scratch/` | Ignored | 2 files | ~7.2 KB | Temporary integration test scripts for translation endpoints |
| `src/` | Tracked | 38 files | ~670.3 KB | Primary React 19 and TypeScript application source code |
| `src-launcher/` | Tracked | 0 files | 0 bytes | Deprecated launcher source placeholder |
| `tests/` | Tracked | 11 files | ~118.8 KB | Complete TypeScript test suite executed by `tsx` in CI/CD |
| `tools/` | Mixed | 25 files | ~34.5 MB | Offline license generator and release signing utilities |
| `update-server/` | Tracked | 6 files | ~18.5 KB | Standalone Node.js/Express proxy server for software updates |
| `__pycache__/` | Ignored | 1 file | 4.3 KB | Python compiled bytecode cache |
| **Total** | -- | **18,076 items** | **~2.56 GB** | **Complete local workspace footprint** |

---

## Complete Project Directory Tree

```
Dubbing/
├── .env                                  # [Local/Ignored] Active environment configuration (API keys, ports)
├── .env.example                          # [Tracked] Template configuration for Hormouz & Gemini APIs
├── .git/                                 # [Git Database] Local Git repository metadata and object store
├── .gitattributes                        # [Tracked] Git Line Ending (LF/CRLF) and binary definitions
├── .github/                              # [Tracked] GitHub workflows and repository automation
│   ├── CODEOWNERS                        # Code ownership rules
│   ├── dependabot.yml                    # Automated dependency update configuration
│   └── workflows/
│       ├── ci.yml                        # Continuous integration pipeline (Lint, Test, Build)
│       ├── release.yml                   # Release pipeline (ISCC installer compile, sign, release)
│       └── windows-integration.yml       # Windows native integration and launcher compilation
├── .gitignore                            # [Tracked] Git exclusion rules (build dirs, node_modules, keys)
├── app/
│   └── applet/
│       └── .env.example                  # [Tracked] Legacy scaffold environment template
├── assets/                               # [Tracked] Application branding, media, and cached videos
│   ├── Final  (1).mp4                    # Vidans video intro with music/voiceover (5.45 MB)
│   ├── intro.mp4                         # Duplicate copy of Final  (1).mp4 (5.45 MB)
│   ├── Logo-Vidans .png                  # Transparent watermark logo with trailing space (43.8 KB)
│   ├── Logo-Vidans.png                   # Transparent watermark logo (43.8 KB)
│   ├── logo_watermark.png                # Duplicate copy of Logo-Vidans.png (43.8 KB)
│   ├── Vidans.ico                        # Multi-resolution Windows desktop icon (66.9 KB)
│   ├── cache/
│   │   └── intro_normalized_1080p.mp4    # Pre-rendered 1080p 30fps normalized intro for fast muxing
│   └── logos/                            # Brand design variants and marketing graphics
│       ├── Dub Vidans Logo.png           # Graphic brand badge (600.6 KB)
│       ├── Gemini_Generated_Image_...jpg # AI-generated brand artwork (746.3 KB)
│       ├── LOGO DUB.png                  # High-resolution master logo (3.14 MB)
│       ├── logo dubb.png                 # Alternative dub logo variant (1.58 MB)
│       ├── Logo Sadra -black.png         # Sadra brand dark theme logo (106.6 KB)
│       ├── Logo Sadra -white.png         # Sadra brand light theme logo (106.7 KB)
│       ├── LOGO.png                      # Standard brand logo (716.6 KB)
│       ├── Logo-Vidans - Copy.png        # Icon graphic copy (12.4 KB)
│       ├── Logo-Vidans Reverse copy.png  # Inverted color graphic copy (92.5 KB)
│       ├── Logo-Vidans Reverse.png       # Inverted color graphic (37.4 KB)
│       └── Logo-Vidans.png               # Brand icon (43.8 KB)
├── build/                                # [Ignored] PyInstaller compilation build cache
│   └── whisper_engine/                   # PyInstaller artifacts for Whisper executable build
├── CONTRIBUTING.md                       # [Tracked] Developer contribution guidelines
├── dist/                                 # [Ignored] Vite production web bundle output
│   ├── assets/                           # Compiled JS/CSS chunks and media assets
│   │   ├── Final  (1).mp4                # Copied intro video
│   │   ├── index-BCpdCrB5.css            # Compiled Tailwind CSS bundle (99.3 KB)
│   │   ├── index-C92TGM9a.js             # Compiled React application JS bundle (590.2 KB)
│   │   ├── intro.mp4                     # Copied intro video
│   │   ├── Logo-Vidans .png              # Copied logo asset
│   │   ├── Logo-Vidans.png               # Copied logo asset
│   │   └── logo_watermark.png            # Copied logo asset
│   ├── favicon.png                       # Copied favicon
│   ├── header-logo.png                   # Copied header logo
│   ├── index.html                        # Production HTML entry point
│   ├── logo.jpg                          # Copied JPEG logo
│   ├── logo.png                          # Copied PNG logo
│   ├── manifest.json                     # Progressive Web App (PWA) manifest
│   └── Vidans.ico                        # Copied icon file
├── dist-installer/                       # [Ignored] Output of Inno Setup compilation
│   ├── Dubbing-Vidans-Setup.exe          # Production installer package (v1.0.1, 348.1 MB)
│   ├── sha256sums.txt                    # Cryptographic SHA-256 checksums
│   └── update-manifest.json              # Signed Ed25519 update manifest
├── dist-server/                          # [Ignored] Empty placeholder directory
├── DOCS/                                 # [Tracked] Technical and user documentation
│   ├── CUSTOMER_GUIDE.md                 # End-user Persian guide for offline activation & usage
│   ├── LICENSING_ARCHITECTURE.md         # Cryptographic Ed25519 licensing specification
│   ├── OWNER_GUIDE.md                    # Developer guide for license generation & release signing
│   ├── en/                               # English documentation suite
│   │   ├── architecture.md               # Technical architecture & subsystem design
│   │   ├── automatic-updates.md          # Auto-update protocol and security
│   │   ├── ci-cd.md                      # GitHub Actions automation & release pipelines
│   │   ├── configuration.md              # Environment variables and tuning
│   │   ├── installation.md               # Setup and prerequisite installation
│   │   ├── security.md                   # Cryptographic trust model & threat mitigation
│   │   └── troubleshooting.md            # Diagnosing common errors and logs
│   └── fa/                               # Persian documentation suite (راهنمای فارسی)
│       ├── architecture.md               # معماری فنی و طراحی زیرسیستم‌ها
│       ├── automatic-updates.md          # سیستم به‌روزرسانی خودکار و امنیت آن
│       ├── ci-cd.md                      # پایپ‌لاین‌های گیت‌هاب اکشنز و استقرار
│       ├── configuration.md              # متغیرهای محیطی و تنظیمات
│       ├── installation.md               # راهنمای جامع نصب و پیش‌نیازها
│       ├── security.md                   # مدل امنیت و رمزنگاری سیستم
│       └── troubleshooting.md            # عیب‌یابی و رفع اشکالات متداول
├── Dubb/                                 # [Untracked] Accidental nested Git clone of remote Dubb.git
│   ├── .git/                             # Nested git repository metadata
│   └── .gitattributes                    # Line-ending rules for Dubb.git
├── Dubbing-Vidans-Setup.exe              # [Ignored] Pre-compiled standalone installer in root (365.0 MB)
├── DubbingVidans.exe                     # [Tracked] Compiled native C# Windows application launcher (77.3 KB)
├── index.html                            # [Tracked] Main HTML entry point for Vite development & build
├── Install-DubbingVidans.ps1             # [Tracked] PowerShell script for ProgramData setup & desktop shortcuts
├── installer/                            # [Tracked] Inno Setup compilation sources
│   ├── DubbingVidans_Setup.iss           # Master Inno Setup compiler configuration script
│   ├── license.txt                       # Software end-user license agreement shown in wizard
│   ├── wizard_banner.bmp                 # 164x314 banner graphic for installer wizard
│   └── wizard_small.bmp                  # 55x58 small logo graphic for installer header
├── launcher.cs                           # [Tracked] C# source code for native Windows desktop launcher
├── LICENSE                               # [Tracked] Open source / Commercial software license (Vidans Studio)
├── local_whisper.py                      # [Tracked] Standalone Python script for Faster-Whisper local STT
├── metadata.json                         # [Tracked] Studio capability metadata for AI environments
├── models/                               # [Ignored] Bundled offline Whisper speech recognition model
│   └── faster-whisper-base/              # CTranslate2 optimized Whisper base model
│       ├── config.json                   # Model architectural hyper-parameters
│       ├── model.bin                     # CTranslate2 quantized model weights (145.2 MB)
│       ├── tokenizer.json                # Byte-level BPE tokenizer rules (2.3 MB)
│       └── vocabulary.txt                # Subword vocabulary index (511.7 KB)
├── mux_video.py                          # [Tracked] Python automation script for video multiplexing & branding
├── node_modules/                         # [Ignored] Node.js dependencies (8,553 files)
├── package.json                          # [Tracked] NPM project manifest, script commands, and dependencies
├── public/                               # [Tracked] Web assets copied verbatim to build root
│   ├── assets/                           # Media files duplicate of root assets/
│   │   ├── Final  (1).mp4                # Intro video clip (5.45 MB)
│   │   ├── intro.mp4                     # Intro video clip duplicate (5.45 MB)
│   │   ├── Logo-Vidans .png              # Logo watermark with trailing space (43.8 KB)
│   │   ├── Logo-Vidans.png               # Logo watermark (43.8 KB)
│   │   └── logo_watermark.png            # Logo watermark duplicate (43.8 KB)
│   ├── favicon.png                       # Browser tab favicon (695.9 KB)
│   ├── header-logo.png                   # Header navigation brand logo (65.3 KB)
│   ├── logo.jpg                          # Brand artwork JPEG (72.3 KB)
│   ├── logo.png                          # Brand artwork PNG (695.9 KB)
│   ├── manifest.json                     # Web application manifest configuration
│   └── Vidans.ico                        # Studio icon file (66.9 KB)
├── README.fa.md                          # [Tracked] Comprehensive Persian product guide & documentation
├── README.md                             # [Tracked] Comprehensive English product guide & documentation
├── runtime/                              # [Ignored] Portable Windows runtime bundle for offline execution
│   ├── ffmpeg/                           # Static Windows FFmpeg binaries
│   │   ├── ffmpeg.exe                    # FFmpeg video/audio processing engine (227.8 MB)
│   │   └── ffprobe.exe                   # FFprobe media stream analyzer (227.6 MB)
│   ├── node.exe                          # Standalone Node.js 22 executable (93.5 MB)
│   └── python/                           # Standalone embedded Python 3.12 environment (~321 MB)
│       ├── DLLs/                         # Dynamic link libraries (.pyd, .dll)
│       ├── Lib/                          # Python standard library & site-packages (faster-whisper, numpy, etc.)
│       ├── python.exe                    # Python CLI interpreter
│       ├── python314.dll                 # Core Python DLL runtime
│       └── pythonw.exe                   # Windowless Python interpreter
├── Sadra/                                # [Ignored] Customer delivery and deployment package in Persian
│   ├── 1-نصاب اصلی نرم افزار/            # Contains compiled Dubbing-Vidans-Setup.exe (365.0 MB)
│   ├── 2-ابزار صدور لایسنس/              # Contains LicenseGenerator.exe and owner private/public keys
│   ├── 3-پیشنیازها/                      # Standalone installers (Node.js MSI, Python EXE, FFmpeg EXEs)
│   └── راهنمای_کامل_نصب_و_فعالسازی.txt  # Persian step-by-step customer setup manual
├── scratch/                              # [Ignored] Scratch integration tests
│   ├── test_api_translate.cjs            # Test harness for translation endpoint
│   └── test_translation_flow.cjs        # Test harness for end-to-end translation pipeline
├── SECURITY.md                           # [Tracked] Security vulnerability reporting and cryptographic disclosure
├── server.cjs                            # [Tracked] Standalone bundled Express backend compiled via esbuild (3.17 MB)
├── server.ts                             # [Tracked] Primary Express backend server source code (3,686 lines)
├── src/                                  # [Tracked] Primary React frontend source directory
│   ├── App.tsx                           # Master component managing state and workflow stages
│   ├── index.css                         # Global CSS styles, Tailwind directives, and font imports
│   ├── main.tsx                          # React DOM client entry point
│   ├── components/                       # React modular UI components
│   │   ├── AiSyncModal.tsx               # Modal for AI timeline synchronization parameters
│   │   ├── ApiKeyModal.tsx               # Modal for configuring Gemini and Hormouz AI keys
│   │   ├── AutoFixDashboardModal.tsx     # Visual dashboard for 6-stage timeline auto-repair
│   │   ├── BulkSpeedModal.tsx            # Modal for batch tempo adjustments
│   │   ├── ExportStudio.tsx              # Final export tab: audio mixing, intro, watermark muxing
│   │   ├── FileUploaderSection.tsx       # File ingest tab: video, audio, and subtitle upload
│   │   ├── Header.tsx                    # Top navigation bar with stage stepper & status badges
│   │   ├── LicenseModal.tsx              # Customer license modal (request export & license install)
│   │   ├── TimelinePlayer.tsx            # Interactive multi-track timeline visualization & playback
│   │   ├── TranslationStudio.tsx         # Subtitle translation workbench & candidate scoring UI
│   │   ├── UpdateModal.tsx               # Software auto-update checking, downloading, and installation
│   │   └── VoiceSynthesisStudio.tsx      # Voice generation tab: speaker assignment & TTS synthesis
│   ├── types/
│   │   └── dubbing.ts                    # Core TypeScript domain models, interfaces, and defaults
│   └── utils/                            # Core computational, algorithmic, and helper modules
│       ├── audioMixer.ts                 # Web Audio API multi-channel mixing, WAV encoding & decoding
│       ├── audioVAD.ts                   # Voice Activity Detection (VAD) and vocal onset/offset detection
│       ├── autoFixEngine.ts              # 6-stage automated timeline collision resolution engine
│       ├── bulkSpeedController.ts        # Bulk tempo stretching and speed policy enforcement
│       ├── candidateScorer.ts            # Translation candidate ranking (Semantic, Naturalness, Duration)
│       ├── durationPredictor.ts          # Persian syllable-based speech duration estimation
│       ├── evaluationService.ts          # Automated audio-video sync evaluation and quality metrics
│       ├── fileNaming.ts                 # Clean project file and export naming utilities
│       ├── hardwareIdentity.ts           # Windows hardware fingerprinting and device identity generation
│       ├── licenseConfig.ts              # Offline licensing constants, schemas, and master public key
│       ├── licenseManager.ts             # Offline license generation, verification, and installation
│       ├── localTranslator.ts            # 100% offline rule-based Persian translation & technical dictionary
│       ├── offlineVoiceSynthesizer.ts    # Procedural Web Audio synthesis & Web Speech API preview
│       ├── overlapEngine.ts              # Overlap classification, detection, and collision metrics
│       ├── semanticValidator.ts          # Guardrails for negation flips, numbers, and named entities
│       ├── srtParser.ts                  # SubRip (.srt) parser, formatter, and timestamp calculator
│       ├── syncEngine.ts                 # Audio silence profiling, WSOLA time-stretch & sync algorithms
│       ├── updateConfig.ts               # Auto-update constants, schemas, and update signer public key
│       ├── updateManager.ts              # Client-side update verification, downloading, and execution
│       ├── videoToWav.ts                 # Client-side video-to-WAV extraction helpers
│       ├── voiceProfiles.ts              # Calibrated voice profiles (Puck, Charon, Kore, Fenrir, etc.)
│       └── whisperLocalScript.ts         # Script generator and runner for local Faster-Whisper
├── src-launcher/                         # [Tracked] Empty directory placeholder
├── start-dubbing.sh                      # [Tracked] Unix/Linux/macOS Bash launcher script
├── Start-DubbingVidans.bat               # [Tracked] Windows Batch launcher script with auto Node check
├── tests/                                # [Tracked] TypeScript integration and unit test suite
│   ├── aiSyncTimeline.test.ts            # Tests for AI timeline sync algorithms
│   ├── autoFixTimeline.test.ts           # Tests for 6-stage AutoFix timeline collision resolution
│   ├── autoUpdateSystem.test.ts          # Tests for Ed25519 signature & SHA-256 update verification
│   ├── balancedDubbingSystem.test.ts     # Tests for duration-aware candidate scoring and voice profiles
│   ├── hormouzJsonExtractor.test.ts      # Tests for Hormouz LLM JSON parsing and markdown stripping
│   ├── licensingSystem.test.ts           # Tests for hardware-locked offline Ed25519 licensing
│   ├── offlineSystemIntegration.test.ts  # End-to-end integration test of all offline capabilities
│   ├── overlapAndBulkSpeed.test.ts       # Tests for overlap classification and bulk speed adjustment
│   ├── syncEngine.test.ts                # Tests for audio silence profiling and WSOLA time-stretching
│   ├── videoBrandingPipeline.test.ts     # Tests for mux_video.py video normalization, intro & watermark
│   └── zeroSilenceAndFlexiblePlacement.test.ts # Tests for zero-silence trimming & flexible dialogue shifts
├── tools/                                # [Mixed] Administrative and developer tooling
│   ├── license-generator/                # Standalone offline license generator tool for software owner
│   │   ├── __pycache__/                  # Python bytecode cache
│   │   ├── build/                        # PyInstaller build cache for LicenseGenerator.exe
│   │   ├── dist/
│   │   │   └── LicenseGenerator.exe      # Compiled standalone GUI license generator for Windows
│   │   ├── keys/
│   │   │   ├── owner_private_key.pem     # [Ignored/Secret] Software owner Ed25519 private signing key
│   │   │   └── owner_public_key.pem      # [Tracked] Software owner Ed25519 public verification key
│   │   ├── license_engine.py             # Core Python licensing cryptographic engine
│   │   ├── license_generator_cli.py      # Command-line interface for batch license generation
│   │   ├── license_generator_gui.py      # Tkinter graphical interface for license generation
│   │   └── LicenseGenerator.spec         # PyInstaller specification for compiling LicenseGenerator.exe
│   └── update-signer/                    # Release signing and manifest generation tool
│       ├── keys/
│       │   ├── update_signer_private_key.pem # [Ignored/Secret] Ed25519 release signing private key
│       │   └── update_signer_public_key.pem  # [Tracked] Ed25519 release verification public key
│       └── sign_release.py               # Python script to sign releases and generate update-manifest.json
├── tsconfig.json                         # [Tracked] TypeScript compiler options and path aliases
├── update-server/                        # [Tracked] Dedicated update proxy and release distribution service
│   ├── .env.example                      # Environment template for update server (GitHub tokens)
│   ├── Dockerfile                        # Containerization specification for deploying update server
│   ├── package.json                      # NPM configuration and dependencies for update server
│   ├── README.md                         # Architecture and deployment guide for update server
│   └── src/
│       ├── server.test.ts                # Unit tests for update server endpoints
│       └── server.ts                     # Express server handling GitHub token exchange and manifest proxy
├── vite.config.ts                        # [Tracked] Vite bundler configuration (React plugin, Tailwind plugin)
└── __pycache__/                          # [Ignored] Python bytecode cache
    └── local_whisper.cpython-314.pyc     # Compiled bytecode for local_whisper.py
```

---

## Detailed Subsystem Breakdown

### 1. Source Code Core (`src/`)
Contains 38 TypeScript files organized into three primary layers:
- `src/components/` (12 files): The visual React component hierarchy representing each stage of the dubbing workflow, plus modal dialogues for configuration, licensing, updates, and auto-fix.
- `src/utils/` (22 files): Pure computational logic, algorithmic engines (VAD, WSOLA, Duration Prediction, Scoring, Hardware Identity, Cryptography, Timeline AutoFix).
- `src/types/` (1 file: `dubbing.ts`): The unified type system defining data structures across the application.

### 2. Native Launcher & Packaging (`launcher.cs`, `installer/`, `runtime/`)
Provides native Windows deployment without requiring the end-user to manage command prompts, package managers, or environment variables:
- `launcher.cs`: Automatically checks and locates Node.js (or triggers an unattended background winget installation), starts `server.cjs` on an isolated port, launches Edge or Chrome in app-window mode, and manages process lifecycles.
- `installer/DubbingVidans_Setup.iss`: Compiles the complete project, bundled runtimes, models, and assets into an ultra-compressed LZMA2 single-file installer.
- `runtime/`: Fully portable, zero-install versions of Python 3.12, FFmpeg, FFprobe, and Node.js.

### 3. Automated Test Suite (`tests/`)
Contains 11 test modules covering 100% of business-critical logic. All tests run headless in CI/CD using `tsx` without requiring a graphical display or live API keys.
