# 04 - Application Architecture & End-to-End Workflow

## Executive Summary

**Dubbing Vidans** employs a hybrid client-server desktop architecture designed for resilience, modularity, and complete offline capability.

Rather than relying on resource-intensive frameworks like Electron, Dubbing Vidans utilizes a lightweight **Native C# Process Host** (`launcher.cs` / `DubbingVidans.exe`) that starts an isolated local Node.js Express server (`server.cjs`) and embeds the web application inside a dedicated Microsoft Edge or Google Chrome application window (`--app` mode).

This document details the architectural layers, system workflows, data flows, persistence mechanisms, and cryptographic security models of the application.

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph Host["Host Operating System (Windows 10 / 11 x64)"]
        subgraph LauncherSub["Desktop Application Host"]
            EXE["DubbingVidans.exe (C# WinForms / Process Launcher)"]
            APP["Chromium App Window (Edge / Chrome --app mode)"]
            EXE -->|Spawns with isolated user profile| APP
            EXE -->|Starts & Monitors Lifecycle| SRV["Local Node.js Server (Port 3000)"]
        end

        subgraph ClientLayer["Frontend Client (React 19 + Tailwind v4 + Web Audio API)"]
            APP --- UI["Dubbing Vidans Studio SPA"]
            UI --> State["Global Project State (App.tsx)"]
            State --> S1["Stage 1: File Ingestion"]
            State --> S2["Stage 2: Translation Studio"]
            State --> S3["Stage 3: Voice Synthesis"]
            State --> S4["Stage 4: Interactive Timeline & AutoFix"]
            State --> S5["Stage 5: Final Export Studio"]
            S4 --> DSP["Web Audio DSP: WSOLA Time-Stretching & VAD"]
        end

        subgraph ServerLayer["Backend Application Server (Express 4 / server.cjs)"]
            SRV --> REST["REST API Endpoints (/api/*)"]
            REST --> AuthMid["requireValidLicense Middleware"]
            AuthMid --> RenderEP["/api/render-dubbed-video"]
            REST --> STTEP["/api/transcribe-audio & video-to-srt"]
            REST --> TTSEP["/api/tts & time-stretch"]
            REST --> LicEP["/api/license/*"]
            REST --> UpdEP["/api/app-update/*"]
        end

        subgraph NativeEngines["Subprocess & Native Engine Execution"]
            STTEP -->|Spawn Python| WHISPER["local_whisper.py (Faster-Whisper / CTranslate2)"]
            RenderEP -->|Spawn Python| MUX["mux_video.py (FFmpeg / FFprobe)"]
            LicEP -->|CIM / PowerShell| HWID["Hardware Identity Engine"]
        end

        subgraph FileSystemStorage["Persistent Machine Storage & Assets"]
            LicEP -->|Machine-wide Storage| PDATA["C:\\ProgramData\\DubbingVidans\\license.vidanslic"]
            WHISPER -->|Local Weights| MDLS["models/faster-whisper-base/"]
            MUX -->|Branding Media| ASTS["assets/ (intro.mp4, logo.png)"]
            SRV -->|Portable Runtimes| RNT["runtime/ (node.exe, ffmpeg, python)"]
        end
    end

    subgraph CloudServices["External Cloud Services (Optional / Non-Blocking)"]
        REST -.->|Direct API| GEMINI["Google Gemini API (3.8 Flash / TTS)"]
        REST -.->|Direct API| HORMOUZ["Hormouz AI / OpenAI Endpoints (GPT-6 Luna)"]
        UpdEP -.->|Check & Download| GHREL["GitHub Releases / Update Proxy Server"]
    end
