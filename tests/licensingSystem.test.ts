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
  SignedLicenseFile,
  MASTER_AUTHORITY_PUBLIC_KEY_PEM
} from '../src/utils/licenseConfig';
import { getSharedDataDir, getHardwareInfo } from '../src/utils/hardwareIdentity';

console.log('=== Starting Dubbing-Gholam Offline Licensing Test Suite ===');

// Test 1: Generate valid activation request
const req = generateActivationRequest();
assert.strictEqual(req.product, 'Dubbing-Gholam');
assert.ok(req.hardwareFingerprint.length === 64, 'Fingerprint must be 64-char SHA256 hex');
assert.ok(req.devicePublicKey.includes('BEGIN PUBLIC KEY'), 'Must have valid PEM public key');
assert.ok(req.deviceSignature.length > 20, 'Device signature must be non-empty base64');
console.log('  [PASS] Test 1: Activation request generated with valid hardware fingerprint and device signature.');

// Test 2: Software Owner signs a permanent license using owner_private_key.pem
const keysDir = path.resolve(process.cwd(), 'tools', 'license-generator', 'keys');
const privPem = fs.readFileSync(path.join(keysDir, 'owner_private_key.pem'), 'utf8');
const ownerPrivKey = crypto.createPrivateKey(privPem);

const testPayload = {
  version: 1,
  product: 'Dubbing-Gholam',
  licenseId: 'test-lic-uuid-001',
  customerName: 'تست مشتری - استودیو دوبلاژ',
  hardwareFingerprint: req.hardwareFingerprint,
  devicePublicKey: req.devicePublicKey,
  licenseType: 'permanent' as const,
  issuedAt: new Date().toISOString(),
  features: ['offline_stt', 'offline_translation', 'offline_tts', 'offline_muxing', 'unlimited_export'],
};

const canonicalStr = buildCanonicalLicenseString(testPayload);
const sig = crypto.sign(null, Buffer.from(canonicalStr, 'utf8'), ownerPrivKey);

const signedLicense: SignedLicenseFile = {
  payload: testPayload,
  authoritySignature: sig.toString('base64'),
};

const verifyRes = verifyLicense(signedLicense);
assert.strictEqual(verifyRes.isValid, true, 'Valid signed license must pass verification');
assert.strictEqual(verifyRes.status, 'active');
assert.strictEqual(verifyRes.customerName, testPayload.customerName);
console.log('  [PASS] Test 2: Software Owner signed permanent license verified successfully on target device.');

// Test 3: Anti-Tamper check (Customer tries modifying license payload, e.g. changing customerName or features)
const tamperedLicense: SignedLicenseFile = {
  payload: {
    ...testPayload,
    customerName: 'فرد نفوذگر / دزد نرم‌افزار',
  },
  authoritySignature: signedLicense.authoritySignature, // Original signature
};

const tamperRes = verifyLicense(tamperedLicense);
assert.strictEqual(tamperRes.isValid, false, 'Tampered license payload must be rejected');
assert.strictEqual(tamperRes.status, 'invalid_signature');
console.log('  [PASS] Test 3: Anti-Tamper check rejected unauthorized payload modification.');

// Test 4: Hardware Binding check (License copied to another physical computer)
const foreignMachineLicense: SignedLicenseFile = {
  payload: {
    ...testPayload,
    hardwareFingerprint: '0000000000000000000000000000000000000000000000000000000000000000', // Different machine
  },
  // Even if signed by owner for that other machine:
  authoritySignature: crypto.sign(
    null,
    Buffer.from(
      buildCanonicalLicenseString({
        ...testPayload,
        hardwareFingerprint: '0000000000000000000000000000000000000000000000000000000000000000',
      }),
      'utf8'
    ),
    ownerPrivKey
  ).toString('base64'),
};

const foreignRes = verifyLicense(foreignMachineLicense);
assert.strictEqual(foreignRes.isValid, false, 'Foreign computer license must be rejected');
assert.strictEqual(foreignRes.status, 'hardware_mismatch');
console.log('  [PASS] Test 4: Hardware binding check rejected license copied to another physical computer.');

// Test 5: Installation into machine-wide storage (ProgramData)
const installRes = installLicense(JSON.stringify(signedLicense, null, 2));
assert.strictEqual(installRes.isValid, true, 'License installation must succeed');
const currentCheck = checkCurrentLicense();
assert.strictEqual(currentCheck.isValid, true, 'checkCurrentLicense must confirm active state');
assert.strictEqual(currentCheck.customerName, testPayload.customerName);
console.log('  [PASS] Test 5: Permanent license installed into machine-wide ProgramData storage and verified.');

// Test 6: Verify multiple accounts access (machine-wide directory readable)
const sharedDir = getSharedDataDir();
assert.ok(fs.existsSync(path.join(sharedDir, 'license.dblic')), 'License file exists in ProgramData');
console.log('  [PASS] Test 6: Machine-wide storage verified at:', sharedDir);

console.log('=== All 6 Offline Licensing Tests Passed Successfully! ===');
