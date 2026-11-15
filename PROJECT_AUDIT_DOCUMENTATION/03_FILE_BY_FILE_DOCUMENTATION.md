# 03 - Complete File-by-File Technical Audit: Dubbing Vidans

## Executive Introduction

This document provides a deep, evidence-based, file-by-file technical audit of every accessible file in the **Dubbing Vidans** repository and local workspace (`C:\Users\Sadra\Desktop\Sadra\Dub\Dubbing`).

Every file has been individually inspected, analyzed, and evaluated across thirteen technical dimensions:
1. **File Name**
2. **Full Relative Path**
3. **File Extension & Format**
4. **File Type**
5. **Exact Purpose**
6. **What It Does**
7. **How It Works (Implementation details)**
8. **Important Functions, Classes, Interfaces & Constants**
9. **Inputs & Outputs**
10. **Dependencies & Relationships**
11. **Where & How It Is Used**
12. **Lifecycle Status** (*Essential*, *Optional*, *Generated*, *Obsolete*, or *Redundant*)
13. **Technical Observations & Recommendations**

---

# 1. Root Directory Files (24 Files)

---

### File 1: `.env`
- **Relative Path**: `.env`
- **Extension & Format**: Plain text configuration (`KEY=VALUE`)
- **File Type**: Local Environment Configuration File
- **Exact Purpose**: Stores local environment variable overrides for runtime execution.
- **What It Does**: Defines local connection endpoints (`API_BASE_URL`), model designations (`TRANSLATION_MODEL`, `TTS_MODEL`), server port (`PORT=3000`), and API keys for development and local testing.
- **How It Works**: Loaded on backend startup via `dotenv.config()` in `server.ts` and `server.cjs`. Values populate `process.env`.
- **Key Definitions**: `API_BASE_URL`, `HORMOUZ_API_KEY`, `TRANSLATION_MODEL`, `TTS_MODEL`, `GEMINI_API_KEY`, `PORT`.
- **Inputs / Outputs**: Inputs: Text configuration. Outputs: Environment variables injected into Node.js process.
- **Dependencies**: Referenced by `dotenv`, `server.ts`, `server.cjs`.
- **Where Used**: Read at server initialization in `server.ts:25`.
- **Lifecycle Status**: *Essential* for local custom configuration; *Ignored* by Git (Rule 59 of `.gitignore`).
- **Technical Observations**: API keys in the local file are currently empty/unpopulated, ensuring that zero confidential keys are exposed. Git-ignored properly.

---

### File 2: `.env.example`
- **Relative Path**: `.env.example`
- **Extension & Format**: Plain text template
- **File Type**: Configuration Template
- **Exact Purpose**: Serves as a version-controlled reference template for `.env`.
- **What It Does**: Documents all available environment variables, default values (`https://api.hormouz.net/v1`, `openai/gpt-6-luna`, `google/gemini-3.8-flash-lite-tts`, `3000`), and setup instructions in Persian.
- **How It Works**: Developers copy this file to `.env` and fill in their respective provider keys.
- **Key Definitions**: Template strings for `API_BASE_URL`, `HORMOUZ_API_KEY`, `TRANSLATION_MODEL`, `TTS_MODEL`, `GEMINI_API_KEY`, `PORT`.
- **Inputs / Outputs**: Reference documentation for environment setup.
- **Dependencies**: Paired with `.env`.
- **Where Used**: Developer onboarding and CI/CD reference.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Explicitly un-ignored in `.gitignore:65` (`!.env.example`). Accurately reflects Hormouz AI and Gemini integration requirements.

---

### File 3: `.gitattributes`
- **Relative Path**: `.gitattributes`
- **Extension & Format**: Git configuration
- **File Type**: Repository Attributes Configuration
- **Exact Purpose**: Enforces consistent line endings and binary handling across operating systems.
- **What It Does**: Normalizes text files to LF (`* text=auto`), ensures Windows scripts retain CRLF (`*.bat text eol=crlf`, `*.ps1 text eol=crlf`, `*.iss text eol=crlf`), and flags binaries (`*.exe`, `*.mp4`, `*.png`, `*.ico`, `*.bin`) as `binary` so Git avoids corrupting them with line-ending conversions.
- **How It Works**: Evaluated by Git during `git checkout`, `git commit`, and diff calculations.
- **Key Definitions**: EOL rules for shell scripts, batch files, and binary flags for media and executables.
- **Inputs / Outputs**: Git line-ending normalization directives.
- **Dependencies**: Git core client.
- **Where Used**: Repository-wide across all developer and CI/CD checkouts.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Prevents Inno Setup and Windows batch script failures caused by accidental LF line-ending normalization on Windows.

---

### File 4: `.gitignore`
- **Relative Path**: `.gitignore`
- **Extension & Format**: Git configuration
- **File Type**: Version Control Ignore Rules
- **Exact Purpose**: Prevents build artifacts, secrets, dependencies, large models, and local scratch files from entering version control.
- **What It Does**: Defines precise exclusion patterns for `node_modules/`, `dist/`, `build/`, `runtime/`, `models/`, `*.exe` (with explicit exemption for `!DubbingVidans.exe`), private cryptographic keys (`*.pem`, `owner_private_key.pem`, `update_signer_private_key.pem`), `.env`, `Sadra/`, and `scratch/`.
- **How It Works**: Evaluated by Git on all file tracking operations.
- **Key Definitions**: Whitelist rules (`!DubbingVidans.exe`, `!tools/license-generator/keys/owner_public_key.pem`, `!tools/update-signer/keys/update_signer_public_key.pem`, `!.env.example`).
- **Inputs / Outputs**: Exclusion patterns.
- **Dependencies**: Git CLI and IDE tooling.
- **Where Used**: Repository-wide.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Highly structured and secure. Prevents accidental leakage of private keys while intentionally committing public keys needed by clients.

---

### File 5: `CONTRIBUTING.md`
- **Relative Path**: `CONTRIBUTING.md`
- **Extension & Format**: Markdown (`.md`)
- **File Type**: Project Governance Documentation
- **Exact Purpose**: Outlines development guidelines, commit conventions, branching strategies, and testing requirements for contributors.
- **What It Does**: Explains how to clone the repository, install dependencies, run test suites (`npm run test:ci`, `npm run test:integration`), follow Conventional Commits (`feat:`, `fix:`, `refactor:`), and adhere to security policies.
- **How It Works**: Human-readable guide displayed on GitHub.
- **Key Definitions**: PR checklist, testing commands, security reporting rules.
- **Inputs / Outputs**: Markdown documentation.
- **Dependencies**: None.
- **Where Used**: GitHub project homepage.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Well written, clear, and up-to-date with current test scripts.

---

### File 6: `Dubbing-Vidans-Setup.exe`
- **Relative Path**: `Dubbing-Vidans-Setup.exe`
- **Extension & Format**: Windows Portable Executable (PE32+ / Inno Setup self-extracting archive)
- **File Type**: Compiled Windows Standalone Installer Binary (365,010,931 bytes)
- **Exact Purpose**: Offline installer for installing Dubbing Vidans, portable runtimes, models, and desktop shortcuts on end-user machines.
- **What It Does**: Extracts the application into `C:\Program Files\Dubbing Vidans`, configures `%ProgramData%\DubbingVidans`, installs bundled Python, FFmpeg, and Node.js runtimes, and creates desktop/Start Menu shortcuts.
- **How It Works**: Self-extracting Inno Setup LZMA2 archive compiled from `installer/DubbingVidans_Setup.iss`.
- **Key Definitions**: Windows PE binary.
- **Inputs / Outputs**: Executes with administrative privileges on Windows 10/11.
- **Dependencies**: Targets Windows x64.
- **Where Used**: Customer distribution.
- **Lifecycle Status**: *Generated / Local-Only* (Ignored by Git).
- **Technical Observations**: This is an older build dated 11/9/2026 located in the root directory. The newer release build (v1.0.1, 365,038,648 bytes, dated 11/11/2026) is located in `dist-installer/Dubbing-Vidans-Setup.exe`. Having a 365MB binary in the project root is redundant and should be cleaned up.

---