```

---

## 2. End-to-End Application Workflow

The primary business workflow transitions through five consecutive post-production stages:

```mermaid
sequenceDiagram
    autonumber
    actor User as Video Editor / Creator
    participant UI as Studio UI (React 19)
    participant Srv as Local Express Server
    participant Py as Python / FFmpeg Engines
    participant AI as Gemini / Hormouz / Local AI

    Note over User, AI: Stage 1: Media Ingest & Speech Extraction
    User->>UI: Drop Video File (MP4/MKV)
    UI->>Srv: Upload Video (/api/convert-video-to-wav)
    Srv->>Py: Execute FFmpeg audio extraction
    Py-->>Srv: Return 16-bit 44.1kHz Stereo PCM WAV
    Srv-->>UI: Return AudioBuffer for Timeline
    alt Automatic Speech-to-Text Requested
        UI->>Srv: Request Transcription (/api/transcribe-video-to-srt)
        alt Offline Mode
            Srv->>Py: Spawn local_whisper.py (models/faster-whisper-base)
            Py-->>Srv: Output JSON word-level timestamps & VAD segments
        else Cloud Mode
            Srv->>AI: Send Audio Base64 to Gemini Multimodal Audio Model
            AI-->>Srv: Return JSON segments with precise start/end timestamps
        end
        Srv-->>UI: Return formatted SubtitleItem[] array & SRT text
    end

    Note over User, AI: Stage 2: Translation & Candidate Scoring
    User->>UI: Trigger Batch Translation
    UI->>Srv: Post English Dialogue Lines (/api/translate-subtitles)
    Srv->>AI: Prompt Model with Lip-Sync & Duration Constraints
    AI-->>Srv: Return 3 Candidates: Faithful, Concise, Conversational
    Srv->>Srv: Candidate Scorer: Predict Persian Duration & Validate Negation/Numbers
    Srv-->>UI: Return Ranked Candidates with Duration Meters & Validation Badges
    User->>UI: Review, Adjust, or Accept Translations

    Note over User, AI: Stage 3: Voice Synthesis & Character Casting
    User->>UI: Assign Voices to Speakers (Puck, Charon, Kore, etc.)
    UI->>Srv: Request TTS Synthesis (/api/tts)
    alt Cloud Mode
        Srv->>AI: Synthesize Audio via Gemini TTS / Edge TTS
        AI-->>Srv: Return Synthesized Speech Audio
    else Offline Mode
        UI->>UI: Synthesize Procedural Speech via Web Audio API (Harmonic F0 synthesis)
    end
    UI->>UI: Attach audioBuffer & measure actual duration vs video target

    Note over User, AI: Stage 4: Interactive Timeline & 6-Stage AutoFix
    User->>UI: Navigate to Interactive Timeline
    UI->>UI: Profile Audio Waveforms: Measure dead silence vs vocal phonation
    UI->>UI: Detect Collisions & Overlaps (Classify minor, moderate, severe, intentional)
    alt Auto-Fix Timeline Triggered
        UI->>UI: Stage 3: Zero-Silence Trimming (15ms attack / 30ms release cushion)
        UI->>UI: Stage 4: Flexible Placement (Shift earlier/later into available gaps)
        UI->>UI: Stage 5: WSOLA Discrete Speed Adjustment (1.00x, 1.10x, 1.20x, max 1.30x)
        opt Unresolvable Overflow
            UI->>Srv: Request Text Shortening (/api/adapt-translation-duration)
        end
        UI->>UI: Re-render AudioBuffers & Update Timeline Waveforms (100% Undoable)
    end

    Note over User, AI: Stage 5: Branding, Multiplexing & Video Export
    User->>UI: Configure Branding (Intro Video, Watermark Logo, Bitrate)
    UI->>UI: Mix Dubbed Audio Tracks (audioMixer.ts)
    UI->>Srv: Upload Master Audio WAV (/api/upload-dubbed-audio)
    UI->>Srv: Request Video Rendering (/api/render-dubbed-video)
    Srv->>Srv: Enforce requireValidLicense Check
    Srv->>Py: Spawn mux_video.py (Source Video + Dubbed Audio + Intro + Watermark)
    Py->>Py: Normalize video to 1080p, concat cached intro, overlay watermark logo
    Py-->>Srv: Return Finished Dubbed MP4
    Srv-->>UI: Download Final Branded Dubbed Video MP4
    UI-->>User: File Saved to User PC
