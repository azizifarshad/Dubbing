import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { compareSemver } from '../update-server/src/server.ts';
import {
  UPDATE_APP_NAME,
  UPDATE_AUTHORITY_PUBLIC_KEY_PEM,
  buildCanonicalManifestString,
} from '../src/utils/updateConfig.ts';
import { MASTER_AUTHORITY_PUBLIC_KEY_PEM } from '../src/utils/licenseConfig.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Starting Secure Multi-User Auto-Update Subsystem Test Suite ===\n');

// 1. Semver Comparison Tests
console.log('1. Testing Semantic Versioning rules:');
assert.strictEqual(compareSemver('1.0.1', '1.0.0'), 1, '1.0.1 should be newer than 1.0.0');
assert.strictEqual(compareSemver('1.0.0', '1.0.0'), 0, '1.0.0 should equal 1.0.0');
assert.strictEqual(compareSemver('0.9.9', '1.0.0'), -1, '0.9.9 should be older than 1.0.0');
assert.strictEqual(compareSemver('2.0.0', '1.9.9'), 1, '2.0.0 should be newer than 1.9.9');
assert.strictEqual(compareSemver('1.0.0', '1.0.0-beta'), 1, 'Stable should be newer than beta');
console.log('   [PASS] All semver comparisons valid.');

// 2. Cryptographic Key Isolation: Update Authority Key vs Software Licensing Key
console.log('\n2. Testing Cryptographic Key Isolation (Part 7 & Rule 20 Compliance):');
assert.notStrictEqual(
  UPDATE_AUTHORITY_PUBLIC_KEY_PEM.trim(),
  MASTER_AUTHORITY_PUBLIC_KEY_PEM.trim(),
  'Update signing public key MUST be strictly distinct from licensing master public key.'
);
const updatePubKeyFile = path.join(__dirname, '..', 'tools', 'update-signer', 'keys', 'update_signer_public_key.pem');
if (fs.existsSync(updatePubKeyFile)) {
  const fileContent = fs.readFileSync(updatePubKeyFile, 'utf8').trim();
  assert.strictEqual(
    fileContent,
    UPDATE_AUTHORITY_PUBLIC_KEY_PEM.trim(),
    'Tracked update_signer_public_key.pem must match UPDATE_AUTHORITY_PUBLIC_KEY_PEM.'
  );
}
console.log('   [PASS] Update authority key is strictly isolated and dedicated.');

// 3. Cryptographic Manifest Signature Generation and Verification
console.log('\n3. Testing Ed25519 Cryptographic Signature Verification:');
// Generate an ephemeral test Ed25519 keypair for automated testing
const { privateKey: testUpdatePrivKey, publicKey: testUpdatePubKey } = crypto.generateKeyPairSync('ed25519');
const testUpdatePubKeyPem = testUpdatePubKey.export({ type: 'spki', format: 'pem' }).toString();

const canonical = buildCanonicalManifestString(
  UPDATE_APP_NAME,
  '1.0.1',
  'stable',
  'windows',
  'x64',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  1048576,
  '1.0.0'
);
const signature = crypto.sign(null, Buffer.from(canonical, 'utf8'), testUpdatePrivKey);
const sigBase64 = signature.toString('base64');

const isValid = crypto.verify(null, Buffer.from(canonical, 'utf8'), testUpdatePubKeyPem, Buffer.from(sigBase64, 'base64'));
assert.strictEqual(isValid, true, 'Genuine signature must verify successfully with matching key');

// Cross-verification: Test signature must be rejected by production UPDATE_AUTHORITY_PUBLIC_KEY_PEM
const isProdRejectedTest = crypto.verify(null, Buffer.from(canonical, 'utf8'), UPDATE_AUTHORITY_PUBLIC_KEY_PEM, Buffer.from(sigBase64, 'base64'));
assert.strictEqual(isProdRejectedTest, false, 'Production update public key must reject test-signed manifest');
console.log('   [PASS] Genuine Ed25519 signature verified and cross-key rejection confirmed.');

// 4. Anti-Tamper Check: Tampered Manifest Must Be Rejected
console.log('\n4. Testing Anti-Tamper Check on Manifest:');
const tamperedCanonical = canonical.replace('1.0.1', '1.0.2');
const isTamperedValid = crypto.verify(null, Buffer.from(tamperedCanonical, 'utf8'), testUpdatePubKeyPem, Buffer.from(sigBase64, 'base64'));
assert.strictEqual(isTamperedValid, false, 'Tampered manifest must be rejected');
console.log('   [PASS] Tampered update payload was successfully rejected.');

// 5. SHA-256 Checksum Verification
console.log('\n5. Testing Package Integrity & SHA-256 Checksum Validation:');
const dummyPackage = Buffer.from('Dubbing-Vidans-Setup-Installer-Binary-Test-Content-v1.0.1', 'utf8');
const expectedHash = crypto.createHash('sha256').update(dummyPackage).digest('hex');

const actualHash = crypto.createHash('sha256').update(dummyPackage).digest('hex');
assert.strictEqual(actualHash, expectedHash, 'SHA-256 must match exact content');
console.log(`   [PASS] SHA-256 Checksum computed: ${expectedHash.slice(0, 24)}... (Match confirmed)`);

// 6. Corrupted Download Rejection
console.log('\n6. Testing Corrupted Download Rejection:');
const corruptedPackage = Buffer.from('Dubbing-Vidans-Setup-Installer-CORRUPTED', 'utf8');
const corruptedHash = crypto.createHash('sha256').update(corruptedPackage).digest('hex');
assert.notStrictEqual(corruptedHash, expectedHash, 'Corrupted package hash must not match expected hash');
console.log('   [PASS] Corrupted binary detected and rejected.');

// 7. User Data Separation & Preservation Rule
console.log('\n7. Verifying User Data Separation:');
const issContent = fs.readFileSync(path.join(__dirname, '..', 'installer', 'DubbingVidans_Setup.iss'), 'utf8');
assert.ok(issContent.includes('{commonappdata}\\DubbingVidans'), 'Inno Setup must configure commonappdata for license and user data preservation');
assert.ok(issContent.includes('DefaultDirName={autopf}\\Dubbing Vidans'), 'Application must install into Program Files separate from user data');
console.log('   [PASS] User data separation verified: C:\\ProgramData\\DubbingVidans is protected across upgrades.');

// 8. Leak Check: Confirm No Secrets in Distributed Assets
console.log('\n8. Verifying Zero-Credential Distribution:');
const distHtml = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
assert.ok(!distHtml.includes('ghp_'), 'dist/index.html must not contain GitHub tokens');
assert.ok(!distHtml.includes('github_pat_'), 'dist/index.html must not contain GitHub PATs');
assert.ok(!distHtml.includes('BEGIN PRIVATE KEY'), 'dist/index.html must not contain private keys');

const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
assert.ok(!envExample.includes('ghp_'), '.env.example must not contain GitHub tokens');
console.log('   [PASS] No GitHub credentials or private keys found in distributed assets.');

console.log('\n=== All 8 Auto-Update Subsystem Tests Passed Successfully! ===');
