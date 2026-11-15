# 03. Implementation Details

## 1. Executive Summary

This document describes the concrete code changes made across the Dubbing Vidans codebase to transition from the legacy `localhost:4000` model to the direct, production-grade GitHub Releases update architecture.

---

## 2. Server-Side Modifications (`server.ts`)

### 2.1 Removal of `localhost:4000` & Configuration of GitHub Endpoints

**File**: `server.ts` (lines 2989–3000)

```typescript
// SECURE AUTOMATIC UPDATE SUBSYSTEM (DIRECT GITHUB RELEASES INTEGRATION)
const CURRENT_APP_VERSION = '1.0.1';
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'azizifarshad';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'Dubbing';
const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;
// Optional custom gateway URL (empty by default; if provided, it will be queried as alternative authority)
const UPDATE_SERVER_URL = (process.env.UPDATE_SERVER_URL || '').replace(/localhost:4000\/?$/i, '').trim();

interface UpdateCheckCache {
  timestamp: number;
  channel: string;
  data: any;
}
let updateCheckCache: UpdateCheckCache | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache to avoid GitHub rate limits
```

### 2.2 Direct GitHub Releases Query Endpoint (`/api/app-update/check`)

**Key Capabilities Implemented**:
1. **Cache Validation**: Serves cached responses within a 3-minute window unless `force: true` is passed.
2. **Public API Query**: Queries `https://api.github.com/repos/azizifarshad/Dubbing/releases?per_page=15` using standard browser headers (`Accept: application/vnd.github.v3+json`, `User-Agent: DubbingVidans-Client/1.0.1`).
3. **Optional Token Support**: If `process.env.GITHUB_TOKEN` is present, it is added as an authorization header, enabling seamless private repository testing or elevated rate limits.
4. **Graceful 404 & Empty Response Handling**: Treats missing releases or empty lists as `up_to_date` instead of crashing.
5. **Asset & Manifest Discovery**: Searches for Windows x64 `.exe` installers and parses optional `update-manifest.json` metadata.

```typescript
app.post('/api/app-update/check', async (req: Request, res: Response) => {
  const reqChannel = req.body?.channel || appUpdateState.channel;
  const force = Boolean(req.body?.force);
  appUpdateState.channel = reqChannel;

  // 1. Return in-memory cache if valid and check is not forced
  const now = Date.now();
  if (!force && updateCheckCache && updateCheckCache.channel === reqChannel && (now - updateCheckCache.timestamp < CACHE_TTL_MS)) {
    return res.json(updateCheckCache.data);
  }

  // 2. Direct GitHub query
  const ghHeaders: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': `DubbingVidans-Client/${appUpdateState.currentVersion}`,
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) ghHeaders['Authorization'] = `token ${token}`;

  try {
    const ghRes = await fetch(`${GITHUB_RELEASES_API}?per_page=15`, {
      headers: ghHeaders,
      signal: AbortSignal.timeout(12000),
    });

    if (ghRes.status === 404) {
      // Graceful up-to-date response
      const noReleaseData = {
        updateAvailable: false,
        currentVersion: appUpdateState.currentVersion,
        latestVersion: appUpdateState.currentVersion,
        channel: reqChannel,
        status: 'up_to_date' as const,
        messageFa: 'شما در حال حاضر از آخرین نسخه پایدار نرم‌افزار استفاده می‌کنید.',
      };
      updateCheckCache = { timestamp: now, channel: reqChannel, data: noReleaseData };
      return res.json(noReleaseData);
    }
    ...
```

### 2.3 Streaming Installer Download & Checksum Verification (`/api/app-update/download`)

- Follows HTTPS redirects from GitHub Releases to AWS S3/GitHub CDN storage.
- Streams the binary to `updates/Dubbing-Vidans-Setup.exe`.
- Dynamically computes SHA-256 during streaming to verify file integrity without secondary disk reads.
- Reports live progress (`progressPercent`, `downloadedBytes`, `totalBytes`) to the polling client.

### 2.4 Silent Installer Launch & Process Handoff (`/api/app-update/install`)

- Spawns the Inno Setup executable in detached mode (`spawn(filePath, ['/SILENT'], { detached: true, stdio: 'ignore' })`).
- Releases child process handle (`child.unref()`).
- Flushes the HTTP response to the client.
- Terminates the Node.js server gracefully (`process.exit(0)`) after 1,500 ms to eliminate Windows file locking on executable binaries.

---

## 3. Frontend Modifications (`src/App.tsx`)

### 3.1 Startup Auto-Check & Session-Aware Update Modal

**File**: `src/App.tsx` (lines 77–105)

```typescript
  useEffect(() => {
    checkLicense();
    // Auto-check for updates on application startup
    fetchUpdateStatus()
      .then(async (status) => {
        // If an update was already detected in background cache
        if (status?.updateInfo?.updateAvailable && status.updateInfo.latestVersion) {
          setHasUpdateAvailable(true);
          const dismissedKey = `vidans_dismissed_update_${status.updateInfo.latestVersion}`;
          if (!sessionStorage.getItem(dismissedKey)) {
            setIsUpdateModalOpen(true);
          }
          return;
        }

        // If auto-update is enabled, check GitHub Releases
        if (status?.autoUpdateEnabled) {
          try {
            const checkRes = await checkForUpdates(status.channel || 'stable');
            if (checkRes?.updateAvailable && checkRes.latestVersion) {
              setHasUpdateAvailable(true);
              const dismissedKey = `vidans_dismissed_update_${checkRes.latestVersion}`;
              if (!sessionStorage.getItem(dismissedKey)) {
                setIsUpdateModalOpen(true);
              }
            }
          } catch {
            // Silently ignore startup network/offline errors to keep application launch smooth
          }
        }
      })
      .catch(() => {});
  }, []);
```

---

## 4. UI Modal Enhancements (`src/components/UpdateModal.tsx`)

### 4.1 "Update Now" and "Later" Buttons with Session Dismissal

**File**: `src/components/UpdateModal.tsx` (lines 470–515)

- Added clear **"به‌روزرسانی اکنون (Update Now)"** button triggering direct streaming.
- Added **"بعداً (Later)"** button storing the dismissed version in `sessionStorage` (`vidans_dismissed_update_${version}`) to prevent repetitive prompts during the same session.
- Added dynamic progress indicators with percentage and animated spinners during downloads.
- Added **"نصب و راه‌اندازی مجدد نرم‌افزار (Install & Restart)"** button for seamless execution.

---

## 5. Automated Verification Test Suite (`tests/githubAutoUpdate.test.ts`)

A dedicated comprehensive automated test suite was authored and integrated into `package.json` under `npm run test:ci`:
- Verifies SemVer comparison across edge cases (`1.0.10` > `1.0.9`, `2.0.0` > `1.9.9`).
- Verifies channel filtering (stable channel ignores prereleases and drafts).
- Verifies Windows x64 `.exe` installer asset resolution.
- Verifies HTTP 404 / empty release graceful handling.
- Verifies `sessionStorage` dismissal logic.
- Verifies SHA-256 hash validation and corrupted package rejection.
