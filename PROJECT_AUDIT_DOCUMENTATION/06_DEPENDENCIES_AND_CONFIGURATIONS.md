# 06 - Dependencies & System Configurations

## Overview

This document provides a comprehensive technical audit of all runtime dependencies, developer tools, system binaries, configuration files, and environment variables across **Dubbing Vidans**.

---

## 1. Node.js & NPM Dependencies

### 1.1 Production Dependencies (`dependencies` in `package.json`)

| Package | Version Range | Installed | Primary Purpose & Usage in Code |
| :--- | :--- | :--- | :--- |
| `react` | `^19.0.1` | `19.0.1` | Core UI library; provides virtual DOM, state hooks (`useState`, `useEffect`), and component lifecycle. |
| `react-dom` | `^19.0.1` | `19.0.1` | Renders React component tree into browser DOM (`createRoot` in `src/main.tsx`). |
| `@google/genai` | `^2.4.0` | `2.4.0` | Official Google GenAI SDK; provides multimodal audio transcription and Gemini 3.8 Flash model invocation. |
| `express` | `^4.21.2` | `4.21.2` | Core backend HTTP web server; handles REST endpoints, binary audio/video stream uploads, and static serving. |
| `dotenv` | `^17.2.3` | `17.2.3` | Loads `.env` file into `process.env` at server initialization. |
| `motion` | `^12.23.24` | `12.23.24` | Framer Motion animation engine; powers modal transitions, status indicators, and timeline interactions. |
| `lucide-react` | `^0.546.0` | `0.546.0` | Modern SVG icon library; renders studio controls, transport buttons, and status icons. |
| `vite` | `^8.3.0` | `8.3.0` | Next-generation frontend bundler and development server. |
| `@vitejs/plugin-react` | `^6.1.1` | `6.1.1` | Vite plugin providing Fast Refresh and JSX transformation for React 19. |
| `@tailwindcss/vite` | `^4.3.3` | `4.3.3` | Official Vite plugin for Tailwind CSS v4; provides high-speed compilation without PostCSS config. |

### 1.2 Developer Dependencies (`devDependencies` in `package.json`)

| Package | Version Range | Installed | Role in Project |
| :--- | :--- | :--- | :--- |
| `typescript` | `^7.0.2` | `7.0.2` | TypeScript compiler; provides static type checking (`npm run lint`). |
| `tsx` | `^4.21.0` | `4.21.0` | High-performance TypeScript execution engine; runs server in dev (`npm run dev`) and executes CI tests. |
| `esbuild` | `^0.25.0` | `0.25.0` | Ultra-fast JavaScript/TypeScript bundler; packages `server.ts` into standalone `server.cjs`. |
| `tailwindcss` | `^4.3.3` | `4.3.3` | Utility-first CSS framework; styles the studio UI. |
| `autoprefixer` | `^10.4.21` | `10.4.21` | PostCSS plugin for vendor prefixing. |
| `@types/node` | `^22.14.0` | `22.14.0` | TypeScript definitions for Node.js standard runtime APIs (`fs`, `path`, `crypto`, `child_process`). |
| `@types/react` | `^19.3.0` | `19.3.0` | TypeScript definitions for React. |
| `@types/react-dom` | `^19.3.0` | `19.3.0` | TypeScript definitions for React DOM. |
| `@types/express` | `^4.17.21` | `4.17.21` | TypeScript definitions for Express. |

---

## 2. Python Dependencies & Ecosystem

The Python runtime powers offline speech-to-text, video multiplexing, and cryptographic license generation.