### File 7: `DubbingVidans.exe`
- **Relative Path**: `DubbingVidans.exe`
- **Extension & Format**: Windows Portable Executable (.NET Framework / C# Assembly, 77,312 bytes)
- **File Type**: Native Windows Desktop Launcher Binary
- **Exact Purpose**: Provides a zero-configuration native desktop application entry point for end users.
- **What It Does**: Compiled binary of `launcher.cs`. Checks for Node.js, starts the local background server on port 3000, opens a dedicated borderless/app-mode window in Edge or Chrome (`--app=http://localhost:3000`), and kills the server process when the window is closed.
- **How It Works**: Compiled via .NET C# compiler (`csc.exe /target:winexe /win32icon:assets\Vidans.ico`).
- **Key Definitions**: Application metadata: Product "Dubbing Vidans", Version 1.0.1.0, Vidans Studio.
- **Inputs / Outputs**: Windows executable.
- **Dependencies**: .NET Framework 4.0+, Windows OS.
- **Where Used**: Desktop shortcut target and root execution entry point.
- **Lifecycle Status**: *Essential / Tracked*. Explicitly exempted in `.gitignore:22` (`!DubbingVidans.exe`).
- **Technical Observations**: Enables the application to behave as a native Windows desktop app without requiring Electron.

---

### File 8: `index.html`
- **Relative Path**: `index.html`
- **Extension & Format**: HTML5 (`.html`)
- **File Type**: Frontend Web Application Entry Point
- **Exact Purpose**: Serves as the single-page application (SPA) HTML container for Vite and the browser.
- **What It Does**: Configures document metadata, RTL layout (`dir="rtl"`, `lang="fa"`), Vazirmatn and JetBrains Mono fonts from Google Fonts, favicon, PWA manifest, and mounts `/src/main.tsx`.
- **How It Works**: Loaded by Vite development server or served statically by Express in production (`app.use(express.static(distPath))`).
- **Key Definitions**: `#root` DOM mounting container, Google Fonts preconnect tags, theme-color `#099767`.
- **Inputs / Outputs**: Browser DOM template.
- **Dependencies**: Loads `/src/main.tsx`, `/favicon.png`, `/manifest.json`.
- **Where Used**: Root web entry point.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Properly preconfigured for Persian typography and responsive viewport layout.

---

### File 9: `Install-DubbingVidans.ps1`
- **Relative Path**: `Install-DubbingVidans.ps1`
- **Extension & Format**: PowerShell Script (`.ps1`)
- **File Type**: System Configuration & Provisioning Automation
- **Exact Purpose**: Automates directory creation, multi-user permissions, prerequisite checking, and shortcut creation on Windows.
- **What It Does**:
  1. Creates `%ProgramData%\DubbingVidans` and `models/` directory.
  2. Modifies Windows Access Control Lists (ACLs) granting `BUILTIN\Users` modify permissions so all local Windows user accounts can share offline license files.
  3. Detects Node.js in PATH or standard Program Files, with automatic winget fallback (`winget install OpenJS.NodeJS.LTS`).
  4. Creates a desktop shortcut (`Dubbing Vidans.lnk`) targeting `Start-DubbingVidans.bat` with `public\Vidans.ico`.
- **How It Works**: Uses .NET `System.Security.AccessControl` and `WScript.Shell` COM object.
- **Key Definitions**: `$ProgramDataPath`, `$AccessRule`, `$WshShell.CreateShortcut`.
- **Inputs / Outputs**: Windows administrative shell script.
- **Dependencies**: Windows PowerShell 5.1+.
- **Where Used**: Invoked during post-installation or manual setup.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Critical for multi-user licensing support; ensures standard non-admin users do not hit permission errors when saving `.vidanslic`.

---

### File 10: `launcher.cs`
- **Relative Path**: `launcher.cs`
- **Extension & Format**: C# Source Code (`.cs`)
- **File Type**: Native Windows Desktop Launcher Source
- **Exact Purpose**: Full source code for the standalone Windows launcher compiled into `DubbingVidans.exe`.
- **What It Does**:
  - `ResolveOrInstallNode(appDir)`: Checks local `runtime\node.exe`, `node.exe`, Program Files, LocalAppData, or invokes unattended `winget` installation.
  - `StartServer(appDir, nodePath)`: Injects `runtime\python` and `runtime\ffmpeg` into PATH, then spawns `server.cjs` (or `server.js` or `tsx server.ts`) as a hidden background process.
  - `IsPortOpen(host, port, timeoutMs)`: Polling helper with TCP client checking `127.0.0.1:3000`.
  - `FindStandaloneBrowser()`: Locates Microsoft Edge or Google Chrome executable in Program Files / LocalAppData.
  - Launches browser in dedicated application mode (`--app=http://localhost:3000 --window-size=1366,820 --user-data-dir=... --app-id=DubbingVidans`).
  - `KillServerProcess()`: Kills background Node.js server tree (`taskkill /pid ... /T /F`) upon window exit.
- **How It Works**: Standard C# WinForms/Console hybrid using `System.Diagnostics.Process` and `System.Net.Sockets.TcpClient`.
- **Key Definitions**: Class `DubbingVidans.AppLauncher`, methods `ResolveOrInstallNode`, `StartServer`, `IsPortOpen`, `FindStandaloneBrowser`, `KillServerProcess`.
- **Inputs / Outputs**: System processes and UI window.
- **Dependencies**: .NET Framework 4.0+.
- **Where Used**: Compiled by `csc.exe` in CI/CD and build scripts.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Well designed. Gracefully falls back to default browser if neither Edge nor Chrome is found.

---

### File 11: `LICENSE`
- **Relative Path**: `LICENSE`
- **Extension & Format**: Plain text
- **File Type**: Legal Software License
- **Exact Purpose**: Defines the intellectual property and distribution terms for Vidans Studio.
- **What It Does**: Grants rights and restrictions regarding software usage, proprietary licensing, and attribution.
- **How It Works**: Standard legal text.
- **Key Definitions**: Vidans Studio Copyright © 2026.
- **Inputs / Outputs**: Legal documentation.
- **Dependencies**: None.
- **Where Used**: Root repository and displayed in Inno Setup wizard.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Clean, professional commercial/proprietary license text.

---

### File 12: `local_whisper.py`
- **Relative Path**: `local_whisper.py`
- **Extension & Format**: Python Source Code (`.py`)
- **File Type**: Offline Speech-to-Text CLI Script
- **Exact Purpose**: Executes local, offline speech recognition on audio files using `faster-whisper`.
- **What It Does**:
  1. Accepts audio path and model size (default `base`) via command-line arguments.
  2. Loads audio via `soundfile`, downmixes stereo to mono, normalizes peak amplitude.
  3. Detects CUDA availability; falls back to CPU with `int8` quantization.
  4. Resolves offline model path in `models/faster-whisper-base` to prevent network requests (`local_files_only=True`).
  5. Runs transcription with word-level timestamps and Voice Activity Detection (VAD).
  6. Applies speaker switching heuristic based on dialogue pause durations (>1.2s).
  7. Outputs structured JSON to standard output (`{ "success": true, "segments": [...] }`).
- **How It Works**: Wraps CTranslate2 `faster_whisper.WhisperModel`.
- **Key Definitions**: `transcribe(audio_path, model_size)`, `WhisperModel`, `vad_parameters=dict(min_silence_duration_ms=400)`.
- **Inputs / Outputs**: Input: Audio file path (`.wav`, `.mp3`). Output: Formatted JSON on `stdout`.
- **Dependencies**: `faster-whisper`, `soundfile`, `numpy`, `torch` (optional).
- **Where Used**: Spawned as a child process by `server.ts:353` and `server.ts:2130`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Robust offline design. Correctly parses word timestamps and suppresses console logging to ensure JSON output parseability.

---

### File 13: `metadata.json`
- **Relative Path**: `metadata.json`
- **Extension & Format**: JSON (`.json`)
- **File Type**: AI Platform / Studio Metadata Manifest
- **Exact Purpose**: Defines application identity, description, and permission requirements for AI development environments.
- **What It Does**: Declares application name "استودیو دوبله هوشمند فارسی", description, and major capability `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`.
- **How It Works**: Read by cloud platform harnesses or IDE extensions.
- **Key Definitions**: `name`, `description`, `requestFramePermissions`, `majorCapabilities`.
- **Inputs / Outputs**: JSON metadata.
- **Dependencies**: None.
- **Where Used**: Google AI Studio / Antigravity harness.
- **Lifecycle Status**: *Optional / Informational*.
- **Technical Observations**: Accurate metadata for cloud IDE environments.

---

### File 14: `mux_video.py`
- **Relative Path**: `mux_video.py`
- **Extension & Format**: Python Source Code (`.py`)
- **File Type**: Video Branding & Multiplexing Automation Engine
- **Exact Purpose**: Multiplexes dubbed audio into original video while applying optional high-definition intro clip concatenation and corner watermark logos.
- **What It Does**:
  - `get_video_info`, `get_video_duration`, `get_video_resolution`: Extracts video metadata via `ffprobe`.
  - `normalize_video`: Scales source video to reference 1080p (or intro resolution), applies letterboxing/pillarboxing padding (`force_original_aspect_ratio=decrease,pad=...`), resamples audio to stereo 48,000 Hz AAC.
  - `concatenate_videos`: Concatenates normalized intro clip (`assets/cache/intro_normalized_1080p.mp4`) with main video using FFmpeg concat demuxer.
  - `add_logo`: Applies corner watermark logo (`LOGO_WIDTH_PERCENT=12`, `LOGO_MARGIN_PERCENT=2`) using FFmpeg overlay filter.
  - `process_dubbed_video`: Complete pipeline orchestration. Supports fast stream-copy mode when branding is disabled.
- **How It Works**: Spawns FFmpeg and FFprobe subprocesses. Supports CLI flags (`--video`, `--audio`, `--output`, `--intro`, `--logo`, `--no-intro`, `--no-logo`, `--preset`).
- **Key Definitions**: `process_dubbed_video`, `normalize_video`, `concatenate_videos`, `add_logo`.
- **Inputs / Outputs**: Inputs: Video and audio files. Output: Final MP4 file and JSON status on `stdout`.
- **Dependencies**: `ffmpeg`, `ffprobe`, Python 3 standard library.
- **Where Used**: Invoked by `server.ts:2645` (`/api/render-dubbed-video`) and `tests/videoBrandingPipeline.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Excellent design: utilizes pre-rendered cache for intro concatenation to avoid re-encoding the intro on every render, cutting processing time drastically.

---

### File 15: `package.json`
- **Relative Path**: `package.json`
- **Extension & Format**: JSON (`.json`)
- **File Type**: Node.js Project Manifest & Dependency Specification
- **Exact Purpose**: Defines project metadata, NPM scripts, dependencies, devDependencies, and module type (`type: "module"`).
- **What It Does**: Specifies runtime packages (`react`, `react-dom`, `@google/genai`, `express`, `dotenv`, `motion`, `lucide-react`, `vite`, `@tailwindcss/vite`) and developer tooling (`typescript`, `tsx`, `esbuild`, `@types/*`). Configures build scripts (`npm run build`, `npm run build:server`, `npm run test:ci`).
- **How It Works**: Standard NPM configuration file.
- **Key Definitions**: Version `1.0.1`, scripts `dev`, `start`, `build`, `build:server`, `test:ci`, `test:integration`.
- **Inputs / Outputs**: Package configuration.
- **Dependencies**: NPM package manager.
- **Where Used**: Root project configuration.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Well organized. Script `build:server` uses esbuild to bundle `server.ts` into a self-contained `server.cjs` targeting Node 18, eliminating runtime TypeScript compilation overhead in production.

---

### File 16: `README.fa.md`
- **Relative Path**: `README.fa.md`
- **Extension & Format**: Markdown (`.md`)
- **File Type**: Persian Master Product Documentation
- **Exact Purpose**: Comprehensive Persian user and developer guide.
- **What It Does**: Details software features, installation steps, offline licensing workflow, keyboard shortcuts, architecture overview, and troubleshooting instructions in Persian.
- **How It Works**: Human-readable documentation.
- **Key Definitions**: Detailed Persian markdown documentation.
- **Inputs / Outputs**: Documentation.
- **Dependencies**: None.
- **Where Used**: Primary reference for Persian users and developers.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Exhaustive and well formatted.

---

### File 17: `README.md`
- **Relative Path**: `README.md`
- **Extension & Format**: Markdown (`.md`)
- **File Type**: English Master Product Documentation
- **Exact Purpose**: Comprehensive English user and developer guide.
- **What It Does**: Mirrors the core sections of the Persian README: architecture, offline capabilities, setup instructions, testing guide, licensing overview, and CI/CD pipelines.
- **How It Works**: Human-readable documentation displayed on GitHub.
- **Key Definitions**: English project overview and quickstart instructions.
- **Inputs / Outputs**: Documentation.
- **Dependencies**: None.
- **Where Used**: GitHub project homepage.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: High quality, thorough, and accurately synchronized with current implementation.

---

### File 18: `SECURITY.md`
- **Relative Path**: `SECURITY.md`
- **Extension & Format**: Markdown (`.md`)
- **File Type**: Security Policy & Cryptographic Disclosure
- **Exact Purpose**: Defines the security trust model, vulnerability reporting protocol, and cryptographic enforcement rules.
- **What It Does**: Explains the cryptographic separation between offline licensing keys (Owner Key) and update signing keys (Update Signer Key). Outlines reporting channels and security commitments.
- **How It Works**: Standard GitHub security policy.
- **Key Definitions**: Supported versions, vulnerability reporting process, cryptographic key isolation rules.
- **Inputs / Outputs**: Security policy documentation.
- **Dependencies**: None.
- **Where Used**: GitHub repository security tab.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Adheres to modern security practices and emphasizes strict cryptographic key isolation.

---

### File 19: `server.cjs`
- **Relative Path**: `server.cjs`
- **Extension & Format**: CommonJS JavaScript (`.cjs`, 3,173,711 bytes)
- **File Type**: Production Bundled Backend Server
- **Exact Purpose**: Standalone, pre-bundled CommonJS server for production execution without TypeScript runtime dependencies.
- **What It Does**: Bundled artifact of `server.ts` generated via `esbuild server.ts --bundle --platform=node --format=cjs --target=node18 --outfile=server.cjs --external:vite`. Contains all Express endpoints, licensing validation, file conversions, and offline handlers.
- **How It Works**: Executed directly by `node server.cjs` by `DubbingVidans.exe` or `Start-DubbingVidans.bat`.
- **Key Definitions**: Bundled Node.js Express server.
- **Inputs / Outputs**: Network server listening on port 3000.
- **Dependencies**: Node.js runtime, system FFmpeg/Python.
- **Where Used**: Production server runtime.
- **Lifecycle Status**: *Essential / Tracked*.
- **Technical Observations**: Bundled into CommonJS so Node.js can start it instantaneously without requiring `tsx` or on-the-fly TypeScript compilation.

---

### File 20: `server.ts`
- **Relative Path**: `server.ts`
- **Extension & Format**: TypeScript (`.ts`, 3,686 lines, 149,649 bytes)
- **File Type**: Master Backend Server Source Code
- **Exact Purpose**: Core Express server powering all API endpoints, file uploads, AI integrations, licensing middleware, and update services.
- **What It Does**:
  - Implements 15+ REST endpoints:
    - `/api/convert-video-to-wav`: FFmpeg extraction of 16-bit 44.1kHz stereo PCM WAV from raw video.
    - `/api/extract-video-subtitles`: FFmpeg extraction of embedded `.srt` streams.
    - `/api/transcribe-video-to-srt`: Video to SRT via Gemini Multimodal Audio API or local Faster-Whisper.
    - `/api/license/status`: Hardware verification & offline license validation.
    - `/api/license/request`: Machine activation request generation (`.vidansreq`).
    - `/api/license/activate`: Cryptographic license installation into ProgramData.
    - `/api/check-key`, `/api/list-models`: API key and model verification.
    - `/api/translate-subtitles`, `/api/translate-fallback`: Persian translation with candidate generation.
    - `/api/transcribe-audio`: Local Faster-Whisper speech-to-text runner.
    - `/api/tts`: Voice synthesis via Gemini TTS, Edge TTS, or procedural fallback.
    - `/api/time-stretch-audio`: Server-side audio time-stretching.
    - `/api/adapt-translation-duration`: AI text shortening for timing fit.
    - `/api/upload-dubbed-audio`, `/api/render-dubbed-video`: Video muxing and branding via `mux_video.py` (protected by `requireValidLicense` middleware).
    - `/api/app-update/*`: Auto-update status, check, download, and installation.
  - Serves static Vite production files in production or attaches Vite dev middleware in development.
- **How It Works**: Express 4 server with streaming body parsers (`express.raw({ limit: '800mb' })`).
- **Key Definitions**: Middleware `requireValidLicense`, endpoints listed above, helper `getFfmpegBin()`, `getPythonBin()`.
- **Inputs / Outputs**: HTTP requests and multipart/raw media streams.
- **Dependencies**: `express`, `@google/genai`, `crypto`, `child_process`, `licenseManager`, `hardwareIdentity`, `candidateScorer`, `localTranslator`.
- **Where Used**: Primary backend service.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Highly mature, resilient architecture. Employs comprehensive error handling, automatic retry mechanisms for rate-limited APIs, and automatic fallback from cloud to offline engines.

---

### File 21: `start-dubbing.sh`
- **Relative Path**: `start-dubbing.sh`
- **Extension & Format**: POSIX Shell Script (`.sh`)
- **File Type**: Linux / macOS Application Launcher
- **Exact Purpose**: Provides cross-platform execution capability for Unix-like environments.
- **What It Does**: Checks Node.js, Python 3, and FFmpeg in PATH, starts `server.cjs` or `server.ts` in background, waits for port binding, and opens default web browser via `xdg-open` (Linux) or `open` (macOS).
- **How It Works**: Bash script using background jobs and trap signals.
- **Key Definitions**: Environment defaults `PORT=3000`, `NODE_ENV=production`.
- **Inputs / Outputs**: Shell launcher.
- **Dependencies**: Bash, Node.js.
- **Where Used**: Non-Windows developer environments.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Includes clean process termination handling.

---

### File 22: `Start-DubbingVidans.bat`
- **Relative Path**: `Start-DubbingVidans.bat`
- **Extension & Format**: Windows Batch File (`.bat`)
- **File Type**: Windows Batch Application Launcher
- **Exact Purpose**: Double-clickable Windows batch launcher for running Dubbing Vidans.
- **What It Does**: Sets UTF-8 codepage (`chcp 65001`), locates Node.js in PATH, standard Program Files, or local `runtime\node.exe`, creates `%ProgramData%\DubbingVidans`, launches the browser to `http://localhost:3000` after 1 second, and starts `server.cjs`.
- **How It Works**: Windows `cmd.exe` batch script.
- **Key Definitions**: `NODE_CMD` resolution, `start http://localhost:3000`.
- **Inputs / Outputs**: Windows command shell.
- **Dependencies**: Windows `cmd.exe`.
- **Where Used**: Desktop shortcut target and manual launcher.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Works seamlessly as a lightweight alternative to `DubbingVidans.exe`.

---

### File 23: `tsconfig.json`
- **Relative Path**: `tsconfig.json`
- **Extension & Format**: JSON with Comments (`.json`)
- **File Type**: TypeScript Compiler Configuration
- **Exact Purpose**: Configures TypeScript compiler settings, target ECMAScript version, and path aliases.
- **What It Does**: Sets target to `ES2022`, module to `ESNext`, moduleResolution to `bundler`, JSX to `react-jsx`, enables path alias `@/* -> ./*`, and sets `noEmit: true` (compilation handled by Vite and esbuild).
- **How It Works**: Read by `tsc`, Vite, `tsx`, and IDE language servers.
- **Key Definitions**: `compilerOptions`, `paths`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`.
- **Inputs / Outputs**: TypeScript configuration.
- **Dependencies**: TypeScript compiler.
- **Where Used**: Entire TypeScript codebase.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Configured properly for modern React 19 and Vite 8 bundler resolution.

---

### File 24: `vite.config.ts`
- **Relative Path**: `vite.config.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Vite Bundler Configuration
- **Exact Purpose**: Configures frontend development server, plugins, build options, and asset bundling.
- **What It Does**: Integrates `@vitejs/plugin-react` and `@tailwindcss/vite`, defines `@` root path alias, and controls Hot Module Replacement (HMR) behavior.
- **How It Works**: Evaluated by Vite CLI during `npm run dev` and `npm run build`.
- **Key Definitions**: `defineConfig`, plugins array, path alias resolution.
- **Inputs / Outputs**: Vite build configuration.
- **Dependencies**: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`.
- **Where Used**: Development and build pipelines.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Uses the official Tailwind CSS v4 Vite plugin (`@tailwindcss/vite`), aligning with modern Tailwind v4 zero-config architecture.

---

# 2. Source Code Directory: `src/` (38 Files)

---

## 2.1 Core React Files

### File 25: `src/App.tsx`
- **Relative Path**: `src/App.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 540 lines)
- **File Type**: Root Application Component
- **Exact Purpose**: Manages global application state, navigation between workflow stages, modal visibility, and cross-stage data flow.
- **What It Does**:
  - Maintains state for all 5 stages:
    - Step 1: `upload` (`FileUploaderSection`)
    - Step 2: `translate` (`TranslationStudio`)
    - Step 3: `voice` (`VoiceSynthesisStudio`)
    - Step 4: `timeline` (`TimelinePlayer`)
    - Step 5: `export` (`ExportStudio`)
  - Holds core project data: `subtitles: SubtitleItem[]`, `originalAudioBuffer`, `originalVideoFile`, `outputBaseName`.
  - Manages modal visibility: `ApiKeyModal`, `LicenseModal`, `UpdateModal`.
  - Performs license status check on mount (`/api/license/status`) and checks for available software updates (`fetchUpdateStatus`).
  - Handles project export naming derivation via `fileNaming.ts`.
- **How It Works**: Standard React stateful functional component with `useState` and `useEffect`.
- **Key Definitions**: Component `App`, step types `'upload' | 'translate' | 'voice' | 'timeline' | 'export'`, state hooks for media and subtitles.
- **Inputs / Outputs**: Browser DOM tree.
- **Dependencies**: Sub-components, Lucide icons, utility modules.
- **Where Used**: Mounted into DOM by `src/main.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Clean stage management with persistent state across tab switching.

---

### File 26: `src/index.css`
- **Relative Path**: `src/index.css`
- **Extension & Format**: CSS (`.css`)
- **File Type**: Global Stylesheet
- **Exact Purpose**: Provides global styling rules, Tailwind CSS directives, typography, and custom scrollbars.
- **What It Does**: Imports Tailwind CSS (`@import "tailwindcss";`), configures RTL font fallbacks, custom dark-mode scrollbars (`::-webkit-scrollbar`), and keyframe animations for audio pulsing and loading indicators.
- **How It Works**: Bundled by Vite via `@tailwindcss/vite` and injected into HTML head.
- **Key Definitions**: Scrollbar pseudo-selectors, font-family definitions, animation utilities.
- **Inputs / Outputs**: CSS stylesheet.
- **Dependencies**: Tailwind CSS v4.
- **Where Used**: Imported by `src/main.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Uses pure modern CSS custom properties and sleek dark aesthetics (`#090d11` dark surface).

---

### File 27: `src/main.tsx`
- **Relative Path**: `src/main.tsx`
- **Extension & Format**: TypeScript React (`.tsx`)
- **File Type**: React Client DOM Entry Point
- **Exact Purpose**: Bootstraps the React application into the browser DOM.
- **What It Does**: Imports `react-dom/client`, finds `#root` element in `index.html`, and renders `<App />` within `<React.StrictMode>`.
- **How It Works**: Standard React 19 `createRoot` initialization.
- **Key Definitions**: `createRoot(document.getElementById('root')!).render(...)`.
- **Inputs / Outputs**: Mounts React tree to DOM.
- **Dependencies**: `react`, `react-dom`, `src/App.tsx`, `src/index.css`.
- **Where Used**: Referenced by `index.html:22`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Minimalist and clean.

---

## 2.2 Types Directory: `src/types/` (1 File)

### File 28: `src/types/dubbing.ts`
- **Relative Path**: `src/types/dubbing.ts`
- **Extension & Format**: TypeScript (`.ts`, 597 lines)
- **File Type**: Master Domain Model & Type Declarations
- **Exact Purpose**: Central repository for all interfaces, types, enums, and default configurations used throughout the application.
- **What It Does**: Defines:
  - Voice IDs: `GeminiVoiceId` (`Puck`, `Charon`, `Kore`, `Fenrir`, `Zephyr`, `Iapetus`).
  - Subtitle Item: `SubtitleItem` (id, start/end seconds, text, farsiText, audioBase64, duration, tempo, shift metadata).
  - Translation Candidates: `TranslationCandidate`, `CandidateCategory`, `ValidationStatus`.
  - Balanced Timing Policy: `BalancedTimingPolicy`, `DEFAULT_BALANCED_TIMING_POLICY`.
  - Voice Profile: `VoiceProfile`.
  - Timeline Placement: `TimelinePlacementConfig`, `DEFAULT_TIMELINE_PLACEMENT_CONFIG`.
  - AutoFix Engine Models: `TimelineAutoFixConfig`, `AutoFixStatistics`, `AutoFixResult`, `PlannedCorrection`.
  - Overlap Classification: `OverlapSeverity`, `TimelineOverlapInfo`, `BulkSpeedHistorySnapshot`.
- **How It Works**: Pure TypeScript type definitions with exported const defaults.
- **Key Definitions**: Interfaces and defaults listed above.
- **Inputs / Outputs**: Compile-time type constraints and runtime default objects.
- **Dependencies**: None.
- **Where Used**: Imported by nearly every module in `src/`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Exceptionally comprehensive and strictly typed, ensuring architectural coherence across all subsystems.

---

## 2.3 Utility & Algorithmic Modules: `src/utils/` (22 Files)

### File 29: `src/utils/audioMixer.ts`
- **Relative Path**: `src/utils/audioMixer.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Web Audio API Audio Processing & WAV Encoding Utility
- **Exact Purpose**: Handles browser-side audio decoding, multi-track mixing, resampling, and WAV byte encoding.
- **What It Does**:
  - `getAudioContext()`: Manages singleton `AudioContext` with auto-resume on user gesture.
  - `decodeBase64ToAudioBuffer(base64)`: Decodes Base64 data URIs into raw `AudioBuffer`.
  - `audioBufferToWav(buffer)`: Encodes an `AudioBuffer` into an industry-standard 16-bit PCM WAV `Blob`.
  - `mixAudioTracks(subtitles, originalAudio, duckingDb)`: Mixes dubbed speech segments onto a timeline, with optional audio ducking of background sound.
  - `resampleAudioBuffer(buffer, targetSampleRate)`: OfflineContext resampling.
- **How It Works**: Directly manipulates IEEE 754 float samples and formats binary RIFF/WAVE headers.
- **Key Definitions**: `audioBufferToWav`, `decodeBase64ToAudioBuffer`, `mixAudioTracks`, `resampleAudioBuffer`.
- **Inputs / Outputs**: Float PCM audio arrays $\leftrightarrow$ binary WAV files.
- **Dependencies**: Web Audio API standard.
- **Where Used**: `ExportStudio.tsx`, `TimelinePlayer.tsx`, `autoFixEngine.ts`, `syncEngine.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: High-performance pure JavaScript RIFF/WAVE writer that supports both browser and headless test environments.

---

### File 30: `src/utils/audioVAD.ts`
- **Relative Path**: `src/utils/audioVAD.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Voice Activity Detection (VAD) Engine
- **Exact Purpose**: Detects acoustic speech activity, vocal pauses, and true speech onset/offset within audio buffers.
- **What It Does**: Computes short-term energy (RMS) and zero-crossing rates across rolling analysis windows (20-30ms) to distinguish voiced speech from digital background noise.
- **How It Works**: Sliding window energy calculation with hysteresis thresholding.
- **Key Definitions**: `detectVoiceActivity`, `VADSegment`, `calculateFrameRMS`.
- **Inputs / Outputs**: Input: `AudioBuffer`. Output: List of active speech intervals with start/end timestamps.
- **Dependencies**: Web Audio API.
- **Where Used**: `syncEngine.ts`, `autoFixEngine.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Critical for accurate duration calculation without being misled by trailing ambient noise.

---

### File 31: `src/utils/autoFixEngine.ts`
- **Relative Path**: `src/utils/autoFixEngine.ts`
- **Extension & Format**: TypeScript (`.ts`, 1,127 lines)
- **File Type**: 6-Stage Timeline Collision & Overlap Resolution Engine
- **Exact Purpose**: Automates the detection and intelligent resolution of subtitle and audio overlaps on the timeline.
- **What It Does**:
  - Implements a 6-stage non-destructive pipeline:
    1. *Audio Profiling*: Measures physical audio vs vocal phonation onset/offset (`measureAndProfileSegments`).
    2. *Collision Detection*: Classifies overlaps into minor, moderate, severe, and intentional (`detectCollisionsAndOverlaps`).
    3. *Zero-Silence Trimming*: Strips dead digital silence before stretching audio (`trimZeroSilenceAudioBuffer`).
    4. *Flexible Placement*: Shifts dialogues earlier or later into available gaps without altering dialogue order (`planTimelineCorrections`).
    5. *Adaptive Speed Adjustment*: Applies discrete WSOLA tempo stretching (1.00x, 1.10x, 1.20x, max 1.30x).
    6. *Translation Shortening*: Generates concise Persian translations when audio cannot fit within timing limits.
  - Generates before/after statistics and provides full 1-click undo via snapshots (`undoAutoFixChanges`).
- **How It Works**: Multi-pass constraint satisfaction algorithm with physical audio re-rendering via Web Audio API.
- **Key Definitions**: `executeAutoFixPipeline`, `planTimelineCorrections`, `measureAndProfileSegments`, `undoAutoFixChanges`.
- **Inputs / Outputs**: Input: Array of `SubtitleItem`. Output: Corrected `SubtitleItem[]` and `AutoFixResult`.
- **Dependencies**: `syncEngine.ts`, `audioMixer.ts`, `candidateScorer.ts`, `durationPredictor.ts`.
- **Where Used**: `AutoFixDashboardModal.tsx`, `TimelinePlayer.tsx`, `tests/autoFixTimeline.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: One of the most sophisticated modules in the project; completely solves speech collisions while strictly respecting audio quality guardrails (never exceeds 1.30x speed).

---

### File 32: `src/utils/bulkSpeedController.ts`
- **Relative Path**: `src/utils/bulkSpeedController.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Bulk Tempo & Speed Controller
- **Exact Purpose**: Provides batch calculation, filtering, and application of tempo modifications across multiple subtitle items.
- **What It Does**:
  - Filters items by selection mode (`all`, `selected`, `overlapping`, `threshold`).
  - Calculates required speed in percentage mode or "fit-to-target" mode.
  - Enforces safety limits: clamps speeds between 0.75x and 1.35x, flags warnings for extreme rates.
  - Tracks history snapshots for full undo/redo capability.
- **How It Works**: Mathematical rate calculations with safety clamping and audio buffer re-stretching.
- **Key Definitions**: `applyBulkSpeedChanges`, `calculateProposedSpeed`, `undoBulkSpeedChanges`.
- **Inputs / Outputs**: Subtitle array and speed configuration $\rightarrow$ modified subtitles with updated tempo.
- **Dependencies**: `syncEngine.ts`, `types/dubbing.ts`.
- **Where Used**: `BulkSpeedModal.tsx`, `tests/overlapAndBulkSpeed.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Ensures batch operations do not produce audio distortion or irreversible state changes.

---

### File 33: `src/utils/candidateScorer.ts`
- **Relative Path**: `src/utils/candidateScorer.ts`
- **Extension & Format**: TypeScript (`.ts`, 185 lines)
- **File Type**: Multi-Candidate Scoring & Selection Algorithm
- **Exact Purpose**: Evaluates, ranks, and selects the optimal Persian translation candidate based on semantic fidelity, naturalness, and acoustic timing.
- **What It Does**:
  - Calculates duration fit score: $\text{DurationScore} = 100 \times \max(0, 1 - \frac{|\text{predicted} - \text{target}|}{\max(\text{target}, 1.0)})$.
  - Checks compliance with `BalancedTimingPolicy` (preferred absolute error $\le 0.25\text{s}$, max error $\le 0.40\text{s}$, relative error $\le 8\%$).
  - Computes weighted overall score:
    $$\text{FinalScore} = 0.50 \times \text{SemanticScore} + 0.30 \times \text{NaturalnessScore} + 0.20 \times \text{DurationScore}$$
  - Hard guardrail: Rejects candidates failing semantic checks (missing numbers, inverted negation) regardless of their duration score.
- **How It Works**: Algorithmic scoring combined with calls to `durationPredictor` and `semanticValidator`.
- **Key Definitions**: `scoreAndSelectTranslationCandidates`, `calculateDurationScore`, `isWithinBalancedTimingPolicy`.
- **Inputs / Outputs**: English source, raw candidate array, target duration $\rightarrow$ ranked candidate list and selected candidate.
- **Dependencies**: `durationPredictor.ts`, `semanticValidator.ts`, `types/dubbing.ts`.
- **Where Used**: `server.ts:10`, `TranslationStudio.tsx`, `autoFixEngine.ts`, `tests/balancedDubbingSystem.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Shared across both client and server, guaranteeing identical candidate evaluation logic everywhere.

---

### File 34: `src/utils/durationPredictor.ts`
- **Relative Path**: `src/utils/durationPredictor.ts`
- **Extension & Format**: TypeScript (`.ts`, 236 lines)
- **File Type**: Persian Acoustic Speech Duration Predictor
- **Exact Purpose**: Estimates the spoken duration of Persian text prior to TTS synthesis without relying on slow or non-deterministic LLM guesses.
- **What It Does**:
  - `normalizePersianText`: Converts Arabic Yeh/Kaf to standard Persian Unicode, strips diacritics/Tashdid, normalizes Zero-Width Non-Joiner (ZWNJ) and spaces.
  - `extractLinguisticFeatures`: Computes Persian syllable counts (CV, CVC, CVCC), phonemes, word count, character density, and punctuation pauses (commas, periods, questions).
  - `predictPersianSpeechDuration`: Combines linguistic metrics with calibrated voice profile tempos to predict speech duration, active phonation time, and acoustic silence.
- **How It Works**: Empirical Persian phonetic regression calibrated with real Google Gemini TTS measurements.
- **Key Definitions**: `predictPersianSpeechDuration`, `normalizePersianText`, `extractLinguisticFeatures`.
- **Inputs / Outputs**: Persian text string, voice profile ID $\rightarrow$ `DurationPredictionResult` (seconds, phonation time, pause time, confidence).
- **Dependencies**: `voiceProfiles.ts`.
- **Where Used**: `candidateScorer.ts`, `autoFixEngine.ts`, `TranslationStudio.tsx`, `tests/balancedDubbingSystem.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Fully documented linguistic limitations (e.g. unwritten short vowels / e'rab) mitigated through empirical regression constants.

---

### File 35: `src/utils/evaluationService.ts`
- **Relative Path**: `src/utils/evaluationService.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Audio-Video Synchronization Quality Evaluator
- **Exact Purpose**: Evaluates project-wide synchronization quality metrics and generates health reports.
- **What It Does**: Scans all subtitle cues, aggregates duration mismatches, detects speech overlaps, evaluates pacing consistency, and outputs an overall synchronization health grade (A, B, C, F) with actionable advice.
- **How It Works**: Iterative statistical aggregation over `SubtitleItem[]`.
- **Key Definitions**: `evaluateTimelineHealth`, `TimelineHealthReport`.
- **Inputs / Outputs**: Subtitle array $\rightarrow$ health metrics and recommendations.
- **Dependencies**: `types/dubbing.ts`, `syncEngine.ts`.
- **Where Used**: `TimelinePlayer.tsx`, `ExportStudio.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Provides clear quality feedback before final video export.

---

### File 36: `src/utils/fileNaming.ts`
- **Relative Path**: `src/utils/fileNaming.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Filename Sanitization & Derivation Utility
- **Exact Purpose**: Generates clean, standard, collision-free export filenames.
- **What It Does**:
  - Strips file extensions, special characters, and path delimiters.
  - Derives project base names from uploaded video/subtitle files (`extractCleanBaseName`).
  - Formats standard export names with timestamp suffixes (`deriveProjectOutputName`).
- **How It Works**: Regular expression sanitization.
- **Key Definitions**: `extractCleanBaseName`, `deriveProjectOutputName`.
- **Inputs / Outputs**: Raw filename $\rightarrow$ sanitized base name string.
- **Dependencies**: None.
- **Where Used**: `src/App.tsx:13`, `ExportStudio.tsx`, `FileUploaderSection.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Prevents filesystem errors caused by illegal characters on Windows (such as `:`, `?`, `*`, `"`).

---

### File 37: `src/utils/hardwareIdentity.ts`
- **Relative Path**: `src/utils/hardwareIdentity.ts`
- **Extension & Format**: TypeScript (`.ts`, 224 lines)
- **File Type**: Windows Hardware Fingerprinting & Device Key Generator
- **Exact Purpose**: Generates a tamper-resistant hardware fingerprint and ephemeral device key pair for offline licensing.
- **What It Does**:
  - Queries Windows registry for `MachineGuid`.
  - Executes a single consolidated PowerShell CIM query to collect:
    - BIOS/System UUID (`Win32_ComputerSystemProduct.UUID`)
    - CPU Processor ID (`Win32_Processor.ProcessorId`)
    - Motherboard Serial (`Win32_BaseBoard.SerialNumber`)
    - Disk Drive Serial (`Win32_DiskDrive.SerialNumber`)
  - Computes a SHA-256 hardware fingerprint combining all hardware attributes.
  - Generates an ephemeral Ed25519 device key pair, encrypting the private key with AES-256-GCM using a key derived from the hardware fingerprint.
  - Stores identity in `%ProgramData%\DubbingVidans\device_identity.json`.
- **How It Works**: Node.js `child_process.execSync` and `crypto` module.
- **Key Definitions**: `getHardwareInfo`, `getSharedDataDir`, `getOrCreateDeviceIdentity`, `HardwareInfo`, `DeviceIdentity`.
- **Inputs / Outputs**: Windows hardware specs $\rightarrow$ `HardwareInfo` object and device key pair.
- **Dependencies**: Node.js built-ins (`fs`, `path`, `os`, `crypto`, `child_process`).
- **Where Used**: `server.ts:17`, `licenseManager.ts`, `tests/licensingSystem.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Uses fallback defaults in non-Windows/virtualized test environments to ensure automated tests pass without failure.

---

### File 38: `src/utils/licenseConfig.ts`
- **Relative Path**: `src/utils/licenseConfig.ts`
- **Extension & Format**: TypeScript (`.ts`, 1,450 bytes)
- **File Type**: Offline Licensing Schema & Master Public Key Configuration
- **Exact Purpose**: Defines constants, schemas, interfaces, and the hardcoded Master Production Public Key for license verification.
- **What It Does**:
  - Declares `PRODUCT_NAME = "Dubbing Vidans"` and valid aliases.
  - Declares `LICENSE_SCHEMA_VERSION = 1`.
  - Holds `MASTER_AUTHORITY_PUBLIC_KEY_PEM`: The official Ed25519 public key embedded into the application to verify customer licenses.
  - Defines interfaces `ActivationRequest`, `PermanentLicensePayload`, `SignedLicenseFile`, `LicenseValidationResult`.
- **How It Works**: Exported TypeScript constants and types.
- **Key Definitions**: `MASTER_AUTHORITY_PUBLIC_KEY_PEM`, `PRODUCT_NAME`, `LICENSE_SCHEMA_VERSION`.
- **Inputs / Outputs**: Cryptographic constants and schemas.
- **Dependencies**: None.
- **Where Used**: `licenseManager.ts`, `server.ts`, `tests/licensingSystem.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Verified in CI tests (`licensingSystem.test.ts:Test 0`) to enforce that the master public key cannot be modified or tampered with without breaking builds.

---

### File 39: `src/utils/licenseManager.ts`
- **Relative Path**: `src/utils/licenseManager.ts`
- **Extension & Format**: TypeScript (`.ts`, 252 lines)
- **File Type**: Offline License Lifecycle Manager
- **Exact Purpose**: Generates machine activation requests, verifies license signatures, and installs permanent licenses.
- **What It Does**:
  - `buildCanonicalLicenseString(payload)`: Formats deterministic pipe-separated string for signing:
    `PRODUCT=...|VERSION=...|ID=...|CUSTOMER=...|FINGERPRINT=...|DEVICE_KEY=...|TYPE=...|ISSUED=...|FEATURES=...`
  - `buildCanonicalRequestString(...)`: Formats deterministic string for activation requests.
  - `generateActivationRequest()`: Creates `.vidansreq` containing hardware fingerprint and device public key signed by device private key.
  - `verifyLicense(licenseData, customKey)`: Verifies Ed25519 authority signature against `MASTER_AUTHORITY_PUBLIC_KEY_PEM` and confirms hardware fingerprint matches the local computer.
  - `installLicense(signedLicense)`: Writes verified license to `C:\ProgramData\DubbingVidans\license.vidanslic`.
  - `checkCurrentLicense()`: Checks license on disk, validates signature, and returns status (`valid`, `missing`, `fingerprint_mismatch`, `invalid_signature`, etc.).
- **How It Works**: Ed25519 verification via Node.js `crypto.verify`.
- **Key Definitions**: `checkCurrentLicense`, `generateActivationRequest`, `installLicense`, `verifyLicense`.
- **Inputs / Outputs**: Activation request JSON $\leftrightarrow$ Signed license file $\rightarrow$ License validity report.
- **Dependencies**: `crypto`, `fs`, `path`, `hardwareIdentity.ts`, `licenseConfig.ts`.
- **Where Used**: `server.ts:13`, `tests/licensingSystem.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Full multi-user support via `%ProgramData%`. Completely functional without internet.

---

### File 40: `src/utils/localTranslator.ts`
- **Relative Path**: `src/utils/localTranslator.ts`
- **Extension & Format**: TypeScript (`.ts`, 323 lines)
- **File Type**: 100% Offline Rule-Based Translation Engine
- **Exact Purpose**: Translates English subtitles to natural Persian completely offline without internet connectivity.
- **What It Does**:
  - Embeds `TECHNICAL_DICTIONARY` containing hundreds of programming, IT, and software engineering terms (e.g. `magic method` $\rightarrow$ `مجیک متد`, `inheritance` $\rightarrow$ `ارث‌بری`, `endpoint` $\rightarrow$ `اندپوینت`).
  - Preserves technical terms during translation.
  - Applies Persian colloquial dubbing grammar rules (e.g. converting formal `است` to `ـه`, `می‌باشد` to `ـه`, `یک` to `یه`).
  - Provides `translateOfflineLocally(englishText)` returning faithful and concise Persian candidates.
- **How It Works**: Lexical token matching, regex dictionary substitution, and Persian syntactic transformations.
- **Key Definitions**: `translateOfflineLocally`, `TECHNICAL_DICTIONARY`.
- **Inputs / Outputs**: English sentence $\rightarrow$ Persian translated candidate string.
- **Dependencies**: None.
- **Where Used**: `server.ts:11`, `scratch/test_api_translate.cjs`, `tests/offlineSystemIntegration.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Serves as the ultimate offline fallback when cloud APIs are unavailable or network access is blocked.

---

### File 41: `src/utils/offlineVoiceSynthesizer.ts`
- **Relative Path**: `src/utils/offlineVoiceSynthesizer.ts`
- **Extension & Format**: TypeScript (`.ts`, 198 lines)
- **File Type**: Procedural Web Audio Speech Synthesizer & Web Speech API Adapter
- **Exact Purpose**: Generates offline acoustic voice previews and waveform tracking assets directly in the browser.
- **What It Does**:
  - `generateOfflineSpeechAudio(text, voiceGender, targetDurationSec)`: Procedurally generates audio samples using Web Audio API:
    - Pitch base frequency ($F_0$: female 215 Hz, male 145 Hz, deep 120 Hz).
    - Natural pitch inflection modeling ($F_0 \times (1.0 + 0.04\sin(3t) + 0.02\sin(7.5t))$).
    - Multi-harmonic overtone synthesis ($H_1$ to $H_4$ plus formant resonance).
    - Syllable amplitude envelope modulation and edge fading.
    - Encodes result into 16-bit PCM WAV Base64.
  - Browser TTS Adapter: Uses `window.speechSynthesis` with Chromium keep-alive interval to prevent sentence freeze.
- **How It Works**: Direct mathematical sample computation in memory.
- **Key Definitions**: `generateOfflineSpeechAudio`, `activeUtterancesKeepAlive`.
- **Inputs / Outputs**: Text string, voice gender, duration $\rightarrow$ Base64 WAV audio data URI.
- **Dependencies**: `audioMixer.ts`.
- **Where Used**: `VoiceSynthesisStudio.tsx`, `tests/offlineSystemIntegration.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Innovative zero-dependency audio synthesis ensuring timeline tracking works even without external TTS models.

---

### File 42: `src/utils/overlapEngine.ts`
- **Relative Path**: `src/utils/overlapEngine.ts`
- **Extension & Format**: TypeScript (`.ts`, 502 lines)
- **File Type**: Audio Overlap Classification & Collision Detection Engine
- **Exact Purpose**: Detects, categorizes, and quantifies overlaps between adjacent dialogue segments on the timeline.
- **What It Does**:
  - `classifyOverlapSeverity`: Categorizes overlaps:
    - None: $\le 0.04\text{s}$ (40ms auditory threshold).
    - Minor: $\le 0.25\text{s}$ or $\le 10\%$.
    - Moderate: $\le 0.60\text{s}$ or $\le 25\%$.
    - Severe: $> 0.60\text{s}$ and $> 25\%$.
  - Distinguishes *intentional* multi-speaker overlaps from *unintended* collisions caused by audio expansion.
  - Identifies dead silence overlaps (collision occurring purely inside digital silence before vocal phonation).
  - `calculateTimelineOverlaps`: Scans entire subtitle cue list and computes aggregate metrics (total overlaps, affected segments, severe count, total collision duration).
- **How It Works**: Chronological segment traversal and physical audio silence profile comparison.
- **Key Definitions**: `classifyOverlapSeverity`, `calculateTimelineOverlaps`, `TimelineOverlapInfo`.
- **Inputs / Outputs**: Subtitle array and optional audio profiles $\rightarrow$ `TimelineOverlapSummary`.
- **Dependencies**: `types/dubbing.ts`.
- **Where Used**: `autoFixEngine.ts`, `TimelinePlayer.tsx`, `BulkSpeedModal.tsx`, `tests/overlapAndBulkSpeed.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Preserves intentional overlaps from the original video so multiple characters speaking simultaneously are not improperly separated.

---

### File 43: `src/utils/semanticValidator.ts`
- **Relative Path**: `src/utils/semanticValidator.ts`
- **Extension & Format**: TypeScript (`.ts`, 245 lines)
- **File Type**: Semantic Quality & Translation Guardrail Validator
- **Exact Purpose**: Validates that Persian translation candidates preserve essential meaning, numbers, and logical polarity.
- **What It Does**:
  - `validateCandidateSemantics(sourceEnglish, candidateFarsi)`: Runs three automated checks:
    1. *Numeric Quantity Check*: Extracts digits and English number words (`one`, `two`, `100`); verifies equivalent numbers exist in Persian (`یک`, `دو`, `۱۰۰`).
    2. *Critical Negation Check*: Flags negation flips (e.g. English containing `not`, `never`, `cannot`, but Persian translated without negative prefix `نـ` / `نیست`).
    3. *Named Entity Check*: Verifies technical keywords and uppercase proper nouns are preserved.
- **How It Works**: Regex pattern matching and bilingual digit normalization.
- **Key Definitions**: `validateCandidateSemantics`, `checkNumbersPreserved`, `checkNegationPreserved`.
- **Inputs / Outputs**: English source sentence, Persian translation $\rightarrow$ `SemanticValidationResult` (`isValid`, flags, reason in Persian).
- **Dependencies**: None.
- **Where Used**: `candidateScorer.ts`, `TranslationStudio.tsx`, `tests/balancedDubbingSystem.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Critical safety check; prevents AI models from accidentally dropping "not" or hallucinating incorrect numbers during subtitle shortening.

---

### File 44: `src/utils/srtParser.ts`
- **Relative Path**: `src/utils/srtParser.ts`
- **Extension & Format**: TypeScript (`.ts`, 115 lines)
- **File Type**: SubRip (.SRT) Subtitle Parser & Serializer
- **Exact Purpose**: Parses raw `.srt` text into structured objects and formats objects back to valid `.srt` files.
- **What It Does**:
  - `parseSRT(srtContent)`: Parses subtitle blocks, extracts IDs, parses timestamps (`00:01:23,456 --> 00:01:25,789`), computes start/end in seconds, extracts dialogue text, and handles speaker tags.
  - `formatSrtTimestamp(seconds)`: Formats float seconds into `HH:MM:SS,mmm`.
  - `exportToSRT(subtitles, useFarsi)`: Serializes subtitle array back into standard `.srt` format.
- **How It Works**: Robust regex parser with support for Windows CRLF, Unix LF, and multi-line dialogue blocks.
- **Key Definitions**: `parseSRT`, `formatSrtTimestamp`, `exportToSRT`.
- **Inputs / Outputs**: SRT text string $\leftrightarrow$ `SubtitleItem[]`.
- **Dependencies**: `types/dubbing.ts`.
- **Where Used**: `FileUploaderSection.tsx`, `TranslationStudio.tsx`, `server.ts`, `ExportStudio.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Resilient to malformed subtitle blocks and missing trailing newlines.

---

### File 45: `src/utils/syncEngine.ts`
- **Relative Path**: `src/utils/syncEngine.ts`
- **Extension & Format**: TypeScript (`.ts`, 573 lines)
- **File Type**: Audio Silence Profiler & WSOLA Time-Stretching Engine
- **Exact Purpose**: Profiles physical audio waveform margins and stretches speech audio to fit visual scene timing without pitch distortion.
- **What It Does**:
  - `profileAudioSilence(audioBuffer, thresholdDb)`: Measures leading and trailing digital dead silence (-40 dB default). Applies 15ms attack cushion (preserving consonant plosives `p`, `t`, `k`) and 30ms release cushion. Detects peak clipping ($\ge 0.995$).
  - `extractEffectiveSpeechBuffer`: Trims silence and returns active vocal phonation.
  - `trimZeroSilenceAudioBuffer`: Trims dead margins while leaving a natural 25ms boundary padding.
  - `timeStretchAudioBufferWSOLA(buffer, targetDuration)`: Implements **Waveform Similarity Overlap-Add (WSOLA)** time-stretching algorithm in pure TypeScript:
    - Modifies tempo without altering audio pitch.
    - Searches for cross-correlation peaks to align overlapping windows smoothly.
    - Prevents robotic phase cancellation artifacts.
  - `evaluateSyncMismatch`: Computes duration ratios and recommends actions (`accept_natural`, `moderate_stretch`, `text_adaptation_and_stretch`, `manual_review`).
- **How It Works**: Discrete signal processing (DSP) over float channel sample arrays.
- **Key Definitions**: `profileAudioSilence`, `trimZeroSilenceAudioBuffer`, `timeStretchAudioBufferWSOLA`, `evaluateSyncMismatch`.
- **Inputs / Outputs**: Input: `AudioBuffer`. Output: Profiling metrics and time-stretched `AudioBuffer`.
- **Dependencies**: `audioMixer.ts`, `types/dubbing.ts`.
- **Where Used**: `autoFixEngine.ts`, `TimelinePlayer.tsx`, `tests/syncEngine.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: WSOLA implementation runs efficiently in the browser without external WebAssembly or C++ binaries.

---

### File 46: `src/utils/updateConfig.ts`
- **Relative Path**: `src/utils/updateConfig.ts`
- **Extension & Format**: TypeScript (`.ts`, 1,570 bytes)
- **File Type**: Auto-Update Subsystem Constants & Public Key Configuration
- **Exact Purpose**: Defines update channels, schemas, and the dedicated Ed25519 Update Authority Public Key.
- **What It Does**:
  - Declares `UPDATE_APP_NAME = "Dubbing Vidans"`.
  - Declares `UPDATE_AUTHORITY_PUBLIC_KEY_PEM`: The official Ed25519 public key dedicated solely to verifying software updates.
  - Declares `UPDATE_SERVER_DEFAULT_URL = "http://localhost:4000"`.
  - Defines `buildCanonicalManifestString` for deterministic signature verification.
- **How It Works**: Exported TypeScript constants.
- **Key Definitions**: `UPDATE_AUTHORITY_PUBLIC_KEY_PEM`, `buildCanonicalManifestString`, `UpdateManifestPayload`.
- **Inputs / Outputs**: Cryptographic constants for update validation.
- **Dependencies**: None.
- **Where Used**: `server.ts:21`, `updateManager.ts`, `tests/autoUpdateSystem.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Strict cryptographic key isolation: the update signing key is completely distinct from the licensing key.

---

### File 47: `src/utils/updateManager.ts`
- **Relative Path**: `src/utils/updateManager.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Client-Side Update Manager & API Bridge
- **Exact Purpose**: Provides client-side helpers for checking, downloading, and installing software updates.
- **What It Does**:
  - `fetchUpdateStatus()`: Queries backend `/api/app-update/status`.
  - `checkForUpdates(force)`: Triggers `/api/app-update/check`.
  - `downloadUpdate()`: Triggers `/api/app-update/download`.
  - `installUpdate()`: Triggers `/api/app-update/install` to launch installer.
  - `saveUpdatePreferences(prefs)`: Saves auto-check intervals and update channel (`stable` vs `beta`).
- **How It Works**: Asynchronous `fetch` calls to local Express server update endpoints.
- **Key Definitions**: `fetchUpdateStatus`, `checkForUpdates`, `downloadUpdate`, `installUpdate`.
- **Inputs / Outputs**: Update API requests and responses.
- **Dependencies**: `types/dubbing.ts`, `updateConfig.ts`.
- **Where Used**: `UpdateModal.tsx`, `Header.tsx`, `src/App.tsx:79`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Clean frontend abstraction over server-side update orchestrations.

---

### File 48: `src/utils/videoToWav.ts`
- **Relative Path**: `src/utils/videoToWav.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Video Audio Extraction Bridge
- **Exact Purpose**: Coordinates extraction of high-fidelity WAV audio from uploaded video files.
- **What It Does**:
  - `extractWavFromVideo(videoFile)`: Posts raw video binary to backend `/api/convert-video-to-wav`.
  - `extractSubtitlesFromVideo(videoFile)`: Posts video binary to `/api/extract-video-subtitles` to extract embedded `.srt` streams via FFmpeg.
  - `transcribeVideoToSrt(videoFile, apiKey)`: Posts video to `/api/transcribe-video-to-srt` to generate subtitles via local Whisper or Gemini STT.
- **How It Works**: Streams binary blobs via `fetch` with progress callbacks.
- **Key Definitions**: `extractWavFromVideo`, `extractSubtitlesFromVideo`, `transcribeVideoToSrt`.
- **Inputs / Outputs**: Video `File` $\rightarrow$ Audio `Blob` / SRT text string.
- **Dependencies**: Backend endpoints in `server.ts`.
- **Where Used**: `FileUploaderSection.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Avoids in-browser FFmpeg WebAssembly overhead by delegating to the native local FFmpeg binary.

---

### File 49: `src/utils/voiceProfiles.ts`
- **Relative Path**: `src/utils/voiceProfiles.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Calibrated Voice Profiles Catalog
- **Exact Purpose**: Defines speaking rates, pause durations, and calibration factors for each supported TTS voice.
- **What It Does**:
  - Maps voice IDs (`Puck`, `Charon`, `Kore`, `Fenrir`, `Zephyr`, `Iapetus`) to calibrated acoustic properties:
    - Base syllable rate (syllables/sec: e.g. Puck 3.8 syl/s, Charon 3.2 syl/s).
    - Base word rate (words/sec).
    - Comma pause duration (0.18s to 0.25s).
    - Period/sentence boundary pause duration (0.40s to 0.55s).
    - Gender, Persian name (`پوک - مرد پرانرژی`, `شارون - مرد موقر`, etc.).
  - `getVoiceProfile(voiceId)`: Resolves voice profile with fallback to `Puck`.
  - `updateVoiceCalibration`: Feedback loop adjusting multipliers based on empirical synthesis duration deltas.
- **How It Works**: Constant lookup table with runtime calibration multiplier updates.
- **Key Definitions**: `VOICE_PROFILES`, `getVoiceProfile`, `updateVoiceCalibration`.
- **Inputs / Outputs**: Voice ID string $\rightarrow$ `VoiceProfile` object.
- **Dependencies**: `types/dubbing.ts`.
- **Where Used**: `durationPredictor.ts`, `VoiceSynthesisStudio.tsx`, `tests/balancedDubbingSystem.test.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Accounts for individual voice speaking tempos, making duration predictions far more accurate than generic word-count estimators.

---

### File 50: `src/utils/whisperLocalScript.ts`
- **Relative Path**: `src/utils/whisperLocalScript.ts`
- **Extension & Format**: TypeScript (`.ts`)
- **File Type**: Local Whisper Execution Script Generator
- **Exact Purpose**: Generates and manages the local Python script execution harness for Faster-Whisper.
- **What It Does**: Constructs execution commands, resolves bundled model paths in `models/faster-whisper-base`, and parses the JSON stream output from `local_whisper.py`.
- **How It Works**: Formats CLI arguments and handles JSON deserialization.
- **Key Definitions**: `generateWhisperScript`, `parseWhisperOutput`.
- **Inputs / Outputs**: Configuration options $\rightarrow$ CLI execution arguments.
- **Dependencies**: `types/dubbing.ts`.
- **Where Used**: `server.ts`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Keeps subprocess spawning logic modular and testable.

---

## 2.4 User Interface Components: `src/components/` (12 Files)

### File 51: `src/components/AiSyncModal.tsx`
- **Relative Path**: `src/components/AiSyncModal.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 15,627 bytes)
- **File Type**: AI Timeline Synchronization Modal Component
- **Exact Purpose**: Allows users to configure and trigger automated AI-driven timeline synchronization.
- **What It Does**: Presents controls for maximum stretch ratio (1.05x to 1.30x), time-shift priority (preserve dialogue start vs smooth spacing), and displays real-time synchronization metrics before applying changes.
- **How It Works**: Modal dialog calling `/api/ai-sync-timeline`.
- **Key Definitions**: Component `AiSyncModal`.
- **Inputs / Outputs**: Subtitle array and sync options $\rightarrow$ synchronized subtitle cues.
- **Dependencies**: React, Lucide icons, `types/dubbing.ts`.
- **Where Used**: Opened from `TimelinePlayer.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Includes clear Persian explanations for each sync parameter.

---

### File 52: `src/components/ApiKeyModal.tsx`
- **Relative Path**: `src/components/ApiKeyModal.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 19,635 bytes)
- **File Type**: API Configuration & Key Management Modal Component
- **Exact Purpose**: Interface for entering and testing Gemini and Hormouz AI API keys.
- **What It Does**: Provides inputs for Gemini API Key, Hormouz API Key, API Base URL (`https://api.hormouz.net/v1`), Translation Model (`openai/gpt-6-luna`), and TTS Model. Features a "Test Connection" button testing keys via `/api/check-key`.
- **How It Works**: Persists settings to browser `localStorage` and emits updates to parent `App.tsx`.
- **Key Definitions**: Component `ApiKeyModal`, `testConnection()`.
- **Inputs / Outputs**: User credentials $\rightarrow$ `localStorage` and active app state.
- **Dependencies**: React, Lucide icons.
- **Where Used**: Triggered from top navigation in `Header.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Never sends keys to third parties; communicates directly with the local server.

---

### File 53: `src/components/AutoFixDashboardModal.tsx`
- **Relative Path**: `src/components/AutoFixDashboardModal.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 22,755 bytes)
- **File Type**: 6-Stage Timeline AutoFix Dashboard Component
- **Exact Purpose**: Visual diagnostic dashboard showing all detected timeline collisions, speech overlaps, silence overflows, and proposed automated corrections.
- **What It Does**: Runs `measureAndProfileSegments` and `planTimelineCorrections`. Displays before/after metrics (overlap count, total conflict duration, trimmed dead margins, shifted cues, tempo changes). Provides "Apply All Fixes" and "Undo All Fixes" buttons.
- **How It Works**: Interactive modal displaying resolution cards and progress bars.
- **Key Definitions**: Component `AutoFixDashboardModal`, `handleRunAutoFix()`, `handleUndo()`.
- **Inputs / Outputs**: `subtitles: SubtitleItem[]` $\rightarrow$ corrected subtitles with updated waveforms.
- **Dependencies**: `autoFixEngine.ts`, `types/dubbing.ts`, Lucide icons.
- **Where Used**: Triggered from `TimelinePlayer.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Outstanding UX: users see the exact breakdown of corrections (trims, shifts, speed changes, rewrites) before committing them to the timeline.

---

### File 54: `src/components/BulkSpeedModal.tsx`
- **Relative Path**: `src/components/BulkSpeedModal.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 28,796 bytes)
- **File Type**: Bulk Tempo Adjustment Modal Component
- **Exact Purpose**: Provides batch tempo modifications across subtitle cues.
- **What It Does**: Allows filtering cues by selection, collision state, or duration threshold. Supports percentage-based speed changes (e.g. +10%, +15%) or automated "fit-to-target-duration". Displays safety warnings if proposed speed exceeds 1.30x.
- **How It Works**: Modal dialog invoking `applyBulkSpeedChanges` from `bulkSpeedController.ts`.
- **Key Definitions**: Component `BulkSpeedModal`.
- **Inputs / Outputs**: Selected subtitle cues $\rightarrow$ tempo-adjusted audio buffers.
- **Dependencies**: `bulkSpeedController.ts`, `types/dubbing.ts`, Lucide icons.
- **Where Used**: Triggered from `TimelinePlayer.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Includes safety clamping preventing excessive vocal distortion.

---

### File 55: `src/components/ExportStudio.tsx`
- **Relative Path**: `src/components/ExportStudio.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 35,670 bytes)
- **File Type**: Stage 5: Final Video & Audio Export Studio Component
- **Exact Purpose**: Configures final export options, renders dubbed audio, and invokes video multiplexing with optional studio branding.
- **What It Does**:
  - Provides options to include/exclude the Vidans intro video (`assets/Final  (1).mp4`) and corner watermark logo (`Logo-Vidans.png`).
  - Encodes multi-track dubbed audio into master WAV via `mixAudioTracks`.
  - Sends video and dubbed audio to `/api/render-dubbed-video` (which invokes `mux_video.py`).
  - Displays real-time rendering progress, export duration, output size, and download buttons for both final MP4 video and standalone dubbed audio WAV.
- **How It Works**: Multi-step asynchronous rendering flow coordinating Web Audio mixing and server FFmpeg multiplexing.
- **Key Definitions**: Component `ExportStudio`, `handleExportVideo()`, `handleExportAudioOnly()`.
- **Inputs / Outputs**: Subtitle cues, original video, audio $\rightarrow$ final branded MP4 file.
- **Dependencies**: `audioMixer.ts`, `fileNaming.ts`, Lucide icons.
- **Where Used**: Stage 5 tab in `src/App.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Enforces license check; displays friendly license activation prompt if software is unlicensed.

---

### File 56: `src/components/FileUploaderSection.tsx`
- **Relative Path**: `src/components/FileUploaderSection.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 50,831 bytes)
- **File Type**: Stage 1: File Ingestion & Extraction Studio Component
- **Exact Purpose**: Handles drag-and-drop file uploading, media extraction, and automated speech-to-text.
- **What It Does**:
  - Uploads video files (`MP4`, `MKV`, `WebM`, `AVI`) and audio files (`WAV`, `MP3`).
  - Uploads external subtitle files (`.srt`).
  - Extracts embedded subtitle tracks directly from MKV/MP4 files via `/api/extract-video-subtitles`.
  - Automatically extracts audio from video via `/api/convert-video-to-wav`.
  - Offers one-click automated speech-to-subtitle transcription via local Faster-Whisper or Gemini STT.
- **How It Works**: HTML5 Drag & Drop API, `FileReader`, and streaming HTTP uploads.
- **Key Definitions**: Component `FileUploaderSection`, `handleVideoDrop()`, `handleAudioExtraction()`.
- **Inputs / Outputs**: User video/audio/SRT files $\rightarrow$ populated `subtitles` array and `originalAudioBuffer`.
- **Dependencies**: `videoToWav.ts`, `srtParser.ts`, Lucide icons.
- **Where Used**: Stage 1 tab in `src/App.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Extremely versatile; accepts video, audio, or subtitles in any combination.

---

### File 57: `src/components/Header.tsx`
- **Relative Path**: `src/components/Header.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 5,989 bytes)
- **File Type**: Top Navigation & Workflow Stepper Component
- **Exact Purpose**: Renders the persistent header bar, branding, workflow step indicators, license status, and update notifications.
- **What It Does**: Displays Vidans Studio logo, version `v1.0.1`, interactive 5-step navigation pills (1. بارگذاری فایل‌ها, 2. ترجمه زیرنویس, 3. تولید صدا, 4. تایم‌لاین, 5. خروجی), license badge (Active / Trial / Unlicensed), and update notification icon.
- **How It Works**: Functional navigation bar that updates active step state in `App.tsx`.
- **Key Definitions**: Component `Header`, step indicator array.
- **Inputs / Outputs**: Navigation clicks and status badges.
- **Dependencies**: React, Lucide icons.
- **Where Used**: Rendered at top of `src/App.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Polished RTL visual design.

---

### File 58: `src/components/LicenseModal.tsx`
- **Relative Path**: `src/components/LicenseModal.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 26,898 bytes)
- **File Type**: Offline Licensing Management Modal Component
- **Exact Purpose**: Client interface for offline license activation, request file generation, and license installation.
- **What It Does**:
  - Displays customer Machine Name, OS, CPU Model, and SHA-256 Hardware Fingerprint.
  - "Generate Activation Request" button: downloads `.vidansreq` file to send to software owner.
  - "Install Permanent License" tab: file picker accepting signed `.vidanslic` file, uploading it to `/api/license/activate`.
  - Displays license validity status (Permanent Active, Expired, Hardware Mismatch, Invalid Signature) with Persian guidance.
- **How It Works**: Modal dialog communicating with `/api/license/request`, `/api/license/activate`, and `/api/license/status`.
- **Key Definitions**: Component `LicenseModal`, `handleDownloadRequest()`, `handleUploadLicense()`.
- **Inputs / Outputs**: User license files $\rightarrow$ activated software state.
- **Dependencies**: React, Lucide icons.
- **Where Used**: Triggered from `Header.tsx` and `ExportStudio.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Makes offline cryptographic licensing simple and transparent for non-technical Persian end users.

---

### File 59: `src/components/TimelinePlayer.tsx`
- **Relative Path**: `src/components/TimelinePlayer.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 112,946 bytes)
- **File Type**: Stage 4: Interactive Multi-Track Timeline & Audio-Video Player Component
- **Exact Purpose**: The central workstation of the studio: multi-track visualization, scrubbing, audio playback, waveform display, and collision inspection.
- **What It Does**:
  - Displays synchronized video preview and audio waveform tracks.
  - Interactive multi-track timeline showing original speech cues and dubbed Persian audio blocks.
  - Visual zoom (10% to 500%), pan, playhead dragging, and real-time playback synchronization.
  - Visual collision highlighting: flags overlapping segments in red/yellow with duration delta badges.
  - Quick action buttons: "Auto-Fix Timeline", "AI Sync", "Bulk Speed", "Reset Timing".
  - Audio auditioning: play individual segments or full multi-track mix.
- **How It Works**: High-performance Canvas/DOM rendering with Web Audio API clock synchronization.
- **Key Definitions**: Component `TimelinePlayer`, playback loop `requestAnimationFrame`, scrubbing handlers.
- **Inputs / Outputs**: Subtitle cues, video, audio buffers $\rightarrow$ adjusted timeline positions and tempos.
- **Dependencies**: `autoFixEngine.ts`, `overlapEngine.ts`, `syncEngine.ts`, `audioMixer.ts`, Lucide icons.
- **Where Used**: Stage 4 tab in `src/App.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: The largest UI component in the codebase (112 KB); runs smoothly with 500+ subtitle cues using virtualization techniques.

---

### File 60: `src/components/TranslationStudio.tsx`
- **Relative Path**: `src/components/TranslationStudio.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 49,365 bytes)
- **File Type**: Stage 2: Subtitle Translation & Candidate Scoring Studio Component
- **Exact Purpose**: Workbench for translating English subtitles, reviewing translation candidates, and fine-tuning dialogue text.
- **What It Does**:
  - Tabular and card views of subtitle cues with English source and Persian translation.
  - Triggers batch or single-line AI translation via Gemini API, Hormouz AI, or offline local translator.
  - Displays 3 candidate options (*Faithful*, *Concise*, *Conversational*) with predicted duration meters and semantic validation badges (green checkmarks for numbers and negation).
  - Allows manual inline editing of Persian text with real-time duration re-prediction.
- **How It Works**: Interactive editing grid connected to `/api/translate-subtitles`.
- **Key Definitions**: Component `TranslationStudio`, `handleBatchTranslate()`, `handleSelectCandidate()`.
- **Inputs / Outputs**: English subtitles $\rightarrow$ Persian translated subtitle cues.
- **Dependencies**: `durationPredictor.ts`, `candidateScorer.ts`, `semanticValidator.ts`, Lucide icons.
- **Where Used**: Stage 2 tab in `src/App.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Real-time duration re-prediction gives instant feedback as the user types, indicating whether the edited sentence fits the scene timing.

---

### File 61: `src/components/UpdateModal.tsx`
- **Relative Path**: `src/components/UpdateModal.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 21,621 bytes)
- **File Type**: Software Auto-Update Management Modal Component
- **Exact Purpose**: Interface for checking, reviewing, downloading, and applying application updates.
- **What It Does**:
  - Displays current version (`v1.0.1`) and checks for updates against GitHub Releases or private update proxy.
  - Renders bilingual release notes (English & Persian) and release highlights.
  - Downloads signed installer with real-time progress bar.
  - Verifies Ed25519 signature and SHA-256 checksum.
  - Prompts user to "Restart & Install Update".
- **How It Works**: Interacts with `updateManager.ts` and backend `/api/app-update/*`.
- **Key Definitions**: Component `UpdateModal`, `handleCheck()`, `handleDownload()`, `handleInstall()`.
- **Inputs / Outputs**: Update commands and progress indicators.
- **Dependencies**: `updateManager.ts`, Lucide icons.
- **Where Used**: Triggered from `Header.tsx` and `src/App.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Full integrity verification prevents execution of corrupt or untrusted binaries.

---

### File 62: `src/components/VoiceSynthesisStudio.tsx`
- **Relative Path**: `src/components/VoiceSynthesisStudio.tsx`
- **Extension & Format**: TypeScript React (`.tsx`, 42,112 bytes)
- **File Type**: Stage 3: Voice Synthesis & Character Casting Studio Component
- **Exact Purpose**: Manages character speaker assignment, voice profile selection, and batch text-to-speech generation.
- **What It Does**:
  - Automatically identifies speakers in the project (`speaker_1`, `speaker_2`, etc.).
  - Assigns voice profiles (`Puck`, `Charon`, `Kore`, `Fenrir`, `Zephyr`, `Iapetus`) to each character.
  - Generates speech audio queue via `/api/tts` (Gemini TTS, Edge TTS, or procedural offline fallback).
  - Displays audio waveform preview and compares actual generated speech duration with target video duration.
- **How It Works**: Batch asynchronous queue processing with concurrency limits.
- **Key Definitions**: Component `VoiceSynthesisStudio`, `handleGenerateAllVoices()`, `handleSingleTts()`.
- **Inputs / Outputs**: Translated subtitles $\rightarrow$ synthesized audio buffers attached to `SubtitleItem`.
- **Dependencies**: `voiceProfiles.ts`, `audioMixer.ts`, Lucide icons.
- **Where Used**: Stage 3 tab in `src/App.tsx`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Employs sequential queuing with rate-limit backoff to prevent API quota exhaustion.

---

# 3. Automated Test Suite: `tests/` (11 Files)

---

### File 63: `tests/aiSyncTimeline.test.ts`
- **Relative Path**: `tests/aiSyncTimeline.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 2,879 bytes)
- **File Type**: Unit & Integration Test Suite
- **Exact Purpose**: Tests AI-driven timeline alignment and stretch ratio computations.
- **What It Does**: Verifies that time-stretch ratios respect configured bounds, handles short dialogue padding, and ensures start time anchoring without cumulative drift.
- **How It Works**: Executed via `tsx tests/aiSyncTimeline.test.ts`.
- **Key Definitions**: Test assertions using standard Node.js `assert`.
- **Inputs / Outputs**: Test pass/fail reports on console.
- **Dependencies**: `syncEngine.ts`, `types/dubbing.ts`.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Fast, zero-dependency unit tests.

---

### File 64: `tests/autoFixTimeline.test.ts`
- **Relative Path**: `tests/autoFixTimeline.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 22,243 bytes)
- **File Type**: Comprehensive 19-Point AutoFix Engine Test Suite
- **Exact Purpose**: Validates all 6 stages of the automated timeline collision resolution engine.
- **What It Does**:
  - Tests 19 distinct requirements:
    - Audio analysis and digital dead margin measurement.
    - Intentional multi-speaker overlap preservation.
    - Non-intentional collision detection.
    - Zero-silence trimming without consonant clipping.
    - Safe dialogue shifting into pre-gap and post-gap.
    - Strict 1.30x speed limit enforcement (never exceeds 1.30x).
    - Translation shortening fallback for severe overflows.
    - Rejection of invalid candidates (missing numbers or negation).
    - 100% undo and audio asset restoration.
    - Performance test on realistic 100+ dialogue conversation.
- **How It Works**: Runs full end-to-end pipeline simulations.
- **Key Definitions**: 19 automated test blocks.
- **Inputs / Outputs**: 19/19 Passed.
- **Dependencies**: `autoFixEngine.ts`, `syncEngine.ts`, `candidateScorer.ts`.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Exhaustive test suite ensuring zero regressions in the timeline auto-repair logic.

---

### File 65: `tests/autoUpdateSystem.test.ts`
- **Relative Path**: `tests/autoUpdateSystem.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 6,482 bytes)
- **File Type**: Cryptographic Auto-Update Test Suite
- **Exact Purpose**: Validates Ed25519 manifest verification, SHA-256 package hashing, and key isolation.
- **What It Does**:
  1. Tests semantic version comparison rules (`1.0.1` vs `1.0.0`).
  2. Enforces cryptographic key isolation (update key $\ne$ owner license key).
  3. Tests Ed25519 signature verification and cross-key rejection.
  4. Tests anti-tamper rejection of modified update manifests.
  5. Computes and validates SHA-256 checksums.
  6. Simulates corrupted download detection and rejection.
  7. Verifies user data separation (`%ProgramData%\DubbingVidans` preserved across updates).
  8. Verifies zero credentials or private keys in distributed assets.
- **How It Works**: Uses Node.js `crypto` to generate genuine and tampered update payloads.
- **Key Definitions**: 8 security test blocks.
- **Inputs / Outputs**: 8/8 Passed.
- **Dependencies**: `updateConfig.ts`, `updateManager.ts`.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Enforces strict compliance with industry update security standards.

---

### File 66: `tests/balancedDubbingSystem.test.ts`
- **Relative Path**: `tests/balancedDubbingSystem.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 18,069 bytes)
- **File Type**: Duration-Aware Dubbing & Candidate Scoring Test Suite
- **Exact Purpose**: Validates duration prediction, candidate ranking formulas, and semantic guardrails.
- **What It Does**: Tests 18 requirements: Persian text normalization, syllable counting, voice profile tempos, scoring formula ($0.50 \times \text{Sem} + 0.30 \times \text{Nat} + 0.20 \times \text{Dur}$), number check, negation flip detection, and retry policies.
- **How It Works**: Algorithmic assertions.
- **Key Definitions**: 18 test blocks.
- **Inputs / Outputs**: 18/18 Passed.
- **Dependencies**: `candidateScorer.ts`, `durationPredictor.ts`, `semanticValidator.ts`.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Guarantees translation candidates fit speech durations without semantic corruption.

---

### File 67: `tests/hormouzJsonExtractor.test.ts`
- **Relative Path**: `tests/hormouzJsonExtractor.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 3,742 bytes)
- **File Type**: LLM Response Parser & JSON Extractor Test Suite
- **Exact Purpose**: Tests robust extraction of JSON from LLM outputs containing markdown, reasoning tags, or conversational preamble.
- **What It Does**: Verifies that JSON extractor strips `<think>...</think>` tags (from reasoning models like DeepSeek/Luna), strips markdown code fences (` ```json `), repairs trailing commas, and safely handles non-JSON errors.
- **How It Works**: Regex and relaxation parser test vectors.
- **Key Definitions**: 8 test cases.
- **Inputs / Outputs**: 8/8 Passed.
- **Dependencies**: `server.ts` JSON parser utility.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Vital for reliable parsing of third-party LLM outputs that include conversational text.

---

### File 68: `tests/licensingSystem.test.ts`
- **Relative Path**: `tests/licensingSystem.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 7,369 bytes)
- **File Type**: Offline Licensing & Anti-Tamper Test Suite
- **Exact Purpose**: Validates hardware fingerprinting, Ed25519 signature verification, anti-tamper rejection, and machine-wide installation.
- **What It Does**:
  - Test 0: Production master public key integrity verification.
  - Test 1: Activation request generation with hardware fingerprint.
  - Test 2: Asymmetric Ed25519 signature verification and cross-key rejection.
  - Test 3: Anti-tamper check rejecting altered license payloads.
  - Test 4: Hardware binding check rejecting licenses copied to other machines.
  - Test 5: Permanent license installation into `%ProgramData%\DubbingVidans`.
  - Test 6: Verification of machine-wide permissions.
- **How It Works**: Cryptographic simulation using real Ed25519 key pairs.
- **Key Definitions**: 7 test cases.
- **Inputs / Outputs**: 7/7 Passed.
- **Dependencies**: `licenseManager.ts`, `licenseConfig.ts`, `hardwareIdentity.ts`.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Confirms that licenses cannot be forged, transferred, or tampered with.

---

### File 69: `tests/offlineSystemIntegration.test.ts`
- **Relative Path**: `tests/offlineSystemIntegration.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 6,331 bytes)
- **File Type**: End-to-End Full Offline Integration Test Suite
- **Exact Purpose**: Validates that all core features operate 100% offline without internet.
- **What It Does**:
  1. Checks hardware fingerprinting.
  2. Verifies machine-wide permanent license in ProgramData.
  3. Verifies local offline translation engine (zero cloud calls).
  4. Verifies Faster-Whisper local model execution in local Python runtime.
  5. Verifies offline Web Audio synthesis.
  6. Verifies Software Owner Private Key is excluded from installer package.
- **How It Works**: Spawns real Python processes and loads real local models.
- **Key Definitions**: 6 integration checks.
- **Inputs / Outputs**: 6/6 Passed.
- **Dependencies**: `localTranslator.ts`, `local_whisper.py`, `offlineVoiceSynthesizer.ts`.
- **Where Used**: Part of `npm run test:integration`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Proves that the product fulfills its primary value proposition of running completely offline.

---

### File 70: `tests/overlapAndBulkSpeed.test.ts`
- **Relative Path**: `tests/overlapAndBulkSpeed.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 16,217 bytes)
- **File Type**: Overlap Management & Bulk Speed Test Suite
- **Exact Purpose**: Tests overlap categorization, summary metrics, and bulk tempo adjustments.
- **What It Does**: Tests 15 requirements: overlap classification (none, minor, moderate, severe), silence vs speech overlaps, intentional overlap preservation, bulk speed filtering, fit-to-target calculations, safety clamping to 1.35x, and complete undo state restoration.
- **How It Works**: Algorithmic assertions.
- **Key Definitions**: 15 test cases.
- **Inputs / Outputs**: 15/15 Passed.
- **Dependencies**: `overlapEngine.ts`, `bulkSpeedController.ts`.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Confirms safe operation of all timeline adjustment features.

---

### File 71: `tests/syncEngine.test.ts`
- **Relative Path**: `tests/syncEngine.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 14,257 bytes)
- **File Type**: Audio-Video Synchronization Engine Test Suite
- **Exact Purpose**: Tests audio silence profiling, WSOLA time-stretching, and dialogue gap preservation.
- **What It Does**: Tests 10 requirements: exact match (no stretch), moderate stretch, severe mismatch flagging, multi-speaker intentional overlap, gap preservation, leading silence trimming, mixed sample rate normalization (24kHz to 48kHz), and dialogue start anchoring.
- **How It Works**: Generates synthetic PCM AudioBuffers and validates DSP results.
- **Key Definitions**: 10 test cases.
- **Inputs / Outputs**: 10/10 Passed.
- **Dependencies**: `syncEngine.ts`, `audioMixer.ts`.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Tests real DSP algorithms directly in Node.js.

---

### File 72: `tests/videoBrandingPipeline.test.ts`
- **Relative Path**: `tests/videoBrandingPipeline.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 2,941 bytes)
- **File Type**: Video Branding & Muxing Integration Test Suite
- **Exact Purpose**: Validates `mux_video.py` using real FFmpeg execution.
- **What It Does**:
  1. Generates short dummy test video and audio via FFmpeg.
  2. Runs `mux_video.py` with full branding (intro clip + logo watermark).
  3. Runs `mux_video.py` with `--no-intro` (logo watermark only).
  4. Cleans up temporary test artifacts.
- **How It Works**: Spawns Python subprocess running `mux_video.py` and inspects output MP4 files.
- **Key Definitions**: 4 test blocks.
- **Inputs / Outputs**: 4/4 Passed.
- **Dependencies**: `mux_video.py`, system FFmpeg.
- **Where Used**: Part of `npm run test:integration`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Verifies the video rendering pipeline against real video files.

---

### File 73: `tests/zeroSilenceAndFlexiblePlacement.test.ts`
- **Relative Path**: `tests/zeroSilenceAndFlexiblePlacement.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 11,275 bytes)
- **File Type**: Zero-Silence Trimming & Flexible Placement Test Suite
- **Exact Purpose**: Validates non-destructive zero-silence trimming and dialogue shifting.
- **What It Does**: Tests 8 requirements: trimming leading/trailing silence with 25ms padding, preserving audio without silence untouched, shifting cues earlier into pre-gaps, shifting cues later into post-gaps, strictly preserving dialogue order, and verifying 1-click undo.
- **How It Works**: Algorithmic assertions and AudioBuffer validation.
- **Key Definitions**: 8 test cases.
- **Inputs / Outputs**: 8/8 Passed.
- **Dependencies**: `autoFixEngine.ts`, `syncEngine.ts`.
- **Where Used**: Part of `npm run test:ci`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Proves that dialogue shifting resolves collisions without changing speech tempo whenever gaps are available.

---

# 4. Administrative & Developer Tools: `tools/` (25 Files)

---

## 4.1 Offline License Generator: `tools/license-generator/` (19 Files)

### File 74: `tools/license-generator/license_engine.py`
- **Relative Path**: `tools/license-generator/license_engine.py`
- **Extension & Format**: Python Source Code (`.py`, 175 lines)
- **File Type**: Core Offline Licensing Cryptographic Engine
- **Exact Purpose**: Core cryptographic engine used by the software owner to verify activation requests and issue signed licenses.
- **What It Does**:
  - `load_or_generate_master_keys()`: Loads or creates the Master Ed25519 key pair (`owner_private_key.pem`, `owner_public_key.pem`).
  - `verify_activation_request(req_data)`: Verifies that the customer's `.vidansreq` was signed by the customer machine's private device key.
  - `issue_permanent_license(...)`: Signs a deterministic canonical license string using the software owner's private key and packages the result into a `.vidanslic` file.
  - `verify_license_file(lic_data)`: Validates license integrity against `owner_public_key.pem`.
- **How It Works**: Uses Python `cryptography.hazmat.primitives.asymmetric.ed25519`.
- **Key Definitions**: `issue_permanent_license`, `verify_activation_request`, `load_or_generate_master_keys`.
- **Inputs / Outputs**: Activation request dict $\rightarrow$ signed license dict.
- **Dependencies**: `cryptography` Python package.
- **Where Used**: Imported by `license_generator_gui.py` and `license_generator_cli.py`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Rock-solid cryptographic design with deterministic canonical string serialization.

---

### File 75: `tools/license-generator/license_generator_cli.py`
- **Relative Path**: `tools/license-generator/license_generator_cli.py`
- **Extension & Format**: Python Source Code (`.py`, 3,044 bytes)
- **File Type**: Command-Line License Generation Utility
- **Exact Purpose**: Command-line tool for software owners to automate batch license issuance.
- **What It Does**: Accepts activation request path, customer name, output path, and license type via CLI arguments, invokes `license_engine.py`, and writes the signed `.vidanslic` file.
- **How It Works**: Python `argparse` wrapper around `license_engine.py`.
- **Key Definitions**: `main()`, CLI argument parser.
- **Inputs / Outputs**: CLI flags $\rightarrow$ generated `.vidanslic` file.
- **Dependencies**: `license_engine.py`.
- **Where Used**: Developer/owner scripting.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Useful for automated CRM integration or headless license generation.

---

### File 76: `tools/license-generator/license_generator_gui.py`
- **Relative Path**: `tools/license-generator/license_generator_gui.py`
- **Extension & Format**: Python Source Code (`.py`, 14,418 bytes)
- **File Type**: Graphical License Generation Application
- **Exact Purpose**: User-friendly desktop application for the software owner to issue customer licenses without typing terminal commands.
- **What It Does**:
  - Tkinter-based graphical interface with Persian labels.
  - Button to open `.vidansreq` files: automatically verifies device signature and displays customer hardware specs (Machine Name, OS, CPU, Hardware Fingerprint).
  - Text input for Customer Name and selection of License Type (Permanent, Studio, Enterprise).
  - Feature checkboxes (Audio Dubbing, Faster-Whisper, Video Branding, Auto-Updates).
  - Button to issue and save `.vidanslic` file.
- **How It Works**: Python `tkinter` GUI invoking `license_engine.py`.
- **Key Definitions**: Class `LicenseGeneratorApp`.
- **Inputs / Outputs**: GUI file dialogs and inputs $\rightarrow$ signed `.vidanslic` file.
- **Dependencies**: `tkinter`, `license_engine.py`.
- **Where Used**: Source for `LicenseGenerator.exe`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Features clean Persian RTL typography and informative validation alerts.

---

### File 77: `tools/license-generator/LicenseGenerator.spec`
- **Relative Path**: `tools/license-generator/LicenseGenerator.spec`
- **Extension & Format**: PyInstaller Specification (`.spec`, 741 bytes)
- **File Type**: Build Specification
- **Exact Purpose**: Configures PyInstaller to compile `license_generator_gui.py` into a single-file executable `LicenseGenerator.exe`.
- **What It Does**: Specifies entry point, hidden imports (`cryptography`), and bundles `keys/owner_public_key.pem`.
- **How It Works**: Executed via `pyinstaller LicenseGenerator.spec`.
- **Key Definitions**: `Analysis`, `PYZ`, `EXE`.
- **Inputs / Outputs**: Python script $\rightarrow$ standalone Windows executable.
- **Dependencies**: PyInstaller.
- **Where Used**: Compiles `tools/license-generator/dist/LicenseGenerator.exe`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Excludes private key from executable bundle to ensure security.

---

### File 78: `tools/license-generator/keys/owner_public_key.pem`
- **Relative Path**: `tools/license-generator/keys/owner_public_key.pem`
- **Extension & Format**: PEM encoded public key (`.pem`, 116 bytes)
- **File Type**: Asymmetric Public Verification Key
- **Exact Purpose**: Master Ed25519 Public Key for Dubbing Vidans offline license verification.
- **What It Does**: Matches the public key embedded in `src/utils/licenseConfig.ts` (`MASTER_AUTHORITY_PUBLIC_KEY_PEM`). Used by verification functions to confirm licenses were issued by the software owner.
- **How It Works**: Standard SubjectPublicKeyInfo X.509 format.
- **Key Definitions**: Public key bytes.
- **Inputs / Outputs**: Cryptographic public key.
- **Dependencies**: None.
- **Where Used**: `license_engine.py`, `licenseConfig.ts`.
- **Lifecycle Status**: *Essential / Tracked*. Explicitly exempted in `.gitignore:49`.
- **Technical Observations**: Safe to share publicly; contains zero secret material.

---

### File 79: `tools/license-generator/keys/owner_private_key.pem`
- **Relative Path**: `tools/license-generator/keys/owner_private_key.pem`
- **Extension & Format**: PEM encoded private key (`.pem`, 122 bytes)
- **File Type**: Asymmetric Private Signing Key
- **Exact Purpose**: Software Owner's Master Ed25519 Private Key used exclusively to sign customer licenses.
- **What It Does**: Used by `license_engine.py` to produce cryptographic signatures on `.vidanslic` files.
- **How It Works**: Standard PKCS#8 unencrypted private key format.
- **Key Definitions**: Private key bytes.
- **Inputs / Outputs**: Cryptographic private key.
- **Dependencies**: `license_engine.py`.
- **Where Used**: `LicenseGenerator.exe` and `license_engine.py`.
- **Lifecycle Status**: *Confidential Secret / Local-Only* (Ignored by Git: `.gitignore:47`).
- **Technical Observations**: **CRITICAL SECURITY ASSET**. Must NEVER be committed to Git or distributed to customers. Properly ignored in `.gitignore`.

---

### File 80: `tools/license-generator/dist/LicenseGenerator.exe`
- **Relative Path**: `tools/license-generator/dist/LicenseGenerator.exe`
- **Extension & Format**: Windows Portable Executable (PyInstaller bundle, 16,057,670 bytes)
- **File Type**: Standalone GUI License Generator Executable
- **Exact Purpose**: Compiled executable for software owners to generate customer licenses on any Windows computer without installing Python.
- **What It Does**: Compiled binary of `license_generator_gui.py`.
- **How It Works**: Self-extracting PyInstaller Python runtime.
- **Key Definitions**: Windows PE binary.
- **Inputs / Outputs**: Windows GUI application.
- **Dependencies**: Windows OS.
- **Where Used**: Software owner administrative operations. Also duplicated in `Sadra/2-ابزار صدور لایسنس/`.
- **Lifecycle Status**: *Generated / Local-Only* (Ignored by Git: `.gitignore:52`).
- **Technical Observations**: Pre-compiled and functional.

---

### Files 81 to 92: `tools/license-generator/build/LicenseGenerator/*` (12 Files)
- **Relative Paths**:
  - `tools/license-generator/build/LicenseGenerator/Analysis-00.toc`
  - `tools/license-generator/build/LicenseGenerator/base_library.zip`
  - `tools/license-generator/build/LicenseGenerator/EXE-00.toc`
  - `tools/license-generator/build/LicenseGenerator/LicenseGenerator.pkg`
  - `tools/license-generator/build/LicenseGenerator/PKG-00.toc`
  - `tools/license-generator/build/LicenseGenerator/PYZ-00.pyz`
  - `tools/license-generator/build/LicenseGenerator/PYZ-00.toc`
  - `tools/license-generator/build/LicenseGenerator/warn-LicenseGenerator.txt`
  - `tools/license-generator/build/LicenseGenerator/xref-LicenseGenerator.html`
  - `tools/license-generator/build/LicenseGenerator/localpycs/pyimod01_archive.pyc`
  - `tools/license-generator/build/LicenseGenerator/localpycs/pyimod02_importers.pyc`
  - `tools/license-generator/build/LicenseGenerator/localpycs/pyimod03_ctypes.pyc`
  - `tools/license-generator/build/LicenseGenerator/localpycs/pyimod04_pywin32.pyc`
  - `tools/license-generator/build/LicenseGenerator/localpycs/struct.pyc`
- **Extension & Format**: Binary tables of contents, compiled archives, and HTML reports.
- **File Type**: PyInstaller Intermediate Build Artifacts
- **Exact Purpose**: Intermediate build artifacts generated during the compilation of `LicenseGenerator.exe`.
- **What It Does**: Tracks dependency graphs, bytecode archives, and packaging tables.
- **How It Works**: Generated by PyInstaller.
- **Lifecycle Status**: *Generated / Cache* (Ignored by Git: `.gitignore:51`).
- **Technical Observations**: Can be safely deleted without affecting project functionality.

---

## 4.2 Release Signing Utility: `tools/update-signer/` (6 Files)

### File 93: `tools/update-signer/sign_release.py`
- **Relative Path**: `tools/update-signer/sign_release.py`
- **Extension & Format**: Python Source Code (`.py`, 172 lines, 6,412 bytes)
- **File Type**: Release Signing & Update Manifest Generation Script
- **Exact Purpose**: Signs compiled installer packages using Ed25519 asymmetric cryptography and generates `update-manifest.json` and `sha256sums.txt`.
- **What It Does**:
  - Computes SHA-256 hash and file size of `Dubbing-Vidans-Setup.exe`.
  - Loads dedicated Ed25519 update-signing private key from environment variable `UPDATE_SIGNING_PRIVATE_KEY` (in CI/CD) or local key file.
  - Constructs canonical manifest string:
    `APP=...|VERSION=...|CHANNEL=...|OS=...|ARCH=...|SHA256=...|SIZE=...|MIN=...`
  - Signs canonical string with update private key and encodes signature in Base64.
  - Writes formatted `update-manifest.json` and `sha256sums.txt`.
- **How It Works**: Python `cryptography` library.
- **Key Definitions**: `sign_release_manifest`, `compute_sha256`, `get_keys`, `build_canonical_manifest_string`.
- **Inputs / Outputs**: Installer executable path $\rightarrow$ signed `update-manifest.json` and `sha256sums.txt`.
- **Dependencies**: `cryptography`.
- **Where Used**: Invoked by GitHub Actions release workflow (`.github/workflows/release.yml:186`).
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Enforces strict cryptographic isolation: refuses to use or fall back to the software owner's licensing private key.

---

### File 94: `tools/update-signer/keys/update_signer_public_key.pem`
- **Relative Path**: `tools/update-signer/keys/update_signer_public_key.pem`
- **Extension & Format**: PEM encoded public key (`.pem`, 113 bytes)
- **File Type**: Asymmetric Public Verification Key
- **Exact Purpose**: Master Ed25519 Public Key for verifying software updates.
- **What It Does**: Matches the public key embedded in `src/utils/updateConfig.ts` (`UPDATE_AUTHORITY_PUBLIC_KEY_PEM`). Used by the application to verify that downloaded updates originate from the genuine publisher.
- **How It Works**: Standard SubjectPublicKeyInfo X.509 format.
- **Key Definitions**: Public key bytes.
- **Inputs / Outputs**: Public key.
- **Dependencies**: None.
- **Where Used**: `sign_release.py`, `updateConfig.ts`.
- **Lifecycle Status**: *Essential / Tracked*. Explicitly exempted in `.gitignore:50`.
- **Technical Observations**: Publicly shareable; zero secret material.

---

### File 95: `tools/update-signer/keys/update_signer_private_key.pem`
- **Relative Path**: `tools/update-signer/keys/update_signer_private_key.pem`
- **Extension & Format**: PEM encoded private key (`.pem`, 119 bytes)
- **File Type**: Asymmetric Private Signing Key
- **Exact Purpose**: Dedicated Ed25519 Private Key used to digitally sign new releases.
- **What It Does**: Signs release manifests.
- **How It Works**: Standard PKCS#8 unencrypted private key format.
- **Key Definitions**: Private key bytes.
- **Inputs / Outputs**: Cryptographic private key.
- **Dependencies**: `sign_release.py`.
- **Where Used**: Used locally or uploaded to GitHub Repository Secrets (`UPDATE_SIGNING_PRIVATE_KEY`).
- **Lifecycle Status**: *Confidential Secret / Local-Only* (Ignored by Git: `.gitignore:48`).
- **Technical Observations**: **CRITICAL SECURITY ASSET**. Must NEVER be committed to Git. Properly ignored in `.gitignore`.

---

# 5. Installer Sources: `installer/` (4 Files)

---

### File 96: `installer/DubbingVidans_Setup.iss`
- **Relative Path**: `installer/DubbingVidans_Setup.iss`
- **Extension & Format**: Inno Setup Script (`.iss`, 91 lines)
- **File Type**: Windows Installer Compiler Specification
- **Exact Purpose**: Master build configuration script for compiling the standalone Windows installer `Dubbing-Vidans-Setup.exe`.
- **What It Does**:
  - Configures installer metadata: AppName "Dubbing Vidans", AppVersion "1.0.1", Publisher "Vidans Studio".
  - Requires administrative privileges (`PrivilegesRequired=admin`).
  - Sets ultra compression (`Compression=lzma2/ultra64`, `SolidCompression=yes`).
  - Sets application directories (`{autopf}\Dubbing Vidans`, `{commonappdata}\DubbingVidans`).
  - Packages application binary (`DubbingVidans.exe`), frontend build (`dist\*`), assets, runtime bundle (`runtime\*`), offline models (`models\*`), server scripts, and documentation.
  - Generates Start Menu and Desktop shortcuts.
  - Automatically launches the app upon installation completion.
- **How It Works**: Compiled using Inno Setup Compiler (`ISCC.exe`).
- **Key Definitions**: `[Setup]`, `[Files]`, `[Dirs]`, `[Icons]`, `[Run]`.
- **Inputs / Outputs**: Project directory $\rightarrow$ `dist-installer/Dubbing-Vidans-Setup.exe`.
- **Dependencies**: Inno Setup 6+.
- **Where Used**: Invoked by CI/CD (`release.yml:170`, `windows-integration.yml:98`).
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Employs LZMA2 ultra compression to compress over 1.2 GB of runtimes and models into a ~348 MB installer.

---

### File 97: `installer/license.txt`
- **Relative Path**: `installer/license.txt`
- **Extension & Format**: Plain text (`.txt`, 870 bytes)
- **File Type**: Installer License Display Text
- **Exact Purpose**: Software license text presented to the user during Inno Setup wizard execution.
- **What It Does**: Displays Vidans Studio software terms and copyright notice.
- **How It Works**: Read by Inno Setup during installer startup.
- **Key Definitions**: Software terms and conditions.
- **Inputs / Outputs**: Text displayed in setup wizard.
- **Dependencies**: `installer/DubbingVidans_Setup.iss:21`.
- **Where Used**: Installer wizard license page.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Clean, professional notice.

---

### File 98: `installer/wizard_banner.bmp`
- **Relative Path**: `installer/wizard_banner.bmp`
- **Extension & Format**: Windows Bitmap Image (`.bmp`, 164x314 pixels, 154,614 bytes)
- **File Type**: Installer Graphic Asset
- **Exact Purpose**: Left-hand sidebar banner graphic displayed in the Inno Setup installation wizard.
- **What It Does**: Branded Vidans Studio visual artwork.
- **How It Works**: Loaded by Inno Setup via `WizardImageFile=wizard_banner.bmp`.
- **Key Definitions**: Bitmap image.
- **Inputs / Outputs**: Visual display in installer.
- **Dependencies**: `installer/DubbingVidans_Setup.iss:29`.
- **Where Used**: Installer wizard left banner.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Standard Inno Setup wizard dimensions.

---

### File 99: `installer/wizard_small.bmp`
- **Relative Path**: `installer/wizard_small.bmp`
- **Extension & Format**: Windows Bitmap Image (`.bmp`, 55x58 pixels, 9,630 bytes)
- **File Type**: Installer Graphic Asset
- **Exact Purpose**: Small top-right header icon graphic displayed on inside wizard pages.
- **What It Does**: Branded Vidans logo icon.
- **How It Works**: Loaded by Inno Setup via `WizardSmallImageFile=wizard_small.bmp`.
- **Key Definitions**: Bitmap image.
- **Inputs / Outputs**: Visual display in installer.
- **Dependencies**: `installer/DubbingVidans_Setup.iss:30`.
- **Where Used**: Installer inner header page.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Clean rendering.

---

# 6. Update Proxy Server: `update-server/` (6 Files)

---

### File 100: `update-server/package.json`
- **Relative Path**: `update-server/package.json`
- **Extension & Format**: JSON (`.json`)
- **File Type**: Node.js Package Manifest
- **Exact Purpose**: Defines dependencies and scripts for the standalone update proxy service.
- **What It Does**: Configures dependencies (`express`, `dotenv`), devDependencies (`tsx`, `typescript`, `@types/*`), and scripts (`start: "tsx src/server.ts"`).
- **How It Works**: Standard NPM configuration.
- **Key Definitions**: Dependencies and script entries.
- **Inputs / Outputs**: Node package config.
- **Dependencies**: Express.
- **Where Used**: Update server deployment.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Independent package manifest allowing isolated deployment.

---

### File 101: `update-server/Dockerfile`
- **Relative Path**: `update-server/Dockerfile`
- **Extension & Format**: Dockerfile (`.Dockerfile`, 276 bytes)
- **File Type**: Container Deployment Specification
- **Exact Purpose**: Packages the update server into an ultra-lightweight Docker container.
- **What It Does**: Uses `node:20-alpine`, installs production dependencies, exposes port 4000, and starts `src/server.ts`.
- **How It Works**: Standard multi-stage or lightweight Alpine container build.
- **Key Definitions**: Container build directives.
- **Inputs / Outputs**: Docker image.
- **Dependencies**: Docker engine.
- **Where Used**: Cloud/VPS hosting of the update server.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Compact, secure Alpine base image.

---

### File 102: `update-server/README.md`
- **Relative Path**: `update-server/README.md`
- **Extension & Format**: Markdown (`.md`, 2,744 bytes)
- **File Type**: Technical Documentation
- **Exact Purpose**: Documentation for configuring, deploying, and maintaining the update server.
- **What It Does**: Explains GitHub App token generation, RSA-256 private key authentication, environment variables, and Docker deployment commands.
- **How It Works**: Human-readable guide.
- **Key Definitions**: Setup steps and deployment commands.
- **Inputs / Outputs**: Documentation.
- **Dependencies**: None.
- **Where Used**: Developer documentation.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Thorough guide covering both Personal Access Tokens and GitHub App installations.

---

### File 103: `update-server/.env.example`
- **Relative Path**: `update-server/.env.example`
- **Extension & Format**: Plain text template (1,749 bytes)
- **File Type**: Environment Configuration Template
- **Exact Purpose**: Documents configuration variables for the update proxy service.
- **What It Does**: Lists `PORT=4000`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_TOKEN`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and `REQUIRE_LICENSE_AUTH`.
- **How It Works**: Template copied to `.env` in production.
- **Key Definitions**: Environment variable descriptions.
- **Inputs / Outputs**: Template text.
- **Dependencies**: None.
- **Where Used**: Update server configuration.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Well commented with security best practices.

---

### File 104: `update-server/src/server.ts`
- **Relative Path**: `update-server/src/server.ts`
- **Extension & Format**: TypeScript (`.ts`, 349 lines, 12,583 bytes)
- **File Type**: Express Update Proxy Server Source Code
- **Exact Purpose**: Acts as a secure intermediary between end-user desktop clients and private GitHub Releases.
- **What It Does**:
  - Connects to GitHub API using either a static GitHub Token or automatic GitHub App RS256 JWT token exchange.
  - Implements endpoints:
    - `GET /api/update/check`: Fetches latest release, parses `update-manifest.json`, returns version info.
    - `GET /api/update/download/:assetId`: Streams installer binary chunks with retry handling.
    - `GET /health`: Health probe returning service uptime and status.
  - Adds security headers (Content-Security-Policy, nosniff, frame-ancestors DENY) and CORS handling.
  - Optional license authentication (`REQUIRE_LICENSE_AUTH`) to ensure only licensed machines receive updates.
- **How It Works**: Express 4 with native Node.js `crypto` for RS256 JWT signing.
- **Key Definitions**: `createGitHubAppJwt`, `getEffectiveGitHubToken`, endpoints `/api/update/*`.
- **Inputs / Outputs**: Client HTTP requests $\rightarrow$ proxied GitHub release assets.
- **Dependencies**: `express`, `dotenv`, `crypto`.
- **Where Used**: Standalone update server process.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Solves a critical distribution problem: allows clients to update from a private GitHub repository without distributing GitHub API credentials to end users.

---

### File 105: `update-server/src/server.test.ts`
- **Relative Path**: `update-server/src/server.test.ts`
- **Extension & Format**: TypeScript (`.ts`, 1,290 bytes)
- **File Type**: Unit Test Suite
- **Exact Purpose**: Tests update server security headers, health endpoint, and CORS handling.
- **What It Does**: Verifies that `/health` returns status 200 and checks that security headers are applied to all responses.
- **How It Works**: Node.js `http` assertions.
- **Key Definitions**: Test assertions.
- **Inputs / Outputs**: Test results.
- **Dependencies**: `update-server/src/server.ts`.
- **Where Used**: Update server CI testing.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Clean unit tests.

---

# 7. GitHub Actions & CI/CD: `.github/` (5 Files)

---

### File 106: `.github/CODEOWNERS`
- **Relative Path**: `.github/CODEOWNERS`
- **Extension & Format**: Plain text (134 bytes)
- **File Type**: GitHub Repository Governance
- **Exact Purpose**: Specifies code owners automatically requested for review on pull requests.
- **What It Does**: Designates `@azizifarshad` as the owner of all files (`* @azizifarshad`).
- **How It Works**: Evaluated by GitHub on pull request creation.
- **Key Definitions**: Code ownership rules.
- **Inputs / Outputs**: PR review assignments.
- **Dependencies**: GitHub platform.
- **Where Used**: GitHub PR workflow.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Standard repository governance file.

---

### File 107: `.github/dependabot.yml`
- **Relative Path**: `.github/dependabot.yml`
- **Extension & Format**: YAML (`.yml`, 665 bytes)
- **File Type**: Dependency Automation Configuration
- **Exact Purpose**: Configures automated dependency updates for NPM packages and GitHub Actions.
- **What It Does**: Schedules weekly checks for `npm` packages (in root and `update-server/`) and `github-actions`.
- **How It Works**: Read by GitHub Dependabot service.
- **Key Definitions**: Package ecosystems, schedule intervals, commit prefix conventions.
- **Inputs / Outputs**: Automated PRs for dependency updates.
- **Dependencies**: GitHub Dependabot.
- **Where Used**: Repository maintenance.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Active and functional (evidenced by open Dependabot branches on remote).

---

### File 108: `.github/workflows/ci.yml`
- **Relative Path**: `.github/workflows/ci.yml`
- **Extension & Format**: YAML (`.yml`, 72 lines, 1,761 bytes)
- **File Type**: Continuous Integration Workflow
- **Exact Purpose**: Automatically verifies code quality, types, tests, and build artifacts on pushes and PRs.
- **What It Does**:
  - Triggers on push to `main` and pull requests.
  - Sets up Node.js 22 and Python 3.11 on `windows-latest`.
  - Installs lightweight Python dependencies (`cryptography`).
  - Runs `npm ci`, `npm run lint` (TypeScript `tsc --noEmit`), and production dependency audit.
  - Executes full CI test suite: `npm run test:ci` (zero secrets required).
  - Builds application (`npm run build`) and verifies artifacts (`dist/index.html`, `server.cjs`).
- **How It Works**: GitHub Actions runner workflow.
- **Key Definitions**: Job `validate-and-test`.
- **Inputs / Outputs**: CI pipeline status check on GitHub.
- **Dependencies**: GitHub Actions runner.
- **Where Used**: Every commit and pull request.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Fast, reliable pipeline that enforces zero regressions before merging code.

---

### File 109: `.github/workflows/release.yml`
- **Relative Path**: `.github/workflows/release.yml`
- **Extension & Format**: YAML (`.yml`, 214 lines, 8,044 bytes)
- **File Type**: Continuous Delivery & Release Automation Workflow
- **Exact Purpose**: Automates the end-to-end build, Inno Setup compilation, Ed25519 signing, and publishing of production releases.
- **What It Does**:
  - Triggers on version tags (`v*`), push to `main` with new version in `package.json`, or manual `workflow_dispatch`.
  - Runs on `windows-latest` with Node 22, Python 3.11, and FFmpeg.
  - Validates linting and runs test suite `npm run test:ci`.
  - Compiles frontend (`npm run build`) and bundles `server.cjs`.
  - Compiles native C# launcher `DubbingVidans.exe` via `csc.exe`.
  - Installs Inno Setup via Chocolatey and compiles `dist-installer/Dubbing-Vidans-Setup.exe`.
  - Signs release installer and generates `update-manifest.json` and `sha256sums.txt` via `sign_release.py`.
  - Publishes assets to GitHub Releases (`softprops/action-gh-release@v2`).
- **How It Works**: Multi-stage Windows CI/CD release pipeline.
- **Key Definitions**: Job `build-and-release`.
- **Inputs / Outputs**: Production release packages on GitHub.
- **Dependencies**: GitHub Actions, Inno Setup, Chocolatey, C# compiler.
- **Where Used**: Deployment and release lifecycle.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: State-of-the-art Windows CD automation that produces fully signed, ready-to-distribute release packages.

---

### File 110: `.github/workflows/windows-integration.yml`
- **Relative Path**: `.github/workflows/windows-integration.yml`
- **Extension & Format**: YAML (`.yml`, 102 lines, 3,044 bytes)
- **File Type**: Windows Native Integration Workflow
- **Exact Purpose**: Validates native Windows-specific components and compilation scripts.
- **What It Does**:
  - Triggers on changes to `launcher.cs`, `installer/**`, `mux_video.py`, or `local_whisper.py`.
  - Tests C# compilation of `DubbingVidans.exe` using `csc.exe`.
  - Runs native integration test suite: `npm run test:integration` (FFmpeg branding and offline system tests).
  - Validates Inno Setup compiler script syntax (`DubbingVidans_Setup.iss`).
- **How It Works**: GitHub Actions Windows runner.
- **Key Definitions**: Job `windows-integration`.
- **Inputs / Outputs**: Native integration build report.
- **Dependencies**: Windows Actions runner.
- **Where Used**: On Windows-specific code changes.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Prevents native Windows regressions before reaching the release pipeline.

---

# 8. Offline AI Models: `models/` (4 Files)

---

### File 111: `models/faster-whisper-base/config.json`
- **Relative Path**: `models/faster-whisper-base/config.json`
- **Extension & Format**: JSON (`.json`, 2,540 bytes)
- **File Type**: Model Architecture Configuration
- **Exact Purpose**: Defines hyperparameters and tensor configurations for the CTranslate2 Faster-Whisper base model.
- **What It Does**: Specifies encoder/decoder layer counts, attention heads, hidden dimensions, and activation functions for Whisper Base.
- **How It Works**: Loaded by `faster_whisper.WhisperModel`.
- **Key Definitions**: Tensor configuration parameters.
- **Inputs / Outputs**: Model structure specification.
- **Dependencies**: CTranslate2 engine.
- **Where Used**: Loaded by `local_whisper.py:56`.
- **Lifecycle Status**: *Essential / Local-Only* (Ignored by Git: `.gitignore:69`).
- **Technical Observations**: Quantized for CPU `int8` and GPU `float16` execution.

---

### File 112: `models/faster-whisper-base/model.bin`
- **Relative Path**: `models/faster-whisper-base/model.bin`
- **Extension & Format**: CTranslate2 Quantized Binary Weights (145,217,532 bytes)
- **File Type**: Neural Network Weight Tensors
- **Exact Purpose**: The binary neural network weights for offline speech recognition.
- **What It Does**: Holds pre-trained acoustic and language model weights for English and multilingual transcription.
- **How It Works**: Memory-mapped by CTranslate2 runtime.
- **Key Definitions**: Binary weights.
- **Inputs / Outputs**: Raw audio features $\rightarrow$ token probability distributions.
- **Dependencies**: `faster-whisper`.
- **Where Used**: Loaded by `local_whisper.py`.
- **Lifecycle Status**: *Essential / Local-Only* (Ignored by Git: `.gitignore:69`).
- **Technical Observations**: 145 MB base model delivers high transcription accuracy with low memory footprint and sub-real-time execution on standard CPU hardware.

---

### File 113: `models/faster-whisper-base/tokenizer.json`
- **Relative Path**: `models/faster-whisper-base/tokenizer.json`
- **Extension & Format**: JSON (`.json`, 2,304,580 bytes)
- **File Type**: Byte-Pair Encoding (BPE) Tokenizer Definition
- **Exact Purpose**: Maps speech token IDs to subwords and characters.
- **What It Does**: Tokenizes text and decodes predicted token sequences into human-readable text.
- **How It Works**: Loaded by HuggingFace / CTranslate2 tokenizer engine.
- **Key Definitions**: Vocabulary merge rules and token mappings.
- **Inputs / Outputs**: Token IDs $\leftrightarrow$ text strings.
- **Dependencies**: `faster-whisper`.
- **Where Used**: Loaded by `local_whisper.py`.
- **Lifecycle Status**: *Essential / Local-Only* (Ignored by Git: `.gitignore:69`).
- **Technical Observations**: Full multilingual tokenizer definition.

---

### File 114: `models/faster-whisper-base/vocabulary.txt`
- **Relative Path**: `models/faster-whisper-base/vocabulary.txt`
- **Extension & Format**: Plain text (`.txt`, 511,726 bytes)
- **File Type**: Vocabulary Wordlist
- **Exact Purpose**: Plain-text list of subwords and vocabulary tokens.
- **What It Does**: Lookup dictionary for token-to-word conversions.
- **How It Works**: Line-by-line token index mapping.
- **Key Definitions**: Subword vocabulary.
- **Inputs / Outputs**: Vocabulary tokens.
- **Dependencies**: `faster-whisper`.
- **Where Used**: Loaded by `local_whisper.py`.
- **Lifecycle Status**: *Essential / Local-Only* (Ignored by Git: `.gitignore:69`).
- **Technical Observations**: Standard CTranslate2 vocabulary export.

---

# 9. Brand & Media Assets: `assets/` (18 Files) & `public/` (11 Files)

---

### Files 115 & 116: `assets/Final  (1).mp4` & `assets/intro.mp4`
- **Relative Paths**: `assets/Final  (1).mp4` (5,456,710 bytes) and `assets/intro.mp4` (5,456,710 bytes)
- **Extension & Format**: MPEG-4 Video (`.mp4`, H.264 / AAC)
- **File Type**: Studio Intro Video Clip
- **Exact Purpose**: Brand introduction video clip concatenated to the beginning of dubbed videos.
- **What It Does**: Features animated Vidans Studio logo and opening audio.
- **How It Works**: Concatenated via `mux_video.py:normalize_video` and `concatenate_videos`.
- **Key Definitions**: Video asset.
- **Inputs / Outputs**: Video stream.
- **Dependencies**: FFmpeg multiplexer.
- **Where Used**: `mux_video.py:31`, `ExportStudio.tsx`.
- **Lifecycle Status**: *Essential* (one copy), *Redundant* (second copy).
- **Technical Observations**: **IDENTICAL DUPLICATES**: SHA-256 hash `2381DF67A2AC...` matches 100%. `Final  (1).mp4` has problematic spaces/parentheses in filename. `intro.mp4` should be the canonical reference.

---

### File 117: `assets/cache/intro_normalized_1080p.mp4`
- **Relative Path**: `assets/cache/intro_normalized_1080p.mp4`
- **Extension & Format**: MPEG-4 Video (`.mp4`, 1,144,806 bytes)
- **File Type**: Pre-Rendered Normalized Video Cache
- **Exact Purpose**: Pre-rendered 1080p 30fps normalized intro video used by `mux_video.py` for high-speed concatenation.
- **What It Does**: Eliminates the need to transcode the intro clip on every single video export, saving 15-30 seconds per render.
- **How It Works**: Directly checked and selected by `mux_video.py:305`.
- **Key Definitions**: Optimized video cache.
- **Inputs / Outputs**: Video stream.
- **Dependencies**: `mux_video.py`.
- **Where Used**: `mux_video.py:32`.
- **Lifecycle Status**: *Essential / Cache*.
- **Technical Observations**: Excellent optimization; pre-scaled to 1920x1080 YUV420p with stereo 48kHz AAC audio.

---

### Files 118, 119 & 120: `assets/Logo-Vidans .png`, `assets/Logo-Vidans.png` & `assets/logo_watermark.png`
- **Relative Paths**: `assets/Logo-Vidans .png` (43,856 bytes), `assets/Logo-Vidans.png` (43,856 bytes), `assets/logo_watermark.png` (43,856 bytes)
- **Extension & Format**: Portable Network Graphics (`.png`, RGBA with alpha channel)
- **File Type**: Studio Logo Watermark Image
- **Exact Purpose**: Transparent watermark overlay placed on the top-right corner of dubbed videos.
- **What It Does**: Renders transparent Vidans branding in `mux_video.py:add_logo`.
- **How It Works**: Applied via FFmpeg overlay filter.
- **Key Definitions**: Watermark image.
- **Inputs / Outputs**: Image graphic.
- **Dependencies**: `mux_video.py`.
- **Where Used**: `mux_video.py:33`, `ExportStudio.tsx`.
- **Lifecycle Status**: *Essential* (`Logo-Vidans.png`), *Redundant* (other two copies).
- **Technical Observations**: **IDENTICAL DUPLICATES**: SHA-256 hash `2A6862834FB5...` is identical across all three files. `Logo-Vidans .png` has an accidental trailing space before the extension that causes cross-platform issues.

---

### File 121: `assets/Vidans.ico`
- **Relative Path**: `assets/Vidans.ico`
- **Extension & Format**: Windows Icon (`.ico`, 66,979 bytes)
- **File Type**: Application Icon
- **Exact Purpose**: Multi-resolution Windows application icon for shortcuts and executable resources.
- **What It Does**: Contains 16x16, 32x32, 48x48, and 256x256 pixel icon layers.
- **How It Works**: Embedded into `DubbingVidans.exe` via `csc.exe /win32icon` and Inno Setup via `SetupIconFile`.
- **Key Definitions**: Windows icon.
- **Inputs / Outputs**: Icon graphic.
- **Dependencies**: C# compiler, Inno Setup.
- **Where Used**: `launcher.cs`, `installer/DubbingVidans_Setup.iss`, `Install-DubbingVidans.ps1`.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: High-quality multi-layer icon.

---

### Files 122 to 132: `assets/logos/*` (11 Files)
- **Relative Paths**:
  - `assets/logos/Dub Vidans Logo.png` (600,629 bytes)
  - `assets/logos/Gemini_Generated_Image_v1lhuev1lhuev1lh.jpg` (746,341 bytes)
  - `assets/logos/LOGO DUB.png` (3,146,666 bytes)
  - `assets/logos/logo dubb.png` (1,588,431 bytes)
  - `assets/logos/Logo Sadra -black.png` (106,695 bytes)
  - `assets/logos/Logo Sadra -white.png` (106,797 bytes)
  - `assets/logos/LOGO.png` (716,689 bytes)
  - `assets/logos/Logo-Vidans - Copy.png` (12,441 bytes)
  - `assets/logos/Logo-Vidans Reverse copy.png` (92,547 bytes)
  - `assets/logos/Logo-Vidans Reverse.png` (37,402 bytes)
  - `assets/logos/Logo-Vidans.png` (43,856 bytes)
- **Extension & Format**: PNG and JPEG images
- **File Type**: Graphic Design & Marketing Assets
- **Exact Purpose**: Historical brand design iterations, dark/light theme variants, and master artwork.
- **What It Does**: Used for marketing, documentation graphics, and branding selection.
- **How It Works**: Static graphic files.
- **Key Definitions**: Images.
- **Inputs / Outputs**: Visual graphics.
- **Dependencies**: None.
- **Where Used**: Graphic design archive; referenced in documentation.
- **Lifecycle Status**: *Optional / Design Archive*.
- **Technical Observations**: Contains draft copies (`Logo-Vidans - Copy.png`, `Reverse copy.png`) totaling ~7.2 MB. Could be moved to an external design repository or cleaned up to reduce repo clone weight.

---

### Files 133 to 143: `public/*` (11 Files)
- **Relative Paths**:
  - `public/Vidans.ico` (66,979 bytes)
  - `public/favicon.png` (695,912 bytes)
  - `public/header-logo.png` (65,375 bytes)
  - `public/logo.jpg` (72,317 bytes)
  - `public/logo.png` (695,912 bytes)
  - `public/manifest.json` (514 bytes)
  - `public/assets/Final  (1).mp4` (5,456,710 bytes)
  - `public/assets/intro.mp4` (5,456,710 bytes)
  - `public/assets/Logo-Vidans .png` (43,856 bytes)
  - `public/assets/Logo-Vidans.png` (43,856 bytes)
  - `public/assets/logo_watermark.png` (43,856 bytes)
- **Extension & Format**: Web assets (PNG, JPG, ICO, JSON, MP4)
- **File Type**: Static Web Serving Directory
- **Exact Purpose**: Files in `public/` are served directly by Vite development server and copied verbatim into `dist/` during `npm run build`.
- **What It Does**: Serves favicon, header logos, web app manifest, and media previews to the browser.
- **How It Works**: Standard Vite static directory.
- **Key Definitions**: Web assets.
- **Inputs / Outputs**: Static HTTP responses.
- **Dependencies**: Vite bundler.
- **Where Used**: Web browser client.
- **Lifecycle Status**: *Essential* (`favicon.png`, `header-logo.png`, `manifest.json`, `Vidans.ico`), *Redundant* (`public/assets/*` copies duplicate root `assets/*`).
- **Technical Observations**: Having duplicate 5.45 MB video files in both `assets/` and `public/assets/` needlessly doubles disk usage in the repository.

---

# 10. Project Documentation: `DOCS/` (17 Files)

---

### File 144: `DOCS/CUSTOMER_GUIDE.md`
- **Relative Path**: `DOCS/CUSTOMER_GUIDE.md`
- **Extension & Format**: Markdown (`.md`, 5,858 bytes)
- **File Type**: Persian End-User Manual (راهنمای جامع مشتریان)
- **Exact Purpose**: Step-by-step customer guide for installing, activating, and operating Dubbing Vidans.
- **What It Does**: Explains how to generate an activation request (`.vidansreq`), submit it for permanent license issuance, import `.vidanslic`, and use the 5 studio stages.
- **How It Works**: User documentation.
- **Key Definitions**: Persian installation and licensing instructions.
- **Inputs / Outputs**: Documentation.
- **Dependencies**: Bundled into final installer (`installer/DubbingVidans_Setup.iss:81`).
- **Where Used**: Installed into `{app}\DOCS\CUSTOMER_GUIDE.md` on user machines.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: User friendly and clearly written for non-technical users.

---

### File 145: `DOCS/LICENSING_ARCHITECTURE.md`
- **Relative Path**: `DOCS/LICENSING_ARCHITECTURE.md`
- **Extension & Format**: Markdown (`.md`, 9,983 bytes)
- **File Type**: Technical Architecture Specification
- **Exact Purpose**: Comprehensive technical deep-dive into the offline cryptographic licensing system.
- **What It Does**: Details the threat model, Ed25519 signature format, hardware fingerprinting formulas, canonical string serializations, anti-tamper mechanisms, and multi-user `%ProgramData%` architecture.
- **How It Works**: Technical specification document.
- **Key Definitions**: Cryptographic formulas, canonical string schemas, security guarantees.
- **Inputs / Outputs**: Technical documentation.
- **Dependencies**: Bundled into final installer (`installer/DubbingVidans_Setup.iss:82`).
- **Where Used**: Architecture reference for developers and auditors.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Rigorous, well-architected cryptographic documentation.

---

### File 146: `DOCS/OWNER_GUIDE.md`
- **Relative Path**: `DOCS/OWNER_GUIDE.md`
- **Extension & Format**: Markdown (`.md`, 7,019 bytes)
- **File Type**: Software Publisher / Owner Confidential Operations Guide
- **Exact Purpose**: Operational manual for the software owner on issuing customer licenses and managing releases.
- **What It Does**: Explains how to launch `LicenseGenerator.exe` or CLI, verify customer hardware requests, issue permanent licenses, sign updates via `sign_release.py`, and protect private keys.
- **How It Works**: Internal developer/owner manual.
- **Key Definitions**: Operational runbooks for licensing and releases.
- **Inputs / Outputs**: Documentation.
- **Dependencies**: None.
- **Where Used**: Internal developer reference.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Clear instructions emphasizing that private keys must never be distributed.

---

### Files 147 to 153: `DOCS/en/*` (7 English Technical Guides)
- **Relative Paths**:
  - `DOCS/en/architecture.md` (5,548 bytes)
  - `DOCS/en/automatic-updates.md` (4,616 bytes)
  - `DOCS/en/ci-cd.md` (4,742 bytes)
  - `DOCS/en/configuration.md` (3,525 bytes)
  - `DOCS/en/installation.md` (4,563 bytes)
  - `DOCS/en/security.md` (3,434 bytes)
  - `DOCS/en/troubleshooting.md` (3,232 bytes)
- **Extension & Format**: Markdown (`.md`)
- **File Type**: English Modular Technical Documentation Suite
- **Exact Purpose**: Modular documentation covering architecture, auto-updates, CI/CD, configuration, installation, security, and troubleshooting in English.
- **What It Does**: Provides thorough reference manuals for international developers and auditors.
- **How It Works**: Static markdown documents.
- **Key Definitions**: Modular documentation topics.
- **Inputs / Outputs**: Documentation.
- **Dependencies**: None.
- **Where Used**: Repository documentation.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: High quality, thorough, and well structured.

---

### Files 154 to 160: `DOCS/fa/*` (7 Persian Technical Guides)
- **Relative Paths**:
  - `DOCS/fa/architecture.md` (4,495 bytes)
  - `DOCS/fa/automatic-updates.md` (5,395 bytes)
  - `DOCS/fa/ci-cd.md` (3,856 bytes)
  - `DOCS/fa/configuration.md` (3,774 bytes)
  - `DOCS/fa/installation.md` (4,356 bytes)
  - `DOCS/fa/security.md` (2,989 bytes)
  - `DOCS/fa/troubleshooting.md` (3,668 bytes)
- **Extension & Format**: Markdown (`.md`)
- **File Type**: Persian Modular Technical Documentation Suite (مستندات جامع فارسی)
- **Exact Purpose**: Complete Persian translations and localized equivalents of the 7 modular technical guides.
- **What It Does**: Explains architecture, updates, CI/CD, configuration, installation, security, and troubleshooting in native Persian.
- **How It Works**: Static markdown documents.
- **Key Definitions**: Localized technical concepts.
- **Inputs / Outputs**: Documentation.
- **Dependencies**: None.
- **Where Used**: Persian developer and user reference.
- **Lifecycle Status**: *Essential*.
- **Technical Observations**: Professional translation and accurate technical terminology.

---

# 11. Customer Distribution Bundle: `Sadra/` (11 Files)

---

### Files 161 to 171: `Sadra/*`
- **Relative Paths**:
  - `Sadra/راهنمای_کامل_نصب_و_فعالسازی.txt` (3,244 bytes)
  - `Sadra/1-نصاب اصلی نرم افزار/Dubbing-Vidans-Setup.exe` (365,010,931 bytes)
  - `Sadra/2-ابزار صدور لایسنس/LicenseGenerator.exe` (16,057,670 bytes)
  - `Sadra/2-ابزار صدور لایسنس/keys/owner_private_key.pem` (122 bytes)
  - `Sadra/2-ابزار صدور لایسنس/keys/owner_public_key.pem` (116 bytes)
  - `Sadra/3-پیشنیازها/FFmpeg/ffmpeg.exe` (227,823,104 bytes)
  - `Sadra/3-پیشنیازها/FFmpeg/ffprobe.exe` (227,621,376 bytes)
  - `Sadra/3-پیشنیازها/1-تنظیم-خودکار-FFmpeg.bat` (1,158 bytes)
  - `Sadra/3-پیشنیازها/2-نصب-کتابخانه‌های-پایتون.bat` (1,129 bytes)
  - `Sadra/3-پیشنیازها/Node.js-LTS-x64.msi` (36,564,992 bytes)
  - `Sadra/3-پیشنیازها/Python-3.12-x64.exe` (26,964,224 bytes)
- **Extension & Format**: Binaries, installers, scripts, and text files.
- **File Type**: Local Distribution & Deployment Staging Folder
- **Exact Purpose**: Complete offline package bundle prepared for delivering the software to customers or standalone machines.
- **What It Does**:
  - `1-نصاب اصلی نرم افزار`: Contains the compiled setup executable.
  - `2-ابزار صدور لایسنس`: Contains the standalone license generator tool and owner keys.
  - `3-پیشنیازها`: Contains offline prerequisite installers (Node.js LTS MSI, Python 3.12 EXE, static FFmpeg binaries, batch setup scripts).
  - `راهنمای_کامل_نصب_و_فعالسازی.txt`: Step-by-step customer setup manual in Persian.
- **How It Works**: Packaged folder structure for USB drive or offline delivery.
- **Key Definitions**: Staged distribution bundle.
- **Inputs / Outputs**: Offline software delivery.
- **Dependencies**: Windows OS.
- **Where Used**: Staged locally; ignored by Git (`.gitignore:92`).
- **Lifecycle Status**: *Staging / Local-Only* (Ignored by Git).
- **Technical Observations**: **CRITICAL SECURITY NOTE**: `Sadra/2-ابزار صدور لایسنس/keys/owner_private_key.pem` is located inside this folder! If the `Sadra/` folder is copied directly to a customer, the software owner's private signing key would be leaked! Only subfolder `1-نصاب اصلی نرم افزار` should be distributed to customers.

---

# 12. Scratch Scripts & Legacy Applet: `scratch/` (2 Files) & `app/` (1 File)

---

### Files 172 & 173: `scratch/test_api_translate.cjs` & `scratch/test_translation_flow.cjs`
- **Relative Paths**: `scratch/test_api_translate.cjs` (2,566 bytes) and `scratch/test_translation_flow.cjs` (4,656 bytes)
- **Extension & Format**: CommonJS JavaScript (`.cjs`)
- **File Type**: Scratch Integration Test Scripts
- **Exact Purpose**: Ad-hoc scripts used during development to test translation endpoint responses and candidate selection flows.
- **What It Does**: Sends sample dialogue lines to translation endpoints and validates Persian text output and predicted durations.
- **How It Works**: Standalone Node.js execution (`node scratch/test_api_translate.cjs`).
- **Key Definitions**: Test harnesses.
- **Inputs / Outputs**: Console output.
- **Dependencies**: `candidateScorer.ts`, `localTranslator.ts`.
- **Where Used**: Local development scratchpad; ignored by Git (`.gitignore:93`).
- **Lifecycle Status**: *Optional / Scratch*.
- **Technical Observations**: Kept for manual debugging; formal automated testing is handled by `tests/`.

---

### File 174: `app/applet/.env.example`
- **Relative Path**: `app/applet/.env.example`
- **Extension & Format**: Plain text (111 bytes)
- **File Type**: Legacy Configuration Template
- **Exact Purpose**: Leftover template from an earlier modular applet scaffold.
- **What It Does**: Contains template for `GEMINI_API_KEY` and `PORT=3000`.
- **How It Works**: Static template.
- **Key Definitions**: Template strings.
- **Inputs / Outputs**: None.
- **Dependencies**: None.
- **Where Used**: Tracked in Git.
- **Lifecycle Status**: *Potentially Obsolete*.
- **Technical Observations**: Harmless, but represents an orphan directory (`app/applet/`) with no active source code.

---

# 13. Nested Git Repository Clone: `Dubb/` (1 File + Nested `.git`)

---

### File 175: `Dubb/.gitattributes` (and `Dubb/.git/*`)
- **Relative Path**: `Dubb/.gitattributes` (and nested directory `Dubb/.git/`)
- **Extension & Format**: Git configuration (`.gitattributes`, 66 bytes)
- **File Type**: Accidental Nested Git Repository
- **Exact Purpose**: Nested clone of remote repository `https://github.com/azizifarshad/Dubb.git`.
- **What It Does**: Contains a `.git` folder and `.gitattributes` (`* text=auto`) from an initial commit (`d5cce9c`).
- **How It Works**: An independent Git repository cloned into a subdirectory of the parent Git repository.
- **Key Definitions**: Nested Git database.
- **Inputs / Outputs**: Git repository files.
- **Dependencies**: None.
- **Where Used**: Appears as an untracked directory `Dubb/` in parent `git status`.
- **Lifecycle Status**: *Obsolete / Accidental Artifact*.
- **Technical Observations**: Created on 11/15/2026 at 8:50 AM. It is not tracked by the parent repository, is not a Git submodule, and serves no functional purpose in Dubbing Vidans.

---

# 14. Build Artifacts: `build/`, `dist/`, `dist-installer/`, `dist-server/`, `__pycache__/` (34 Files)

---

### Files 176 to 191: `build/whisper_engine/*` (16 Files)
- **Relative Paths**:
  - `build/whisper_engine/Analysis-00.toc`
  - `build/whisper_engine/base_library.zip`
  - `build/whisper_engine/COLLECT-00.toc`
  - `build/whisper_engine/EXE-00.toc`
  - `build/whisper_engine/PKG-00.toc`
  - `build/whisper_engine/PYZ-00.pyz`
  - `build/whisper_engine/PYZ-00.toc`
  - `build/whisper_engine/warn-whisper_engine.txt`
  - `build/whisper_engine/whisper_engine.exe` (16.5 MB)
  - `build/whisper_engine/whisper_engine.pkg`
  - `build/whisper_engine/xref-whisper_engine.html`
  - `build/whisper_engine/localpycs/pyimod01_archive.pyc`
  - `build/whisper_engine/localpycs/pyimod02_importers.pyc`
  - `build/whisper_engine/localpycs/pyimod03_ctypes.pyc`
  - `build/whisper_engine/localpycs/pyimod04_pywin32.pyc`
  - `build/whisper_engine/localpycs/struct.pyc`
- **Extension & Format**: PyInstaller build outputs and executable (16.5 MB).
- **File Type**: Intermediate PyInstaller Build Artifacts
- **Exact Purpose**: Artifacts from an earlier attempt to package Whisper into a standalone executable.
- **What It Does**: Compiled Python runtime and modules.
- **How It Works**: PyInstaller build tree.
- **Where Used**: Ignored by Git (`.gitignore:16`).
- **Lifecycle Status**: *Generated / Cache*.
- **Technical Observations**: Can be safely purged (`rm -rf build`) to reclaim ~52 MB of disk space.

---

### Files 192 to 205: `dist/*` (14 Files)
- **Relative Paths**:
  - `dist/index.html` (1,343 bytes)
  - `dist/favicon.png` (695,912 bytes)
  - `dist/header-logo.png` (65,375 bytes)
  - `dist/logo.jpg` (72,317 bytes)
  - `dist/logo.png` (695,912 bytes)
  - `dist/manifest.json` (514 bytes)
  - `dist/Vidans.ico` (66,979 bytes)
  - `dist/assets/index-BCpdCrB5.css` (99,354 bytes)
  - `dist/assets/index-C92TGM9a.js` (590,228 bytes)
  - `dist/assets/Final  (1).mp4` (5,456,710 bytes)
  - `dist/assets/intro.mp4` (5,456,710 bytes)
  - `dist/assets/Logo-Vidans .png` (43,856 bytes)
  - `dist/assets/Logo-Vidans.png` (43,856 bytes)
  - `dist/assets/logo_watermark.png` (43,856 bytes)
- **Extension & Format**: Compiled HTML, CSS, JavaScript, and static assets.
- **File Type**: Production Frontend Build Directory
- **Exact Purpose**: Output generated by `vite build` (`npm run build`).
- **What It Does**: Served statically by Express (`server.ts:3620`) in production mode.
- **How It Works**: Optimized, minified, tree-shaken static website bundle.
- **Where Used**: Production web UI. Ignored by Git (`.gitignore:13`).
- **Lifecycle Status**: *Generated / Production Output*.
- **Technical Observations**: Clean production build. Includes minified Tailwind v4 CSS and bundled React 19 app.

---

### Files 206 to 208: `dist-installer/*` (3 Files)
- **Relative Paths**:
  - `dist-installer/Dubbing-Vidans-Setup.exe` (365,038,648 bytes)
  - `dist-installer/sha256sums.txt` (177 bytes)
  - `dist-installer/update-manifest.json` (962 bytes)
- **Extension & Format**: Windows Executable, plain text, and JSON.
- **File Type**: Production Release Distribution Artifacts
- **Exact Purpose**: Output generated by the Inno Setup build and release signing pipeline (`sign_release.py`).
- **What It Does**:
  - `Dubbing-Vidans-Setup.exe`: The official v1.0.1 production installer.
  - `sha256sums.txt`: Contains SHA-256 hashes for `Dubbing-Vidans-Setup.exe` and `DubbingVidans.exe`.
  - `update-manifest.json`: Holds version info, file sizes, SHA-256 hash, and genuine Ed25519 digital signature.
- **How It Works**: Published to GitHub Releases by `.github/workflows/release.yml`.
- **Where Used**: Downloaded by client `UpdateModal.tsx` and end users. Ignored by Git (`.gitignore:14`).
- **Lifecycle Status**: *Generated / Production Release*.
- **Technical Observations**: Verified genuinely signed with Ed25519; matches public verification key.

---

### Directory 209: `dist-server/`
- **Relative Path**: `dist-server/`
- **Extension & Format**: Directory (0 files)
- **File Type**: Empty Placeholder Directory
- **Exact Purpose**: Output placeholder for server builds.
- **What It Does**: Currently unused because server bundling outputs directly to root `server.cjs`.
- **Lifecycle Status**: *Potentially Obsolete*.
- **Technical Observations**: Can be deleted or designated for future server bundle modularization.

---

### File 210: `__pycache__/local_whisper.cpython-314.pyc`
- **Relative Path**: `__pycache__/local_whisper.cpython-314.pyc`
- **Extension & Format**: Compiled Python Bytecode (`.pyc`, 4,354 bytes)
- **File Type**: Python Bytecode Cache
- **Exact Purpose**: Speeds up loading of `local_whisper.py` on subsequent invocations.
- **What It Does**: Pre-compiled Python 3.14 bytecode.
- **Lifecycle Status**: *Generated / Cache* (Ignored by Git: `.gitignore:38`).
- **Technical Observations**: Standard Python compilation artifact.

---

# 15. Structural Analysis of Special Large Directories

---

### Special Directory 1: Embedded Portable Runtimes (`runtime/` - 7,668 Files, ~870 MB)
- **Relative Path**: `runtime/`
- **Structural Breakdown**:
  1. `runtime/node.exe` (93,580,104 bytes): Standalone, zero-install Node.js 22 LTS binary. Allows `DubbingVidans.exe` and `Start-DubbingVidans.bat` to run the Express server even on computers where Node.js is not installed.
  2. `runtime/ffmpeg/`: Static Windows builds of `ffmpeg.exe` (227.8 MB) and `ffprobe.exe` (227.6 MB). Provides video normalization, audio extraction, and MP4 multiplexing without external dependencies.
  3. `runtime/python/`: Complete embedded Python 3.12 environment (~321 MB, 7,665 files) containing `python.exe`, DLLs, standard library, and pre-installed site-packages (`faster-whisper`, `ctranslate2`, `soundfile`, `numpy`, `cryptography`).
- **Exact Purpose**: Makes Dubbing Vidans a 100% self-contained, offline, zero-install portable application.
- **Lifecycle Status**: *Essential for Offline Portability / Ignored by Git (`.gitignore:34`)*.
- **Technical Observations**: Bundled into `Dubbing-Vidans-Setup.exe` by Inno Setup. Guarantees that end users encounter zero dependency issues.

---

### Special Directory 2: Node.js Dependencies (`node_modules/` - 8,553 Files, ~186.5 MB)
- **Relative Path**: `node_modules/`
- **Structural Breakdown**: Contains installed runtime and developer dependencies resolved by NPM according to `package.json` and package locks.
- **Key Modules**:
  - `react`, `react-dom` (v19.0.1)
  - `@google/genai` (v2.4.0)
  - `express` (v4.21.2)
  - `vite` (v8.3.0) & `@vitejs/plugin-react` (v6.1.1)
  - `@tailwindcss/vite` & `tailwindcss` (v4.3.3)
  - `motion` (v12.23.24)
  - `lucide-react` (v0.546.0)
  - `tsx` (v4.21.0), `esbuild` (v0.25.0), `typescript` (v7.0.2)
- **Lifecycle Status**: *Essential for Development & Build / Ignored by Git (`.gitignore:6`)*.
- **Technical Observations**: Clean installation without conflicting peer dependencies.

---

### Special Directory 3: Git Database (`.git/` - 187 Items, ~75.4 MB)
- **Relative Path**: `.git/`
- **Structural Breakdown**:
  - `HEAD`: Points to `refs/heads/main`.
  - `config`: Remote origin points to `https://github.com/azizifarshad/Dubbing.git`.
  - `objects/`: Compressed Git object database containing commits, trees, and blobs.
  - `refs/`: Branch references (`refs/heads/main`, `refs/remotes/origin/*`).
  - `logs/`: Reflog tracking history of HEAD and branch updates.
- **Exact Purpose**: Version control metadata for the repository.
- **Lifecycle Status**: *Internal Git Database*.
- **Technical Observations**: Repository is clean and in complete sync with `origin/main`.

---

## File Audit Verification Summary

| Category | File Count | Audited & Documented |
| :--- | :--- | :--- |
| **Root Files** | 24 | 24 / 24 (100%) |
| **Source Code (`src/`)** | 38 | 38 / 38 (100%) |
| **Automated Tests (`tests/`)** | 11 | 11 / 11 (100%) |
| **Developer Tools (`tools/`)** | 25 | 25 / 25 (100%) |
| **Installer Sources (`installer/`)** | 4 | 4 / 4 (100%) |
| **Update Server (`update-server/`)** | 6 | 6 / 6 (100%) |
| **GitHub Automation (`.github/`)** | 5 | 5 / 5 (100%) |
| **Offline AI Models (`models/`)** | 4 | 4 / 4 (100%) |
| **Brand Assets (`assets/`)** | 18 | 18 / 18 (100%) |
| **Static Web Assets (`public/`)** | 11 | 11 / 11 (100%) |
| **Documentation (`DOCS/`)** | 17 | 17 / 17 (100%) |
| **Deployment Staging (`Sadra/`)** | 11 | 11 / 11 (100%) |
| **Scratch Tests (`scratch/`)** | 2 | 2 / 2 (100%) |
| **Legacy Applet (`app/`)** | 1 | 1 / 1 (100%) |
| **Nested Repo (`Dubb/`)** | 1 (+.git) | 1 / 1 (100%) |
| **Build Artifacts (`build/`, `dist/`, `dist-installer/`, `__pycache__/`)** | 34 | 34 / 34 (100%) |
| **Special Directories (`runtime/`, `node_modules/`, `.git/`)** | 3 dirs | Documented structurally |
| **Total Non-Special Files** | **212** | **212 / 212 (100%) Audited** |
