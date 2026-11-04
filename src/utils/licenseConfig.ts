/**
 * Embedded Public Configuration for Offline Licensing Verification
 * IMPORTANT: This file contains ONLY the public verification key.
 * The master private signing key is strictly held in tools/license-generator/
 */

export const PRODUCT_NAME = 'Dubbing-Gholam';
export const LICENSE_SCHEMA_VERSION = 1;

// The software owner's Ed25519 Master Public Key (embedded in client application)
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
  deviceSignature: string; // Base64 signature of canonical payload by devicePrivateKey
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
  authoritySignature: string; // Base64 Ed25519 signature by Software Owner's Private Key
}

export interface LicenseValidationResult {
  isValid: boolean;
  status:
    | 'active'
    | 'no_license'
    | 'invalid_signature'
    | 'hardware_mismatch'
    | 'corrupted'
    | 'tampered';
  customerName?: string;
  licenseId?: string;
  issuedAt?: string;
  isPermanent?: boolean;
  hardwareFingerprint?: string;
  features?: string[];
  messageFa: string;
  messageEn: string;
}
