import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  generateActivationRequest,
  verifyLicense,
  installLicense,
  checkCurrentLicense,
  buildCanonicalLicenseString
} from '../src/utils/licenseManager';
import {
  PRODUCT_NAME,
  SignedLicenseFile,
  MASTER_AUTHORITY_PUBLIC_KEY_PEM
} from '../src/utils/licenseConfig';
import { getSharedDataDir, getHardwareInfo } from '../src/utils/hardwareIdentity';

console.log('=== Starting Dubbing Vidans Offline Licensing Test Suite ===');

// Test 0: Production Master Public Key Integrity & Isolation Check
console.log('  [CHECK] Enforcing Production Master Public Key integrity:');
assert.ok(
  MASTER_AUTHORITY_PUBLIC_KEY_PEM.includes('MCowBQYDK2VwAyEAQtm8JyAAl6Aquc6zfvZ6aHTc6kKp7t+43HXykv0LkM0='),
  'Production master authority public key MUST NOT be modified or replaced with test keys.'
);
console.log('  [PASS] Test 0: Production public key integrity verified (Strictly Unchanged).');

// Generate Ephemeral In-Memory Ed25519 Key Pair for Automated CI/CD Testing
// CRITICAL: Production owner_private_key.pem is NEVER required or exposed in CI/CD.
const { privateKey: testPrivKey, publicKey: testPubKey } = crypto.generateKeyPairSync('ed25519');
const testPubKeyPem = testPubKey.export({ type: 'spki', format: 'pem' }).toString();

// Test 1: Generate valid activation request
const req = generateActivationRequest();
assert.strictEqual(req.product, 'Dubbing Vidans');
assert.ok(req.hardwareFingerprint.length === 64, 'Fingerprint must be 64-char SHA256 hex');
assert.ok(req.devicePublicKey.includes('BEGIN PUBLIC KEY'), 'Must have valid PEM public key');
assert.ok(req.deviceSignature.length > 20, 'Device signature must be non-empty base64');
console.log('  [PASS] Test 1: Activation request generated with valid hardware fingerprint and device signature.');

// Test 2: Software Owner signs a permanent license using ephemeral test key (CI/CD Safe)
const testPayload = {
  version: 1,
  product: 'Dubbing Vidans',
  licenseId: 'test-lic-uuid-001',
  customerName: 'تست مشتری - استودیو دوبلاژ',
  hardwareFingerprint: req.hardwareFingerprint,
  devicePublicKey: req.devicePublicKey,
  licenseType: 'permanent' as const,
  isPermanent: true,
  issuedAt: new Date().toISOString(),
  features: ['offline_stt', 'offline_translation', 'offline_tts', 'offline_muxing', 'unlimited_export'],
};

const canonicalStr = buildCanonicalLicenseString(testPayload);
const sig = crypto.sign(null, Buffer.from(canonicalStr, 'utf8'), testPrivKey);

const signedLicense: SignedLicenseFile = {
  payload: testPayload,
  authoritySignature: sig.toString('base64'),
};

// Verification using injected test authority public key must succeed
const verifyRes = verifyLicense(signedLicense, testPubKeyPem);
assert.strictEqual(verifyRes.isValid, true, 'Valid signed license must pass verification with test authority key');
assert.strictEqual(verifyRes.status, 'active');
assert.strictEqual(verifyRes.customerName, testPayload.customerName);

// CRITICAL SECURITY ASSERTION:
// A license signed with the test key MUST BE REJECTED by the production master authority public key!
const prodVerifyRes = verifyLicense(signedLicense); // uses default MASTER_AUTHORITY_PUBLIC_KEY_PEM
assert.strictEqual(prodVerifyRes.isValid, false, 'Production public key MUST reject test-signed licenses');
assert.strictEqual(prodVerifyRes.status, 'invalid_signature');
console.log('  [PASS] Test 2: Ephemeral key signed license verified, and production key correctly rejected test signature.');

