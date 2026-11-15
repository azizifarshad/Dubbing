# 06. Auto-Update Troubleshooting Guide

## 1. Overview

This troubleshooting reference provides rapid diagnosis and remediation steps for issues related to GitHub-based updates, release discovery, downloading, and installation.

---

## 2. Common Issues & Solutions

### 2.1 Release Published on GitHub, But App Reports "Up to Date"

#### Symptom:
You published version `1.0.2` on GitHub, but users running `1.0.1` still see "شما در حال حاضر از آخرین نسخه پایدار نرم‌افزار استفاده می‌کنید."

#### Possible Causes & Solutions:
1. **In-Memory Cache (3-Minute Window)**:
   - *Cause*: To protect GitHub's unauthenticated API rate limits, update checks are cached in memory for 3 minutes.
   - *Solution*: Click **"بررسی مجدد آپدیت"** in the update modal to force an immediate, uncached query to GitHub, or wait 180 seconds.
2. **Release Marked as "Draft" or "Prerelease"**:
   - *Cause*: By default, users are on the **Stable** channel. The update engine strictly ignores draft releases and pre-releases.
   - *Solution*: Edit the release on GitHub and ensure **"Set as a pre-release"** and **"Save draft"** are NOT selected. Ensure **"Set as the latest release"** is checked.
3. **Repository Visibility (Private Repository)**:
   - *Cause*: If `https://github.com/azizifarshad/Dubbing` is set to **Private**, GitHub returns `HTTP 404 Not Found` to unauthenticated requests.
   - *Solution*:
     - **Option A (Recommended for Public Distribution)**: Change the GitHub repository settings to **Public**.
     - **Option B (For Private Testing)**: Add `GITHUB_TOKEN=your_token_here` into `.env` on test machines.
4. **SemVer Formatting**:
   - *Cause*: The tag name on GitHub does not numerically exceed the current app version (e.g., tag was named `1.0.0` or `v1.0.1`).
   - *Solution*: Ensure the tag name is formatted as `v1.0.2` (or `1.0.2`).

---

### 2.2 Update Available, But Download Fails

#### Symptom:
The update modal detects `v1.0.2`, but clicking **"به‌روزرسانی اکنون (Update Now)"** results in an error.

#### Possible Causes & Solutions:
1. **Missing `.exe` Binary Asset**:
   - *Cause*: You created the release tag on GitHub, but forgot to upload `Dubbing-Vidans-Setup.exe` to the release assets.
   - *Solution*: Go to the release on GitHub, click **Edit**, and drag & drop `dist-installer\Dubbing-Vidans-Setup.exe` into the assets section.
2. **Firewall / CDN Connection Interrupted**:
   - *Cause*: The user's internet connection or firewall is blocking `objects.githubusercontent.com` (GitHub's AWS S3 download CDN).
   - *Solution*: Check network connectivity, disable restrictive corporate proxies, or click **"تلاش مجدد"** in the update modal.

---

### 2.3 Rate Limit Exceeded (`HTTP 403`)

#### Symptom:
Update check returns:
```text
محدودیت موقت درگاه استعلام گیت‌هاب رخ داده است. لطفاً دقایقی دیگر مجدداً تلاش فرمایید.
```

#### Explanation & Remediation:
- GitHub allows **60 unauthenticated requests per hour** per IP address.
- The built-in 3-minute in-memory cache prevents normal users from ever hitting this limit.
- If developers make dozens of manual checks during intensive testing on the same Wi-Fi/IP, GitHub temporarily pauses queries until the top of the hour.
- *Remediation*: Developers can add a Personal Access Token (`GITHUB_TOKEN=ghp_xxx`) in `.env` to elevate the limit to **5,000 requests per hour**.

---

### 2.4 Cryptographic Signature Verification Failed

#### Symptom:
Update check rejects the release with:
```text
امضای دیجیتال بسته به‌روزرسانی نامعتبر است. جهت حفظ امنیت از دریافت آن خودداری شد.
```

#### Cause & Remediation:
- *Cause*: An `update-manifest.json` file was uploaded to the release, but its cryptographic signature does not match the public key embedded in `server.ts` / `src/utils/updateConfig.ts`.
- *Remediation*: Regenerate the manifest signature using the dedicated authority key in `tools/update-signer/keys/` and re-upload `update-manifest.json` to the release. If cryptographic signing is not required, simply omit `update-manifest.json`—the system will safely fallback to direct SHA-256 verification and `browser_download_url`.

---

### 2.5 Installer Fails to Overwrite Running Application Files

#### Symptom:
The installer runs, but displays an error that a file is in use.

#### Solution:
- In `server.ts`, `/api/app-update/install` spawns the Inno Setup installer detached and automatically terminates the server process (`process.exit(0)`) after 1.5 seconds to release file locks.
- If testing in development mode via `npm run dev` with file watchers active, ensure all terminal instances of `npm run dev` are closed before running the installer.
