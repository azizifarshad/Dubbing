# Dubbing Vidans - Professional AI Video Dubbing & Synchronization Studio

[![CI Status](https://github.com/azizifarshad/Dubbing/actions/workflows/ci.yml/badge.svg)](https://github.com/azizifarshad/Dubbing/actions/workflows/ci.yml)
[![Windows Integration](https://github.com/azizifarshad/Dubbing/actions/workflows/windows-integration.yml/badge.svg)](https://github.com/azizifarshad/Dubbing/actions/workflows/windows-integration.yml)
[![Repository Visibility: Private](https://img.shields.io/badge/visibility-private-red.svg)](https://github.com/azizifarshad/Dubbing)
[![Security Policy](https://img.shields.io/badge/security-hardened-brightgreen.svg)](SECURITY.md)
[![License: Proprietary](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Persian Documentation](https://img.shields.io/badge/مستندات-فارسی-emerald.svg)](README.fa.md)

> **Important:** This repository is **STRICTLY PRIVATE** and proprietary. Do not publicly redistribute source code, internal APIs, or cryptographic keys.
> 
> 🇮🇷 **راهنمای فارسی:** برای مشاهده راهنما و مستندات کامل به زبان فارسی، به [README.fa.md](README.fa.md) مراجعه نمایید.

---

## Documentation Navigation

Detailed documentation manuals are available in both English and Persian:

| Manual | English Documentation (`docs/en/`) | Persian Documentation (`docs/fa/`) |
| :--- | :--- | :--- |
| **Installation & Setup** | [installation.md](docs/en/installation.md) | [installation.md](docs/fa/installation.md) |
| **Configuration & Env** | [configuration.md](docs/en/configuration.md) | [configuration.md](docs/fa/configuration.md) |
| **Architecture & Security** | [architecture.md](docs/en/architecture.md) | [architecture.md](docs/fa/architecture.md) |
| **CI/CD & Workflows** | [ci-cd.md](docs/en/ci-cd.md) | [ci-cd.md](docs/fa/ci-cd.md) |
| **Automatic Updates** | [automatic-updates.md](docs/en/automatic-updates.md) | [automatic-updates.md](docs/fa/automatic-updates.md) |
| **Security Policy** | [security.md](docs/en/security.md) | [security.md](docs/fa/security.md) |
| **Troubleshooting & FAQ** | [troubleshooting.md](docs/en/troubleshooting.md) | [troubleshooting.md](docs/fa/troubleshooting.md) |

---

## 1. Project Introduction

**Dubbing Vidans** (دوبله ویدانس) is an enterprise-grade, offline-capable desktop software studio for automatic video subtitle extraction, AI-powered English-to-Persian translation, voice synthesis, zero-drift timeline synchronization, and professional video branding.

The application operates with a local hybrid architecture:
- Modern single-page desktop UI powered by **React 19, TypeScript, Vite, and TailwindCSS**.
- Standalone local background server powered by **Node.js 18+ and Express** (bound to `127.0.0.1:3000`).
- Local speech recognition and audio/video muxing powered by **Python, Faster-Whisper, and FFmpeg**.
- Hardware-bound cryptographic licensing engine using **Ed25519 digital signatures** in `C:\ProgramData\DubbingVidans`.
- Secure, multi-user automatic update delivery system with **cryptographic manifest verification** via dedicated update gateway.

---

## 2. Key Features

- **Automated Audio & Subtitle Extraction:** Direct extraction of high-fidelity audio (WAV 44.1kHz / 48kHz) and embedded subtitle streams (SRT, VTT, MOV_TEXT) from video files.
- **Local Zero-Cloud Transcription (Faster-Whisper):** Transcribes audio locally on the user's computer with zero cloud API costs.
- **Smart English-to-Persian Translation:** Context-aware translation supporting Hormouz AI (`openai/gpt-6-luna`), OpenAI-compatible endpoints, and an offline local translation engine.
- **Voice Synthesis Studio:** Multi-speaker Persian voice generation (Gemini TTS / OpenAI TTS / offline synthesis) with adjustable tempo, pitch, and character emotion profiles.
- **Balanced Duration-Aware Audio Sync:** Patented synchronization engine with zero-silence trimming, rubber-band pitch-preserving time stretching (0.85x–1.30x), and flexible timeline collision avoidance.
- **Branding & Export Pipeline:** One-click automated export integrating branded video intro, normalized audio ducking, and custom logo watermarking.
- **Offline Hardware-Bound Licensing:** Single-machine perpetual offline licensing bound to CPU ID, BIOS UUID, and disk serial numbers.
- **Multi-User Secure Auto-Updater:** Automatic detection, SHA-256 validation, and background download of updates without requiring users to hold GitHub accounts or access the private repository.

---

## 3. Supported Operating Systems & Requirements

| Operating System | Architecture | Support Status | Distribution Package |
| :--- | :--- | :--- | :--- |
| **Windows 10 / 11 / Server** | `x64` (64-bit) | **Primary (Full Native)** | Standalone Inno Setup (`Dubbing-Vidans-Setup.exe`) |
| **macOS 12+ (Monterey, Sonoma, Sequoia)** | `x64` / `arm64` | Supported (CLI / Server) | `start-dubbing.sh` + Node.js runtime |
| **Linux (Ubuntu, Debian, Fedora)** | `x64` | Supported (CLI / Server) | `start-dubbing.sh` + Node.js runtime |

### Hardware Requirements
- **CPU:** 64-bit Intel/AMD Dual-core (Quad-core recommended for local Whisper).
- **RAM:** Minimum 4 GB (8 GB recommended).
- **Storage:** 2 GB available disk space.

---

## 4. Installation & Execution Modes

### Standard Windows Installation
1. Download `Dubbing-Vidans-Setup.exe` from your software distributor.
2. Run with Administrative privileges to install to `C:\Program Files\Dubbing Vidans`.
3. Launch via the desktop shortcut.

### Portable Execution (Zero-Installation)
1. Extract the portable distribution to any folder (e.g., `D:\DubbingVidans`).
2. Run `DubbingVidans.exe` or `Start-DubbingVidans.bat`.
3. Licenses and machine identity remain safely anchored in `C:\ProgramData\DubbingVidans` (or `.license_data` fallback).

For detailed setup instructions, see [docs/en/installation.md](docs/en/installation.md).

---

## 5. Offline Licensing & Activation

Dubbing Vidans features an enterprise Ed25519 asymmetric cryptographic licensing architecture:
1. Open the **License Management Modal** in the application header.
2. Click **Generate Activation Request** to export your machine's `.vidansreq` file.
3. Send `.vidansreq` to the software owner (`azizifarshad@hotmail.com`).
4. The owner signs a permanent license (`.vidanslic`) matching your CPU, BIOS UUID, and disk serial numbers.
5. Import `.vidanslic` into the application. The license is installed into machine-wide storage (`C:\ProgramData\DubbingVidans`) and verified permanently offline.

---

## 6. How Multi-User Automatic Updates Work

The automatic update system operates independently of application licensing:
1. **Zero Client Secrets:** End users require no GitHub account or Personal Access Token.
2. **Reverse Proxy Gateway:** The standalone `update-server/` service authenticates with the private GitHub repository server-side.
3. **Dedicated Key Signing:** Releases are signed with an Ed25519 update key (`UPDATE_SIGNING_PRIVATE_KEY`), strictly distinct from the licensing master key.
4. **Package Integrity:** The client verifies both SHA-256 checksums and digital signatures before installation.
5. **License Preservation:** Updates replace program binaries in `Program Files` while strictly protecting `C:\ProgramData\DubbingVidans`.

For full technical specifications, see [docs/en/automatic-updates.md](docs/en/automatic-updates.md).

---

## 7. Version Management & Semantic Versioning

Dubbing Vidans strictly adheres to [Semantic Versioning 2.0.0](https://semver.org/):
```
MAJOR.MINOR.PATCH (e.g., 1.0.1)
```
- **Stable Channel:** Production releases thoroughly validated via CI/CD.
- **Beta Channel:** Optional preview builds for early feature evaluation.

---

## 8. Security & Vulnerability Reporting

Please refer to [SECURITY.md](SECURITY.md) and [docs/en/security.md](docs/en/security.md) for full details.
- To report vulnerabilities responsibly, email **Farshad Azizi** directly at `azizifarshad@hotmail.com`.

---

## 9. Contact and Support

- **Lead Architect & Developer:** Farshad Azizi
- **Email:** `azizifarshad@hotmail.com`
- **Private Repository:** `https://github.com/azizifarshad/Dubbing.git`
