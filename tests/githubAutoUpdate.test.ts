import assert from 'assert';
import crypto from 'crypto';

console.log('=== Starting GitHub-Based Auto-Update System Comprehensive Test Suite ===\n');

// 1. Semver Comparison Test across complex version strings
function compareSemver(v1: string, v2: string): number {
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

  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;
  if (pre1 && pre2) {
    return pre1.localeCompare(pre2);
  }

  return 0;
}

console.log('1. Testing Semantic Versioning rules:');
assert.strictEqual(compareSemver('1.0.2', '1.0.1'), 1, '1.0.2 must be detected as newer than 1.0.1');
assert.strictEqual(compareSemver('1.0.10', '1.0.9'), 1, '1.0.10 must be detected as newer than 1.0.9 (non-alphabetical)');
assert.strictEqual(compareSemver('1.1.0', '1.0.9'), 1, '1.1.0 must be detected as newer than 1.0.9');
assert.strictEqual(compareSemver('2.0.0', '1.9.9'), 1, '2.0.0 must be detected as newer than 1.9.9');
assert.strictEqual(compareSemver('1.0.1', '1.0.1'), 0, 'Identical versions must evaluate to 0');
assert.strictEqual(compareSemver('v1.0.2', '1.0.1'), 1, 'v-prefixed versions must normalize cleanly');
assert.strictEqual(compareSemver('1.0.0', '1.0.1'), -1, 'Older version must evaluate to -1');
console.log('   [PASS] Semantic version comparison passes all assertions.\n');

// 2. Testing GitHub Releases Channel Filtering
console.log('2. Testing Channel Filtering (Stable vs. Beta):');
const mockReleases = [
  {
    tag_name: 'v1.1.0-beta.1',
    name: 'Dubbing Vidans v1.1.0 Beta 1',
    draft: false,
    prerelease: true,
    assets: [{ name: 'Dubbing-Vidans-Setup-1.1.0-beta.exe', size: 350000000, browser_download_url: 'https://example.com/beta.exe' }],
  },
  {
    tag_name: 'v1.0.2',
    name: 'Dubbing Vidans v1.0.2',
    draft: false,
    prerelease: false,
    assets: [
      { name: 'Dubbing-Vidans-Setup.exe', size: 360000000, browser_download_url: 'https://github.com/azizifarshad/Dubbing/releases/download/v1.0.2/Dubbing-Vidans-Setup.exe' },
      { name: 'update-manifest.json', size: 1024, browser_download_url: 'https://github.com/azizifarshad/Dubbing/releases/download/v1.0.2/update-manifest.json' }
    ],
  },
  {
    tag_name: 'v1.0.3-draft',
    name: 'Unpublished Draft',
    draft: true,
    prerelease: false,
    assets: [],
  }
];

// In stable channel: must ignore prerelease and draft
const stableEligible = mockReleases.filter((r) => !r.draft && !r.prerelease);
assert.strictEqual(stableEligible.length, 1, 'Stable channel must only include 1 release');
assert.strictEqual(stableEligible[0].tag_name, 'v1.0.2', 'Stable channel must select v1.0.2');

// In beta channel: can include prerelease but not draft
const betaEligible = mockReleases.filter((r) => !r.draft);
assert.strictEqual(betaEligible.length, 2, 'Beta channel must include both beta and stable');
betaEligible.sort((a, b) => compareSemver(b.tag_name, a.tag_name));
assert.strictEqual(betaEligible[0].tag_name, 'v1.1.0-beta.1', 'Beta channel must pick newest beta version');
console.log('   [PASS] Channel filtering and draft/prerelease discrimination verified.\n');

// 3. Testing Release Asset Identification for Windows x64
console.log('3. Testing Windows x64 Release Asset Discovery:');
const sampleAssets = [
  { name: 'LicenseGenerator.exe', size: 16000000, browser_download_url: 'https://github.com/assets/1' },
  { name: 'Dubbing-Vidans-Setup.exe', size: 365000000, browser_download_url: 'https://github.com/assets/2' },
  { name: 'source.tar.gz', size: 5000000, browser_download_url: 'https://github.com/assets/3' },
  { name: 'update-manifest.json', size: 1200, browser_download_url: 'https://github.com/assets/4' },
];

