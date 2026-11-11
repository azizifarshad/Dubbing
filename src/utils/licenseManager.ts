import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  PRODUCT_NAME,
  VALID_PRODUCT_NAMES,
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

// Canonical string format for license signing
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

// Canonical string format for activation requests
export function buildCanonicalRequestString(
  hwFingerprint: string,
  devicePublicKeyPem: string,
  computerName: string,
  requestedAt: string,
  productName: string = PRODUCT_NAME
): string {
  return [
    `PRODUCT=${productName}`,
    `VERSION=${LICENSE_SCHEMA_VERSION}`,
    `FINGERPRINT=${hwFingerprint}`,
    `DEVICE_KEY=${devicePublicKeyPem.trim()}`,
    `MACHINE=${computerName}`,
    `REQUESTED_AT=${requestedAt}`,
  ].join('|');
}

// Generate activation request for this machine
export function generateActivationRequest(): ActivationRequest {
  const hw = getHardwareInfo();
  const identity = getOrCreateDeviceIdentity();
  const requestedAt = new Date().toISOString();

  const canonicalReq = buildCanonicalRequestString(
    hw.hardwareFingerprint,
    identity.devicePublicKeyPem,
    hw.computerName,
    requestedAt,
    PRODUCT_NAME
  );

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

// Verify license signature and match against local hardware
export function verifyLicense(
  licenseData: SignedLicenseFile,
  customAuthorityPublicKeyPem?: string
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

    const isProductMatch =
      payload.product === PRODUCT_NAME ||
      (VALID_PRODUCT_NAMES && VALID_PRODUCT_NAMES.includes(payload.product));

    if (!isProductMatch) {
      return {
        isValid: false,
        status: 'corrupted',
        messageFa: 'این لایسنس متعلق به نرم‌افزار Dubbing Vidans نیست.',
        messageEn: 'The license is not issued for Dubbing Vidans.',
      };
    }

    // Check authority signature
    const canonicalStr = buildCanonicalLicenseString(payload);
    const authorityPubKey = crypto.createPublicKey(customAuthorityPublicKeyPem || MASTER_AUTHORITY_PUBLIC_KEY_PEM);
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

    // Check hardware fingerprint
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

    // Check device public key
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
      messageFa: 'لایسنس دائمی Dubbing Vidans فعال است.',
      messageEn: 'Permanent license for Dubbing Vidans is active and verified.',
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

// Check installed license in ProgramData
export function checkCurrentLicense(customAuthorityPublicKeyPem?: string): LicenseValidationResult {
  const sharedDir = getSharedDataDir();
  const vidansLicPath = path.join(sharedDir, 'license.vidanslic');
  const legacyLicPath = path.join(sharedDir, 'license.dblic');

  let activePath = '';
  if (fs.existsSync(vidansLicPath)) {
    activePath = vidansLicPath;
  } else if (fs.existsSync(legacyLicPath)) {
    activePath = legacyLicPath;
  }

  if (!activePath) {
    return {
      isValid: false,
      status: 'no_license',
      messageFa: 'لایسنس نرم‌افزار یافت نشد. لطفاً فایل درخواست (.vidansreq) را برای پشتیبانی ارسال کرده و فایل لایسنس را وارد نمایید.',
      messageEn: 'No license found. Please generate an activation request and import your license file.',
    };
  }

  try {
    const raw = fs.readFileSync(activePath, 'utf8');
    const parsed: SignedLicenseFile = JSON.parse(raw);
    return verifyLicense(parsed, customAuthorityPublicKeyPem);
  } catch (err: any) {
    return {
      isValid: false,
      status: 'corrupted',
      messageFa: 'فایل لایسنس موجود در سیستم مخدوش یا غیرقابل خواندن است.',
      messageEn: 'The installed license file is corrupted.',
    };
  }
}

// Save license file to shared directory
export function installLicense(licenseContentStr: string, customAuthorityPublicKeyPem?: string): LicenseValidationResult {
  try {
    const parsed: SignedLicenseFile = JSON.parse(licenseContentStr);
    const result = verifyLicense(parsed, customAuthorityPublicKeyPem);

    if (!result.isValid) {
      return result;
    }

    const sharedDir = getSharedDataDir();
    const vidansLicPath = path.join(sharedDir, 'license.vidanslic');
    const legacyLicPath = path.join(sharedDir, 'license.dblic');

    const formatted = JSON.stringify(parsed, null, 2);
    fs.writeFileSync(vidansLicPath, formatted, { encoding: 'utf8' });
    try {
      fs.writeFileSync(legacyLicPath, formatted, { encoding: 'utf8' });
    } catch {}

    return {
      ...result,
      messageFa: 'لایسنس دائمی Dubbing Vidans با موفقیت فعال شد. تمامی امکانات نرم‌افزار به صورت آفلاین فعال هستند.',
      messageEn: 'Permanent license for Dubbing Vidans successfully installed. All offline features are active.',
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