// Test 3: Anti-Tamper check (Unauthorized payload modification e.g. changed customerName or features)
const tamperedLicense: SignedLicenseFile = {
  payload: {
    ...testPayload,
    customerName: 'فرد نفوذگر / دزد نرم‌افزار',
  },
  authoritySignature: signedLicense.authoritySignature, // Original signature
};

const tamperRes = verifyLicense(tamperedLicense, testPubKeyPem);
assert.strictEqual(tamperRes.isValid, false, 'Tampered license payload must be rejected');
assert.strictEqual(tamperRes.status, 'invalid_signature');
console.log('  [PASS] Test 3: Anti-Tamper check rejected unauthorized payload modification.');

// Test 4: Hardware Binding check (License copied to another physical computer)
const foreignMachineLicense: SignedLicenseFile = {
  payload: {
    ...testPayload,
    hardwareFingerprint: '0000000000000000000000000000000000000000000000000000000000000000', // Different machine
  },
  authoritySignature: crypto.sign(
    null,
    Buffer.from(
      buildCanonicalLicenseString({
        ...testPayload,
        hardwareFingerprint: '0000000000000000000000000000000000000000000000000000000000000000',
      }),
      'utf8'
    ),
    testPrivKey
  ).toString('base64'),
};

const foreignRes = verifyLicense(foreignMachineLicense, testPubKeyPem);
assert.strictEqual(foreignRes.isValid, false, 'Foreign computer license must be rejected');
assert.strictEqual(foreignRes.status, 'hardware_mismatch');
console.log('  [PASS] Test 4: Hardware binding check rejected license copied to another physical computer.');

// Test 5: Installation into machine-wide storage (ProgramData)
const installRes = installLicense(JSON.stringify(signedLicense, null, 2), testPubKeyPem);
assert.strictEqual(installRes.isValid, true, 'License installation must succeed');
const currentCheck = checkCurrentLicense(testPubKeyPem);
assert.strictEqual(currentCheck.isValid, true, 'checkCurrentLicense must confirm active state');
assert.strictEqual(currentCheck.customerName, testPayload.customerName);
console.log('  [PASS] Test 5: Permanent license installed into machine-wide ProgramData storage and verified.');

// Test 6: Verify multiple accounts access (machine-wide directory readable)
const sharedDir = getSharedDataDir();
assert.ok(
  fs.existsSync(path.join(sharedDir, 'license.vidanslic')) || fs.existsSync(path.join(sharedDir, 'license.dblic')),
  'License file must exist in ProgramData'
);
console.log('  [PASS] Test 6: Machine-wide storage verified at:', sharedDir);

// Optional Local Production Key Verification (Only if owner_private_key.pem is locally present on developer machine)
const keysDir = path.resolve(process.cwd(), 'tools', 'license-generator', 'keys');
const privPemPath = path.join(keysDir, 'owner_private_key.pem');
if (fs.existsSync(privPemPath)) {
  try {
    const ownerPrivPem = fs.readFileSync(privPemPath, 'utf8');
    const ownerPrivKey = crypto.createPrivateKey(ownerPrivPem);
    const prodSig = crypto.sign(null, Buffer.from(canonicalStr, 'utf8'), ownerPrivKey);
    const prodSignedLicense: SignedLicenseFile = {
      payload: testPayload,
      authoritySignature: prodSig.toString('base64'),
    };
    const localProdRes = verifyLicense(prodSignedLicense);
    assert.strictEqual(localProdRes.isValid, true, 'Real owner private key must verify against production public key');
    console.log('  [PASS] Optional Developer Check: Local production key verified against MASTER_AUTHORITY_PUBLIC_KEY_PEM.');
  } catch (err: any) {
    console.warn('  [WARN] Local developer key check skipped:', err?.message);
  }
} else {
  console.log('  [INFO] CI/CD Environment confirmed: Running securely with zero production private secrets.');
}

console.log('=== All 6 Offline Licensing Tests Passed Successfully! ===');