| Package | Version / Distribution | Role & Purpose | Where Referenced |
| :--- | :--- | :--- | :--- |
| `faster-whisper` | `1.0.0+` (CTranslate2) | High-performance offline speech-to-text; loads quantized CTranslate2 Whisper models. | `local_whisper.py:6` |
| `cryptography` | `42.0.0+` (PyCA) | Implements Ed25519 asymmetric signing, key generation, and PEM serialization. | `tools/license-generator/license_engine.py`, `tools/update-signer/sign_release.py` |
| `soundfile` | `0.12.0+` (libsndfile) | Reads audio files (`WAV`, `MP3`), extracts PCM sample arrays, checks sample rates. | `local_whisper.py:5` |
| `numpy` | `1.26.0+` / `2.0+` | Matrix manipulations, audio channel averaging (stereo to mono), and normalization. | `local_whisper.py:4` |
| `torch` (PyTorch) | Optional / Auto-detected | Hardware acceleration: used by Faster-Whisper to detect NVIDIA CUDA GPUs (`float16`). | `local_whisper.py:32` |
| `tkinter` | Python Standard Library | Renders graphical UI for the license generator tool (`license_generator_gui.py`). | `tools/license-generator/license_generator_gui.py` |

---

## 3. External System Binaries & Runtimes

| Binary | Source / Version | Deployment Location | Architectural Role |
| :--- | :--- | :--- | :--- |
| `node.exe` | Node.js 22 LTS (x64) | Bundled in `runtime\node.exe` or system PATH | Executes backend server (`server.cjs`), runs WebSocket/HTTP listeners. |
| `ffmpeg.exe` | FFmpeg 7.x / 6.x Static Build | Bundled in `runtime\ffmpeg\ffmpeg.exe` or system PATH | Audio extraction, video normalization, padding, letterboxing, H.264 muxing. |
| `ffprobe.exe` | FFprobe Static Build | Bundled in `runtime\ffmpeg\ffprobe.exe` or system PATH | Media stream analysis (resolution, audio channels, duration, codecs). |
| `csc.exe` | Microsoft .NET Framework 4.0+ | `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe` | Native C# compiler compiling `launcher.cs` into `DubbingVidans.exe`. |
| `ISCC.exe` | Inno Setup 6.x Compiler | `C:\Program Files (x86)\Inno Setup 6\ISCC.exe` | Compiles `installer\DubbingVidans_Setup.iss` into `Dubbing-Vidans-Setup.exe`. |

---

## 4. Environment Variables Specification

The application consumes configuration from environment variables defined in `.env` or injected by the OS and CI/CD pipelines.

### 4.1 Application Server Configuration (`.env`)

| Variable | Default Value | Required | Purpose & Impact |
| :--- | :--- | :--- | :--- |
| `API_BASE_URL` | `https://api.hormouz.net/v1` | No | Base URL for OpenAI-compatible AI providers (e.g. Hormouz AI). |
| `HORMOUZ_API_KEY` | *(Empty)* | Optional | API authentication key for Hormouz AI endpoints. |
| `TRANSLATION_MODEL` | `openai/gpt-6-luna` | No | Model identifier used for subtitle translation and timing adaptation. |
| `TTS_MODEL` | `google/gemini-3.8-flash-lite-tts` | No | Model identifier used for Persian speech voice synthesis. |
| `GEMINI_API_KEY` | *(Empty)* | Optional | Direct Google Gemini API key for multimodal STT, translation, and TTS. |
| `PORT` | `3000` | No | HTTP port on which the local Express server binds. |
| `NODE_ENV` | `development` / `production` | No | Determines whether Vite serves development middleware or pre-built static files in `dist/`. |
| `SKIP_LICENSE_CHECK` | `false` | No | Development flag: when set to `true`, disables licensing enforcement on video export. |
| `DISABLE_HMR` | `false` | No | Disables Vite Hot Module Replacement (HMR) to save CPU during automated edits. |

### 4.2 CI/CD & Auto-Update Configuration (GitHub Secrets)

| Secret / Variable | Scope | Purpose & Security Classification |
| :--- | :--- | :--- |
| `UPDATE_SIGNING_PRIVATE_KEY` | GitHub Repository Secret | **CRITICAL SECRET**: Ed25519 private key used by `sign_release.py` in GitHub Actions to sign `Dubbing-Vidans-Setup.exe`. |
| `GITHUB_TOKEN` | GitHub Actions Built-in | Used by `softprops/action-gh-release@v2` to publish signed release assets. |

