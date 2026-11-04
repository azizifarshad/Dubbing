import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  PRODUCT_NAME,
  LICENSE_SCHEMA_VERSION,
  MASTER_AUTHORITY_PUBLIC_KEY_PEM,
  ActivationRequest,
  PermanentLicensePayload,
  SignedLicenseFile,
  LicenseValidationResult,
} from './licenseConfig';
import {
  getHardwareInfo,
  getOrCreateDeviceIdentity,
  getSharedDataDir,
} from './hardwareIdentity';

/**
 * Creates canonical string for permanent license payload verification
 */
export function buildCanonicalLicenseString(p: PermanentLicensePayload): string {
  return [
    `PRODUCT=${p.product}`,
    `VERSION=${p.version}`,
    `ID=${p.licenseId}`,
    `CUSTOMER=${p.customerName}`,
    `FINGERPRINT=${p.hardwareFingerprint}`,
    `DEVICE_KEY=${p.devicePublicKey.trim()}`,
    `TYPE=${p.licenseType}`,
    `ISSUED=${p.issuedAt}`,
    `FEATURES=${(p.features || []).sort().join(',')}`,
  ].join('|');
}

/**
 * Creates canonical string for device activation request
 */
export function buildCanonicalRequestString(
  hwFingerprint: string,
  devicePublicKeyPem: string,
  computerName: string,
  requestedAt: string
): string {
  return [
    `PRODUCT=${PRODUCT_NAME}`,
    `VERSION=${LICENSE_SCHEMA_VERSION}`,
    `FINGERPRINT=${hwFingerprint}`,
    `DEVICE_KEY=${devicePublicKeyPem.trim()}`,
    `MACHINE=${computerName}`,
    `REQUESTED_AT=${requestedAt}`,
  ].join('|');
}

/**
 * Generates an Activation Request file payload for the current Windows machine
 */
export function generateActivationRequest(): ActivationRequest {
  const hw = getHardwareInfo();
  const identity = getOrCreateDeviceIdentity();
  const requestedAt = new Date().toISOString();

  const canonicalReq = buildCanonicalRequestString(
    hw.hardwareFingerprint,
    identity.devicePublicKeyPem,
    hw.computerName,
    requestedAt
  );

  // Device signs its own request to cryptographically prove possession of device private key
  const privKey = crypto.createPrivateKey(identity.devicePrivateKeyPem);
  const signature = crypto.sign(null, Buffer.from(canonicalReq, 'utf8'), privKey);

  return {
    version: LICENSE_SCHEMA_VERSION,
    product: PRODUCT_NAME,
    hardwareFingerprint: hw.hardwareFingerprint,
    devicePublicKey: identity.devicePublicKeyPem,
    computerName: hw.computerName,
    osName: hw.osName,
    cpuModel: hw.cpuModel,
    requestedAt,
    deviceSignature: signature.toString('base64'),
  };
}

/**
 * Validates a signed license file against the Software Owner's public key and current hardware
 */
