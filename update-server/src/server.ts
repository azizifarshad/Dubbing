import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'azizifarshad';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'Dubbing';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_APP_ID = process.env.GITHUB_APP_ID || '';
const GITHUB_APP_INSTALLATION_ID = process.env.GITHUB_APP_INSTALLATION_ID || '';
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY || '';
const GITHUB_APP_PRIVATE_KEY_PATH = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
const REQUIRE_LICENSE_AUTH = process.env.REQUIRE_LICENSE_AUTH === 'true';

// Token cache for GitHub App installation token
let cachedInstallationToken: { token: string; expiresAt: number } | null = null;

function getAppPrivateKey(): string {
  if (GITHUB_APP_PRIVATE_KEY) return GITHUB_APP_PRIVATE_KEY;
  if (GITHUB_APP_PRIVATE_KEY_PATH && fs.existsSync(GITHUB_APP_PRIVATE_KEY_PATH)) {
    try {
      return fs.readFileSync(GITHUB_APP_PRIVATE_KEY_PATH, 'utf8');
    } catch {}
  }
  return '';
}

function createGitHubAppJwt(appId: string, privateKeyPem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60, // 9 minutes expiration
    iss: appId,
  };
  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const dataToSign = `${b64Header}.${b64Payload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(dataToSign);
  const signature = sign.sign(privateKeyPem, 'base64url');
  return `${dataToSign}.${signature}`;
}

async function getEffectiveGitHubToken(): Promise<string> {
  const privateKey = getAppPrivateKey();
  if (GITHUB_APP_ID && GITHUB_APP_INSTALLATION_ID && privateKey) {
    if (cachedInstallationToken && cachedInstallationToken.expiresAt > Date.now() + 60000) {
      return cachedInstallationToken.token;
    }
    const jwt = createGitHubAppJwt(GITHUB_APP_ID, privateKey);
    const url = `https://api.github.com/app/installations/${GITHUB_APP_INSTALLATION_ID}/access_tokens`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Dubbing-Update-Server/1.0',
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub App token exchange failed (${res.status}): ${err}`);
    }
    const data: any = await res.json();
    cachedInstallationToken = {
      token: data.token,
      expiresAt: new Date(data.expires_at).getTime(),
    };
    return data.token;
  }
  return GITHUB_TOKEN;
}

// Built-in Security Headers (Helmet-equivalent)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Built-in CORS handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hardware-Fingerprint');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// In-memory cache for GitHub release metadata to avoid API rate limits
interface CachedRelease {
  timestamp: number;
  releaseData: any;
  manifest: any | null;
}
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache
const releaseCache = new Map<string, CachedRelease>();

// Semver Comparison: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
export function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/, '').trim();
  const clean2 = (v2 || '').replace(/^v/, '').trim();

  const [main1, pre1] = clean1.split('-');
  const [main2, pre2] = clean2.split('-');

  const parts1 = main1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = main2.split('.').map((p) => parseInt(p, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  // Pre-release comparison
  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;
  if (pre1 && pre2) {
    return pre1.localeCompare(pre2);
  }

  return 0;
}

// Helper to make authenticated GitHub API calls
async function fetchGithubApi(endpoint: string, accept = 'application/vnd.github.v3+json') {
  const token = await getEffectiveGitHubToken();
  const headers: Record<string, string> = {
    'User-Agent': 'Dubbing-Update-Server/1.0',
    'Accept': accept,
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}${endpoint}`, {
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API Error (${res.status}): ${errorText}`);
  }

  return res;
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const hasApp = Boolean(GITHUB_APP_ID && GITHUB_APP_INSTALLATION_ID && getAppPrivateKey());
  const hasPat = Boolean(GITHUB_TOKEN);
  res.json({
    status: 'healthy',
    service: 'Dubbing Multi-User Update Gateway',
    repository: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
    authMode: hasApp ? 'github_app' : hasPat ? 'personal_access_token' : 'unconfigured',
    githubAuthConfigured: hasApp || hasPat,
    timestamp: new Date().toISOString(),
  });
});

// Update check endpoint
app.get('/api/updates/check', async (req: Request, res: Response) => {
  try {
    const clientVersion = (req.query.version as string) || '0.0.0';
    const channel = ((req.query.channel as string) || 'stable').toLowerCase();
    const os = ((req.query.os as string) || 'win').toLowerCase();
    const arch = ((req.query.arch as string) || 'x64').toLowerCase();
    const fingerprint = req.headers['x-hardware-fingerprint'] as string;

    if (REQUIRE_LICENSE_AUTH && !fingerprint) {
      return res.status(403).json({
        error: 'Unauthorized: Hardware fingerprint required for updates',
        messageFa: 'شناسه سخت‌افزاری دستگاه جهت دریافت به‌روزرسانی ارسال نشده است.',
      });
    }

    const cacheKey = `${channel}_${os}_${arch}`;
    const cached = releaseCache.get(cacheKey);
    let releaseData: any;
    let manifestData: any = null;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      releaseData = cached.releaseData;
      manifestData = cached.manifest;
    } else {
      // Query releases from private GitHub repository
      const apiRes = await fetchGithubApi('/releases?per_page=10');
      const releases = await apiRes.json();

      if (!Array.isArray(releases) || releases.length === 0) {
        return res.json({
          updateAvailable: false,
          currentVersion: clientVersion,
          latestVersion: clientVersion,
          message: 'No releases available in repository',
        });
      }

      // Filter by channel
      let candidate = releases.find((r: any) => {
        if (channel === 'beta') return true;
        return !r.prerelease && !r.draft;
      });

      if (!candidate && releases.length > 0) {
        candidate = releases[0];
      }

      releaseData = candidate;

      // Find update-manifest.json in release assets
      const manifestAsset = releaseData.assets?.find((a: any) => a.name === 'update-manifest.json');
      if (manifestAsset) {
        try {
          const manifestRes = await fetchGithubApi(`/releases/assets/${manifestAsset.id}`, 'application/octet-stream');
          manifestData = await manifestRes.json();
        } catch (manifestErr) {
          console.warn('[Update Server] Could not parse manifest asset:', manifestErr);
        }
      }

      releaseCache.set(cacheKey, {
        timestamp: Date.now(),
        releaseData,
        manifest: manifestData,
      });
    }

    const rawTag = releaseData.tag_name || releaseData.name || '0.0.0';
    const latestVersion = rawTag.replace(/^v/, '');

    const hasUpdate = compareSemver(latestVersion, clientVersion) > 0;

    // Find Windows installer asset
    const installerAsset = releaseData.assets?.find((a: any) =>
      a.name.endsWith('.exe') && !a.name.includes('Generator')
    ) || releaseData.assets?.[0];

    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol || 'http';
    const downloadProxyUrl = installerAsset
      ? `${protocol}://${host}/api/updates/download/${installerAsset.id}?name=${encodeURIComponent(installerAsset.name)}`
      : '';

    return res.json({
      updateAvailable: hasUpdate,
      currentVersion: clientVersion,
      latestVersion,
      channel,
      releaseDate: releaseData.published_at || releaseData.created_at,
      releaseName: releaseData.name || `Version ${latestVersion}`,
      downloadUrl: downloadProxyUrl,
      sizeBytes: installerAsset?.size || manifestData?.size || 0,
      sha256: manifestData?.sha256 || '',
      signature: manifestData?.signature || '',
      minSupportedVersion: manifestData?.minSupportedVersion || '1.0.0',
      releaseNotes: releaseData.body || manifestData?.releaseNotes || 'General improvements and stability updates.',
      releaseNotesFa: manifestData?.releaseNotesFa || 'به‌روزرسانی‌های امنیتی و بهبود پایداری استودیو دوبله.',
    });
  } catch (err: any) {
    console.error('[Update Check Error]:', err.message);
    return res.status(500).json({
      error: 'Failed to check for updates',
      details: err.message,
    });
  }
});