### 4.3 Update Proxy Server Configuration (`update-server/.env`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port for the standalone update proxy server. |
| `GITHUB_REPO_OWNER` | `azizifarshad` | GitHub owner account hosting the private repository. |
| `GITHUB_REPO_NAME` | `Dubbing` | GitHub repository name. |
| `GITHUB_TOKEN` | *(Empty)* | Personal Access Token with `repo` scope for proxying release downloads. |
| `GITHUB_APP_ID` | *(Empty)* | GitHub App ID for enterprise automated token exchange. |
| `GITHUB_APP_INSTALLATION_ID` | *(Empty)* | GitHub App Installation ID. |
| `GITHUB_APP_PRIVATE_KEY` | *(Empty)* | RSA-256 private key PEM used to mint App JWTs. |
| `REQUIRE_LICENSE_AUTH` | `false` | Requires clients to provide a valid hardware fingerprint before returning updates. |

---

## 5. Master Configuration Files Analysis

### 5.1 `package.json`
- **Module Type**: `"type": "module"` (ESM across source files).
- **Core Scripts**:
  - `dev`: `tsx watch server.ts` (Live reload development).
  - `start`: `node server.ts` (Standard runtime start).
  - `build`: `vite build && npm run build:server` (Full production build: static frontend + CommonJS server bundle).
  - `build:server`: `esbuild server.ts --bundle --platform=node --format=cjs --target=node18 --outfile=server.cjs --external:vite` (Compiles TypeScript server to CJS).
  - `lint`: `tsc --noEmit` (Static type validation).
  - `test:ci`: Executes 8 headless unit test suites.
  - `test:integration`: Executes native FFmpeg and offline system tests.

### 5.2 `vite.config.ts`
- **Plugins**: `react()` (`@vitejs/plugin-react`) and `tailwindcss()` (`@tailwindcss/vite`).
- **Path Aliases**: `@/` maps to the project root directory.
- **HMR Controls**: Respects `process.env.DISABLE_HMR`.

### 5.3 `tsconfig.json`
- **Target**: `ES2022`.
- **Module Resolution**: `bundler`.
- **JSX Mode**: `react-jsx`.
- **Paths**: `"@/*": ["./*"]`.
- **Emit Control**: `"noEmit": true` (Compilation handled by bundlers).

### 5.4 `.gitattributes`
- Enforces text normalization: `* text=auto`.
- Windows script preservation: `*.bat text eol=crlf`, `*.ps1 text eol=crlf`, `*.iss text eol=crlf`.
- Binary preservation: `*.exe binary`, `*.mp4 binary`, `*.png binary`, `*.ico binary`, `*.bin binary`.

### 5.5 `installer/DubbingVidans_Setup.iss`
- **Application ID**: `{{5E973349-BDC5-44CA-835A-83B8122DE13B}}`.
- **Compression**: `lzma2/ultra64` with solid compression.
- **Architectures**: `x64compatible` only.
- **Installation Target**: `{autopf}\Dubbing Vidans`.
- **Shared Data**: `{commonappdata}\DubbingVidans` (configured for multi-user licensing).

---

## 6. Cryptographic Security & Boundary Rules

1. **Private Key Non-Commitment**:
   - Software Owner Licensing Key (`owner_private_key.pem`) is git-ignored and must never enter Git.
   - Update Signer Private Key (`update_signer_private_key.pem`) is git-ignored and configured solely as a GitHub Action Secret.
2. **Key Separation**:
   - The licensing public key (`MASTER_AUTHORITY_PUBLIC_KEY_PEM`) and update public key (`UPDATE_AUTHORITY_PUBLIC_KEY_PEM`) are completely isolated. Tampering with or swapping keys causes immediate cryptographic verification rejection.
3. **Zero Secret Storage in Client Code**:
   - Client code contains zero hardcoded API keys, tokens, or credentials.
   - User-supplied API keys are stored solely in the user's browser `localStorage`.
