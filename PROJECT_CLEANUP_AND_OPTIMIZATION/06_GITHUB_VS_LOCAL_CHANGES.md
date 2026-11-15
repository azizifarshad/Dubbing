# 06. GitHub vs. Local Workspace Discrepancy & Change Log

## 1. Executive Summary

This report provides a comprehensive comparison between the remote Git repository (`https://github.com/azizifarshad/Dubbing.git` on branch `main`) and the local Windows workspace (`C:\Users\Sadra\Desktop\Sadra\Dub\Dubbing`). It documents the exact files modified, deleted, preserved, and untracked, clarifying the technical purpose of every divergence.

> [!IMPORTANT]
> All changes described herein were performed on an isolated local Git branch named `cleanup-and-optimization`. No commits were pushed to the remote GitHub repository, preserving the upstream repository state while allowing thorough local verification.

---

## 2. Git Branch & Working Tree Status

```text
Current Branch: cleanup-and-optimization
Upstream Tracking: origin/main
Working Directory: C:\Users\Sadra\Desktop\Sadra\Dub\Dubbing
```

### Git Status Overview:
- **Tracked files modified**: 5 files (`mux_video.py`, `server.ts`, `server.cjs`, `src/components/ExportStudio.tsx`, `vite.config.ts`)
- **Tracked files safely deleted**: 9 files (`assets/Final  (1).mp4`, `assets/Logo-Vidans .png`, `assets/logos/Logo-Vidans - Copy.png`, `assets/logos/Logo-Vidans Reverse copy.png`, `public/assets/Final  (1).mp4`, `public/assets/Logo-Vidans .png`, `public/assets/Logo-Vidans.png`, `public/assets/intro.mp4`, `public/assets/logo_watermark.png`)
- **Untracked directories**:
  - `PROJECT_AUDIT_DOCUMENTATION/` (Audit reports & PDF outputs)
  - `PROJECT_CLEANUP_AND_OPTIMIZATION/` (Cleanup & optimization reports)
  - `requirements.txt` (Newly created standardized Python dependency manifest)
  - `runtime/` (Bundled Python runtime, git-ignored)
  - `dist-installer/` (Official Inno Setup installer build, git-ignored)
  - `Sadra/` (Local Persian distribution and license generator packages)

---

## 3. Detailed File-by-File Comparison

| File / Directory Path | Status | Origin | Technical Explanation & Justification |
| :--- | :--- | :--- | :--- |
| `server.ts` | Modified | Local | Added `errorMessageFa?: string;` to `AppUpdateState.progress` to fix `TS2561` lint error. Added immutable static caching headers for production bundle serving (`maxAge: '1y'`, `immutable: true`). |
| `server.cjs` | Modified | Local | Recompiled output of `server.ts` generated via `npm run build:server` (`esbuild server.ts --bundle --platform=node`). Contains the updated Express type fixes and static caching logic. |
| `vite.config.ts` | Modified | Local | Modernized to use `import.meta.dirname` (fixing Vite native ESM warning). Configured `manualChunks` function for Rolldown/Vite 8 to split `vendor-react` and `index`. |
| `src/components/ExportStudio.tsx` | Modified | Local | Updated UI metadata tag from `Logo-Vidans .png` (with space) to canonical `Logo-Vidans.png`. |
| `mux_video.py` | Modified | Local | Updated asset lookup order to prioritize canonical filenames (`intro.mp4`, `Logo-Vidans.png`) while maintaining backward-compatible fallbacks. |
| `assets/Final  (1).mp4` | Deleted | Local & Git | Exact duplicate of `assets/intro.mp4` (SHA-256 identical, 11 MB). Safely removed to eliminate redundancy. |
| `assets/Logo-Vidans .png` | Deleted | Local & Git | Duplicate image with a trailing space in filename. Replaced by canonical `assets/Logo-Vidans.png`. |
| `assets/logos/Logo-Vidans - Copy.png` | Deleted | Local & Git | Duplicate backup file created in the `logos/` subdirectory. |
| `assets/logos/Logo-Vidans Reverse copy.png` | Deleted | Local & Git | Duplicate inverted logo image. Canonical version is in `assets/Logo-Vidans Reverse.png`. |
| `public/assets/*` (5 files) | Deleted | Local & Git | Duplicated copies of intro videos and logos in `public/assets/` were copied into `dist/assets/` on every build, bloating the frontend bundle by 11.6 MB. Safely removed. |
| `Sadra/2-ابزار صدور لایسنس/keys/owner_private_key.pem` | Deleted | Local only | **CRITICAL SECURITY FIX**: Removed an uncommitted raw copy of the Master Licensing Authority Ed25519 Private Key. Canonical key is strictly preserved in `tools/license-generator/keys/`. |
| `Dubb/` | Deleted | Local only | Untracked nested git clone directory. Safely removed, freeing 4 MB. |
| `Dubbing-Vidans-Setup.exe` (Root) | Deleted | Local only | Outdated 365 MB installer located in project root. The official v1.0.1 installer is properly preserved in `dist-installer/`. |
| `build/` | Deleted | Local only | 52 MB stale PyInstaller build cache from previous compilations. |
| `tools/license-generator/build/` | Deleted | Local only | 20 MB PyInstaller intermediate build cache. Safely removed without affecting `dist/LicenseGenerator.exe`. |
| `requirements.txt` | Created | Local | Newly created standardized Python manifest documenting exact runtime dependencies for speech, TTS, and cryptography. |
| `PROJECT_AUDIT_DOCUMENTATION/` | Created | Local | Contains the 9 original comprehensive audit markdown reports, Persian translations, and generated PDF files. |
| `PROJECT_CLEANUP_AND_OPTIMIZATION/` | Created | Local | Contains the 9 cleanup, optimization, and verification reports. |

---

## 4. Why Local Differs From GitHub

1. **Local Windows Distribution Packages**:
   The local repository is used as an active build and distribution environment. Folders like `runtime/` (bundled Python 3.11 with Faster-Whisper, PyTorch, CTranslate2, and Edge-TTS) and `dist-installer/` (Inno Setup artifacts) exist locally to package the standalone offline Windows executable.
2. **Security Isolation Policy**:
   The remote GitHub repository intentionally does not track `runtime/`, installer binaries, or license generation private keys to prevent repository bloat and maintain zero-credential distribution.
3. **Asset Deduplication**:
   Over the course of rapid development, duplicate media files (`Final  (1).mp4`, `Logo-Vidans .png`) accumulated in Git. Removing these files on the cleanup branch prevents future clone operations from downloading redundant assets.

---

## 5. Recommended Git Workflow for Project Maintainer

When the project owner is ready to integrate these optimizations into `main`:

```bash
# 1. Inspect the staged changes on the cleanup branch
git status

# 2. Stage the verified code optimizations and deletions
git add mux_video.py server.ts server.cjs src/components/ExportStudio.tsx vite.config.ts requirements.txt
git add -u assets/ public/

# 3. Create a clean, descriptive commit
git commit -m "chore(opt): deduplicate assets, fix TS2561, modernize Vite config & code splitting"

# 4. Optional: Review branch against main before merging
git diff main..cleanup-and-optimization

# 5. Merge into main when satisfied
git checkout main
git merge cleanup-and-optimization
```