// Secure stream download endpoint (proxies private GitHub release assets without exposing token)
app.get('/api/updates/download/:assetId', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const requestedName = (req.query.name as string) || 'Dubbing-Vidans-Setup.exe';
    const fingerprint = req.headers['x-hardware-fingerprint'] as string;

    if (REQUIRE_LICENSE_AUTH && !fingerprint) {
      return res.status(403).json({
        error: 'Unauthorized: Active hardware fingerprint required for download',
      });
    }

    // Request raw asset octet-stream from private GitHub repository
    const assetRes = await fetchGithubApi(`/releases/assets/${assetId}`, 'application/octet-stream');

    if (!assetRes.ok) {
      return res.status(assetRes.status).send(`Failed to stream asset from repository (${assetRes.status})`);
    }

    const contentLength = assetRes.headers.get('content-length');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${requestedName}"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Pipe response stream to client
    if (assetRes.body) {
      const reader = assetRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(Buffer.from(value));
        }
      };
      await pump();
    } else {
      res.status(500).send('Asset stream is empty');
    }
  } catch (err: any) {
    console.error('[Update Download Error]:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download update asset', details: err.message });
    }
  }
});

// Start update server
export function startUpdateServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`[Dubbing Update Gateway] Running on http://localhost:${port}`);
    console.log(`[Dubbing Update Gateway] Target Repo: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.argv.some((arg) => arg.includes('.test.'))) {
  startUpdateServer();
}

export default app;
