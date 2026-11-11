# Troubleshooting & Operational Guide

This document contains diagnostics, solutions for common errors, and verification steps for **Dubbing Vidans**.

---

## 1. Installation & Startup Issues

### Problem 1.1: Launcher reports "Port 3000 is already in use"
- **Cause:** Another process or previous instance of Dubbing Vidans is using TCP port 3000.
- **Solution:**
  1. Open PowerShell and find the conflicting PID:
     ```powershell
     Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object OwningProcess
     ```
  2. Terminate the stale process, or configure a different port in `.env`:
     ```env
     PORT=3001
     ```

### Problem 1.2: Native launcher fails to compile or start
- **Cause:** Missing Microsoft .NET Framework or path misconfiguration.
- **Solution:** Ensure .NET Framework 4.5 or higher is installed (standard on Windows 10/11). You can also run the application directly using:
  ```powershell
  Start-DubbingVidans.bat
  ```

---

## 2. Licensing & Activation Issues

### Problem 2.1: License status shows "hardware_mismatch"
- **Cause:** The license file was copied from a different computer or a major motherboard/BIOS replacement occurred.
- **Solution:**
  1. Click **دریافت فایل درخواست فعال‌سازی** in the application header or license modal.
  2. Save the `.vidansreq` file and send it to support (`azizifarshad@hotmail.com`).
  3. Import the newly generated `.vidanslic` license file.

### Problem 2.2: Permission denied when saving license file
- **Cause:** Standard user account cannot write to `C:\ProgramData\DubbingVidans`.
- **Solution:** Run Dubbing Vidans once with "Run as Administrator" to initialize machine-wide permissions, or install the application using `Dubbing-Vidans-Setup.exe`.

---

## 3. Media Processing & AI Execution

### Problem 3.1: Offline Faster-Whisper transcription fails
- **Cause:** Missing local model directory or Python soundfile/whisper dependencies.
- **Solution:**
  1. Verify `models/faster-whisper-base/model.bin` exists.
  2. Test local Python execution manually:
     ```powershell
     python local_whisper.py <path_to_audio.mp3> base
     ```
  3. Ensure `pip install faster-whisper soundfile` is completed.

### Problem 3.2: FFmpeg error during video export or audio conversion
- **Cause:** FFmpeg binary is missing from `PATH` and `runtime/ffmpeg/`.
- **Solution:** Verify `ffmpeg.exe` and `ffprobe.exe` are placed in `runtime/ffmpeg/` or installed system-wide.

---

## 4. Automatic Update Diagnostics

### Problem 4.1: Update check returns "Failed to check for updates"
- **Cause:** `UPDATE_SERVER_URL` in `.env` is unreachable, or the update gateway service is offline.
- **Solution:**
  1. Test connectivity to the update gateway health endpoint:
     ```powershell
     curl.exe http://localhost:4000/health
     ```
  2. Verify that `update-server` has valid GitHub authentication configured (`GITHUB_TOKEN` or `GITHUB_APP_ID`).

### Problem 4.2: Update download fails with "Checksum mismatch"
- **Cause:** Downloaded binary was corrupted during transit or was tampered with.
- **Solution:** The application automatically deletes the corrupted download. Check network stability and retry.