export function verifyLicense(
  licenseData: SignedLicenseFile
): LicenseValidationResult {
  try {
    if (!licenseData || !licenseData.payload || !licenseData.authoritySignature) {
      return {
        isValid: false,
        status: 'corrupted',
        messageFa: 'فایل لایسنس مخدوش یا ناقص است.',
        messageEn: 'The license file is corrupted or incomplete.',
      };
    }

    const payload = licenseData.payload;

    if (payload.product !== PRODUCT_NAME) {
      return {
        isValid: false,
        status: 'corrupted',
        messageFa: 'این لایسنس متعلق به این نرم‌افزار نیست.',
        messageEn: 'The license is not issued for this software.',
      };
    }

    // 1. Verify Software Owner's digital signature with embedded Master Authority Public Key
    const canonicalStr = buildCanonicalLicenseString(payload);
    const authorityPubKey = crypto.createPublicKey(MASTER_AUTHORITY_PUBLIC_KEY_PEM);
    const signatureBuf = Buffer.from(licenseData.authoritySignature, 'base64');

    const isSignatureValid = crypto.verify(
      null,
      Buffer.from(canonicalStr, 'utf8'),
      authorityPubKey,
      signatureBuf
    );

    if (!isSignatureValid) {
      return {
        isValid: false,
        status: 'invalid_signature',
        messageFa: 'امضای دیجیتال لایسنس معتبر نیست؛ فایل لایسنس دستکاری شده یا نامعتبر است.',
        messageEn: 'License digital signature is invalid or has been tampered with.',
      };
    }

    // 2. Verify hardware binding matches this physical machine
    const currentHw = getHardwareInfo();
    const currentIdentity = getOrCreateDeviceIdentity();

    if (payload.hardwareFingerprint !== currentHw.hardwareFingerprint) {
      return {
        isValid: false,
        status: 'hardware_mismatch',
        customerName: payload.customerName,
        licenseId: payload.licenseId,
        messageFa: 'این لایسنس متعلق به کامپیوتر دیگری است و روی این سیستم فعال نمی‌شود.',
        messageEn: 'This license belongs to another computer and cannot be used on this device.',
      };
    }

    // 3. Verify device public key match
    if (payload.devicePublicKey.trim() !== currentIdentity.devicePublicKeyPem.trim()) {
      return {
        isValid: false,
        status: 'hardware_mismatch',
        customerName: payload.customerName,
        licenseId: payload.licenseId,
        messageFa: 'کلید هویتی دستگاه با شناسه ثبت‌شده در لایسنس مطابقت ندارد.',
        messageEn: 'Device identity key mismatch.',
      };
    }

    return {
      isValid: true,
      status: 'active',
      customerName: payload.customerName,
      licenseId: payload.licenseId,
      issuedAt: payload.issuedAt,
      isPermanent: payload.isPermanent ?? true,
      hardwareFingerprint: payload.hardwareFingerprint,
      features: payload.features || [],
      messageFa: 'لایسنس دائمی فعال است.',
      messageEn: 'Permanent license is active and verified.',
    };
  } catch (err: any) {
    return {
      isValid: false,
      status: 'corrupted',
      messageFa: `خطا در بررسی لایسنس: ${err?.message || 'قالب نامعتبر'}`,
      messageEn: `License verification error: ${err?.message || 'unknown'}`,
    };
  }
}

/**
 * Checks the persistent machine-wide license file in ProgramData
 */
export function checkCurrentLicense(): LicenseValidationResult {
  const sharedDir = getSharedDataDir();
  const licensePath = path.join(sharedDir, 'license.dblic');

  if (!fs.existsSync(licensePath)) {
    return {
      isValid: false,
      status: 'no_license',
      messageFa: 'لایسنس نرم‌افزار یافت نشد. لطفاً ابتدا فایل درخواست را برای مدیر نرم‌افزار ارسال کنید و فایل لایسنس را وارد نمایید.',
      messageEn: 'No license found. Please generate an activation request and import your license file.',
    };
  }

  try {
    const raw = fs.readFileSync(licensePath, 'utf8');
    const parsed: SignedLicenseFile = JSON.parse(raw);
    return verifyLicense(parsed);
  } catch (err: any) {
    return {
      isValid: false,
      status: 'corrupted',
      messageFa: 'فایل لایسنس موجود در سیستم مخدوش یا غیرقابل خواندن است.',
      messageEn: 'The installed license file is corrupted.',
    };
  }
}

/**
 * Installs and saves a new license file to ProgramData for all machine accounts
 */
export function installLicense(licenseContentStr: string): LicenseValidationResult {
  try {
    const parsed: SignedLicenseFile = JSON.parse(licenseContentStr);
    const result = verifyLicense(parsed);

    if (!result.isValid) {
      return result;
    }

    const sharedDir = getSharedDataDir();
    const licensePath = path.join(sharedDir, 'license.dblic');

    fs.writeFileSync(licensePath, JSON.stringify(parsed, null, 2), { encoding: 'utf8' });

    return {
      ...result,
      messageFa: 'لایسنس دائمی با موفقیت فعال شد. تمامی امکانات نرم‌افزار به صورت آفلاین فعال هستند.',
      messageEn: 'Permanent license successfully installed. All offline features are active.',
    };
  } catch (err: any) {
    return {
      isValid: false,
      status: 'corrupted',
      messageFa: `قالب فایل لایسنس نامعتبر است: ${err?.message || 'JSON Parse Error'}`,
      messageEn: `Invalid license file format: ${err?.message || 'JSON Parse Error'}`,
    };
  }
}