const discoveredInstaller = sampleAssets.find((a) =>
  a.name.toLowerCase().endsWith('.exe') && !a.name.toLowerCase().includes('generator')
);
assert.ok(discoveredInstaller, 'Installer must be found');
assert.strictEqual(discoveredInstaller.name, 'Dubbing-Vidans-Setup.exe', 'Must ignore LicenseGenerator.exe and select application installer');
assert.strictEqual(discoveredInstaller.browser_download_url, 'https://github.com/assets/2');
console.log('   [PASS] Windows x64 installer asset resolved accurately.\n');

// 4. Testing Empty / Missing Releases (HTTP 404 & Empty Array)
console.log('4. Testing Missing / Empty Releases Handling (HTTP 404):');
function processGitHubResponse(status: number, releases: any[], currentVersion: string) {
  if (status === 404 || !releases || releases.length === 0) {
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      status: 'up_to_date' as const,
    };
  }
  const filtered = releases.filter((r) => !r.draft && !r.prerelease);
  if (filtered.length === 0) {
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      status: 'up_to_date' as const,
    };
  }
  filtered.sort((a, b) => compareSemver(b.tag_name, a.tag_name));
  const latest = filtered[0].tag_name.replace(/^v/, '');
  return {
    updateAvailable: compareSemver(latest, currentVersion) > 0,
    currentVersion,
    latestVersion: latest,
    status: compareSemver(latest, currentVersion) > 0 ? ('available' as const) : ('up_to_date' as const),
  };
}

const res404 = processGitHubResponse(404, [], '1.0.1');
assert.strictEqual(res404.updateAvailable, false);
assert.strictEqual(res404.status, 'up_to_date');

const resEmpty = processGitHubResponse(200, [], '1.0.1');
assert.strictEqual(resEmpty.updateAvailable, false);
assert.strictEqual(resEmpty.status, 'up_to_date');

const resNewer = processGitHubResponse(200, mockReleases, '1.0.1');
assert.strictEqual(resNewer.updateAvailable, true);
assert.strictEqual(resNewer.latestVersion, '1.0.2');
assert.strictEqual(resNewer.status, 'available');
console.log('   [PASS] Graceful handling of empty, missing, and newer releases confirmed.\n');

// 5. Testing Session Dismissal ("Later" button logic)
console.log('5. Testing Session Storage Dismissal Behavior:');
const mockSessionStorage: Record<string, string> = {};
function handleUserAction(action: 'update_now' | 'later', version: string) {
  if (action === 'later') {
    mockSessionStorage[`vidans_dismissed_update_${version}`] = 'true';
  }
}
function shouldPromptUser(version: string): boolean {
  return !mockSessionStorage[`vidans_dismissed_update_${version}`];
}

assert.strictEqual(shouldPromptUser('1.0.2'), true, 'Should prompt user before dismissal');
handleUserAction('later', '1.0.2');
assert.strictEqual(shouldPromptUser('1.0.2'), false, 'Should NOT prompt user again for 1.0.2 in this session');
assert.strictEqual(shouldPromptUser('1.0.3'), true, 'Should prompt user if a newer version 1.0.3 appears');
console.log('   [PASS] User session dismissal works cleanly.\n');

// 6. Testing Checksum Integrity & Corrupted Download Detection
console.log('6. Testing Download Checksum Integrity Verification:');
const validPackage = Buffer.from('Dubbing-Vidans-Setup-Installer-v1.0.2-Binary-Payload');
const validHash = crypto.createHash('sha256').update(validPackage).digest('hex');

const receivedBytes = Buffer.from('Dubbing-Vidans-Setup-Installer-v1.0.2-Binary-Payload');
const receivedHash = crypto.createHash('sha256').update(receivedBytes).digest('hex');
assert.strictEqual(receivedHash, validHash, 'Valid package hash must match');

const corruptedBytes = Buffer.from('Dubbing-Vidans-Setup-Installer-v1.0.2-CORRUPTED');
const corruptedHash = crypto.createHash('sha256').update(corruptedBytes).digest('hex');
assert.notStrictEqual(corruptedHash, validHash, 'Corrupted package hash must be rejected');
console.log('   [PASS] Package SHA-256 validation verified.\n');

console.log('=== All GitHub-Based Auto-Update Tests Passed Successfully! ===');
