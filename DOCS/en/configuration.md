# Configuration & Environment Guide

This document describes all configuration settings, environment variables, network endpoints, and model parameters for **Dubbing Vidans** desktop and update gateway.

---

## 1. Desktop Application Configuration (`.env`)

The desktop application reads runtime parameters from a `.env` file located in the application root directory. When distributed via installer, sensible defaults are compiled into `server.cjs`.

### Environment Variables Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Local HTTP port the background server listens on. |
| `HOST` | `127.0.0.1` | Network interface to bind. Restricted to loopback for local security. |
| `API_BASE_URL` | `https://api.hormouz.net/v1` | Base URL for OpenAI-compatible AI translation service. |
| `HORMOUZ_API_KEY` | *(Empty)* | API Key for Hormouz translation and dubbing services. |
| `TRANSLATION_MODEL` | `openai/gpt-6-luna` | Model identifier used for context-aware English-to-Persian translation. |
| `TTS_MODEL` | `google/gemini-3.8-flash-lite-tts` | Model identifier used for multi-speaker Persian voice synthesis. |
| `GEMINI_API_KEY` | *(Empty)* | Optional direct Google Gemini API key if using Gemini directly. |
| `UPDATE_SERVER_URL` | `http://localhost:4000` | URL of the dedicated multi-user update gateway service. |

### Sample `.env` Configuration
```env
# Network and server binding
PORT=3000
HOST=127.0.0.1

# AI Translation Engine (Hormouz / OpenAI-Compatible)
API_BASE_URL=https://api.hormouz.net/v1
HORMOUZ_API_KEY=your_hormouz_api_key_here
TRANSLATION_MODEL=openai/gpt-6-luna

# Voice Synthesis Configuration
TTS_MODEL=google/gemini-3.8-flash-lite-tts
GEMINI_API_KEY=

# Multi-User Auto-Update Gateway
UPDATE_SERVER_URL=https://updates.vidans.ir
```

---

## 2. Multi-User Update Gateway Configuration (`update-server/.env`)

The update server acts as a secure server-side reverse proxy between client applications and the private GitHub repository.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port for the update gateway service. |
| `GITHUB_REPO_OWNER` | `azizifarshad` | GitHub owner or organization name. |
| `GITHUB_REPO_NAME` | `Dubbing` | Repository name (permanently private). |
| `GITHUB_APP_ID` | *(Optional)* | GitHub App ID for server-side authentication. |
| `GITHUB_APP_INSTALLATION_ID` | *(Optional)* | GitHub App Installation ID on the repository. |
| `GITHUB_APP_PRIVATE_KEY` | *(Optional)* | RS256 Private key string for minting installation tokens. |
| `GITHUB_APP_PRIVATE_KEY_PATH`| *(Optional)* | Path to private key PEM file for GitHub App. |
| `GITHUB_TOKEN` | *(Optional)* | Fine-grained PAT with `contents:read` scope as alternative to App. |
| `REQUIRE_LICENSE_AUTH` | `false` | When true, rejects requests lacking valid `X-Hardware-Fingerprint`. |
| `NODE_ENV` | `production` | Node execution environment. |

---

## 3. Path Precedence and Binary Discovery

The application automatically checks for local portable runtimes before falling back to system binaries:
1. **FFmpeg & FFprobe:**
   - `<appDir>/runtime/ffmpeg/ffmpeg.exe`
   - `<appDir>/ffmpeg.exe`
   - System `PATH` (`ffmpeg` / `ffprobe`)
2. **Python:**
   - `<appDir>/runtime/python/python.exe`
   - `<appDir>/python.exe`
   - System `PATH` (`python` / `python3`)
3. **Machine-Wide License Directory:**
   - `%ProgramData%\DubbingVidans` (Windows default: `C:\ProgramData\DubbingVidans`)
   - `<appDir>/.license_data` (Portable / Linux fallback)