```

---

## 3. Application Startup Process

```mermaid
flowchart TD
    Start([User Clicks DubbingVidans.exe or Desktop Shortcut]) --> Launch[launcher.cs AppLauncher.Main]
    Launch --> ResolveNode{Is Node.js Available?}

    ResolveNode -- Yes: In PATH / ProgramFiles / runtime/ --> PortCheck{Is Port 3000 Open?}
    ResolveNode -- No --> Winget[Attempt Background winget install OpenJS.NodeJS.LTS]
    Winget --> RecheckNode{Installed?}
    RecheckNode -- Yes --> PortCheck
    RecheckNode -- No --> AlertNode[Show MessageBox: Node.js Required] --> Halt([Exit])

    PortCheck -- Port Closed --> SpawnServer[Spawn Node.js: server.cjs / server.ts]
    PortCheck -- Port Already Open --> FindBrowser

    SpawnServer --> WaitLoop[Wait up to 60s for Port 3000 to Respond]
    WaitLoop --> ReadyCheck{Responsive?}
    ReadyCheck -- Yes --> FindBrowser[Locate Edge or Chrome Executable]
    ReadyCheck -- No --> AlertServer[Show Server Timeout Error] --> KillSrv[Kill Server] --> Halt

    FindBrowser --> BrowserFound{Browser Found?}
    BrowserFound -- Yes --> LaunchAppMode[Launch Browser: --app=http://localhost:3000 --window-size=1366,820]
    BrowserFound -- No --> LaunchDefault[Launch System Default Browser URL]

    LaunchAppMode --> WaitForExit[Wait for Browser Window to Close]
    LaunchDefault --> WaitForExit

    WaitForExit --> WindowClosed([User Closes Application Window])
    WindowClosed --> KillServer[Kill Background Node.js Server Process Tree taskkill /F /T]
    KillServer --> Terminate([Clean Termination])
```

---

## 4. Offline Cryptographic Licensing Architecture

The licensing subsystem guarantees 100% offline verification while locking the software to the customer's physical computer.

```mermaid
flowchart LR
    subgraph CustomerMachine["Customer PC (Dubbing Vidans Studio)"]
        HW[Query Windows Registry MachineGuid, BIOS UUID, CPU ID, Motherboard, Disk Serial]
        HW --> FP[Compute Hardware Fingerprint SHA-256]
        FP --> DevKey[Generate Ephemeral Ed25519 Device Key Pair]
        DevKey --> SigReq[Sign Canonical Request with Device Private Key]
        SigReq --> ReqFile["Export .vidansreq Activation Request File"]

        LicFile["Import .vidanslic Permanent License File"] --> VerifyLic{Verify Ed25519 Authority Signature against MASTER_AUTHORITY_PUBLIC_KEY_PEM}
        VerifyLic -- Valid --> MatchFP{Does Fingerprint in License Match Local PC?}
        VerifyLic -- Tampered / Invalid Key --> Reject[Reject License: invalid_signature]
        MatchFP -- Matches --> Install[Install to C:\\ProgramData\\DubbingVidans\\license.vidanslic]
        MatchFP -- Mismatch --> RejectFP[Reject License: fingerprint_mismatch]
        Install --> Unlocked[Studio Fully Unlocked: Permanent Active]
    end

    subgraph SoftwareOwner["Software Owner (LicenseGenerator.exe / CLI)"]
        ReqFile -.->|Sent via Email / Portal| OwnerApp[License Generator GUI]
        OwnerApp --> VerifyReq{Verify Device Signature in .vidansreq}
        VerifyReq -- Valid --> InputCust[Enter Customer Name & Select Features]
        InputCust --> SignLic[Sign Canonical License String with Owner Private Key owner_private_key.pem]
        SignLic --> LicFile
    end
```

### Deterministic Canonical String Serialization

To prevent JSON formatting discrepancies from invalidating cryptographic signatures across platforms, deterministic pipe-separated canonical strings are strictly used:

1. **Activation Request Canonical String**:
   $$\text{PRODUCT}=\dots|\text{VERSION}=1|\text{FINGERPRINT}=\dots|\text{DEVICE\_KEY}=\dots|\text{MACHINE}=\dots|\text{REQUESTED\_AT}=\dots$$

2. **Permanent License Canonical String**:
   $$\text{PRODUCT}=\dots|\text{VERSION}=1|\text{ID}=\dots|\text{CUSTOMER}=\dots|\text{FINGERPRINT}=\dots|\text{DEVICE\_KEY}=\dots|\text{TYPE}=\dots|\text{ISSUED}=\dots|\text{FEATURES}=\text{sorted,comma,separated}$$

---

## 5. Auto-Update Subsystem Architecture

The auto-update subsystem allows secure distribution of software patches from private or public GitHub repositories without embedding credentials in distributed client builds.

```mermaid
flowchart TD
    subgraph UpdateServer["Update Authority / Server (Port 4000)"]
        GH[GitHub Releases / API]
        USrv[Express Update Proxy update-server/src/server.ts]
        GHApp[GitHub App RSA-256 JWT Token Exchange]
        GHApp --> USrv
        USrv -->|Proxy Release Assets| Client
    end

    subgraph Client["Dubbing Vidans Desktop Client"]
        Check[User or Auto Timer: /api/app-update/check]
        Check --> FetchManifest[Fetch update-manifest.json & sha256sums.txt]
        FetchManifest --> VerSign{Verify Manifest Ed25519 Signature against UPDATE_AUTHORITY_PUBLIC_KEY_PEM}
        VerSign -- Invalid / Tampered --> AbortUpd[Abort: Signature Verification Failed]
        VerSign -- Valid Genuine Signature --> CompVer{Compare Version against Current 1.0.1}
        CompVer -- Newer Version Available --> Down[Download Installer Package]
        CompVer -- Up to Date --> Idle[No Update Required]
        Down --> HashCheck{Compute SHA-256 of Downloaded Package}
        HashCheck -- Mismatch --> Corrupt[Abort: Corrupted Package Detected]
        HashCheck -- Match --> Prompt[Prompt User: Restart & Install]
        Prompt --> ExecInstaller[Execute Installer with Silent / Auto Flags]
    end
```

---

## 6. Video Branding & Multiplexing Pipeline

`mux_video.py` orchestrates the final media production stage, implementing aspect-ratio preservation and high-speed intro concatenation:

```mermaid
flowchart TD
    VIn[Source Video File] --> VInfo[ffprobe: Extract Resolution, Duration, Audio Streams]
    AIn[Master Dubbed WAV Audio] --> Norm[Normalize Main Video: Scale to 1080p, Pad Aspect Ratio, Resample Audio to Stereo 48kHz]
    VInfo --> Norm

    IntroCheck{Include Intro Video?}
    IntroCheck -- Yes --> CacheCheck{Pre-rendered 1080p Intro in assets/cache?}
    CacheCheck -- Yes --> UseCache[Load intro_normalized_1080p.mp4 directly]
    CacheCheck -- No --> RenderIntro[Transcode raw intro.mp4 to 1080p 30fps]
    UseCache --> Concat[FFmpeg Concat Demuxer: Join Intro + Main Video]
    RenderIntro --> Concat
    IntroCheck -- No --> SkipIntro[Pass Normalized Video Directly]

    Concat --> LogoCheck{Include Watermark Logo?}
    SkipIntro --> LogoCheck

    LogoCheck -- Yes --> OverlayLogo[FFmpeg Overlay Filter: Scale Logo to 12% Width, Position at Top-Right with 2% Margin]
    LogoCheck -- No --> StreamCopy[Direct Stream Copy]

    OverlayLogo --> FinalMP4[Final Dubbed & Branded MP4 Video + Faststart Flags]
    StreamCopy --> FinalMP4
```

---

## 7. Data Persistence Architecture

Dubbing Vidans implements a four-tier data storage hierarchy:

| Storage Tier | Location | Contents | Persistence Lifecycle |
| :--- | :--- | :--- | :--- |
| **Machine-Wide System Storage** | `C:\ProgramData\DubbingVidans` | Permanent license (`license.vidanslic`), device identity (`device_identity.json`), shared model weights | Permanent across all Windows users; preserved during software upgrades |
| **User Application Data** | `%LOCALAPPDATA%\DubbingVidans\UserData` | Chromium profile, session storage, browser cache | User-specific; managed by Windows process launcher |
| **Browser Local Storage** | `localStorage` | API Keys (`persian_dub_api_key`), Base URL, selected models, update check preferences | Client-side; persists across browser sessions |
| **Operating System Temp Storage** | `%TEMP%` (`os.tmpdir()`) | Temporary audio chunks, intermediate WAV mixes, FFmpeg video segments | Ephemeral; automatically cleaned up after API response completion |
