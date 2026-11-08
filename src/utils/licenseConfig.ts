// Public key and types for offline license verification

export const PRODUCT_NAME = 'Dubbing Vidans';
export const VALID_PRODUCT_NAMES = [
  'Dubbing Vidans',
  'Dubbing-Vidans',
  'DubbingVidans',
];
export const LICENSE_SCHEMA_VERSION = 1;

// Ed25519 public key for verifying license signatures
export const MASTER_AUTHORITY_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAQtm8JyAAl6Aquc6zfvZ6aHTc6kKp7t+43HXykv0LkM0=
-----END PUBLIC KEY-----`;

export interface ActivationRequest {
  version: number;
  product: string;
  hardwareFingerprint: string;
  devicePublicKey: string;
  computerName: string;
  osName: string;
  cpuModel: string;
  requestedAt: string;
  deviceSignature: string;
}

export interface PermanentLicensePayload {
  version: number;
  product: string;
  licenseId: string;
  customerName: string;
  hardwareFingerprint: string;
  devicePublicKey: string;
  licenseType: 'permanent';
  isPermanent?: boolean;
  issuedAt: string;
  features: string[];
}

export interface SignedLicenseFile {
  payload: PermanentLicensePayload;
  authoritySignature: string;
}

export interface LicenseValidationResult {
  isValid: boolean;
  status: 'active' | 'no_license' | 'invalid_signature' | 'hardware_mismatch' | 'corrupted';
  customerName?: string;
  licenseId?: string;
  issuedAt?: string;
  isPermanent?: boolean;
  hardwareFingerprint?: string;
  features?: string[];
  messageFa?: string;
  messageEn?: string;
}
