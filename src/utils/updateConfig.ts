// Dedicated cryptographic keys and canonical structures for application auto-updates
// NOTE: This key is STRICTLY INDEPENDENT from the offline software licensing authority key.

export const UPDATE_APP_NAME = 'Dubbing Vidans';

// Dedicated Ed25519 Public Key for verifying update manifests and packages
export const UPDATE_AUTHORITY_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAzVzumHn/L9bOwqqpJ5e9+8qFdh6/dQNwAJLIOL3LGgg=
-----END PUBLIC KEY-----`;

export interface UpdateManifest {
  schemaVersion: number;
  appName: string;
  version: string;
  channel: 'stable' | 'beta';
  releaseDate: string;
  minSupportedVersion: string;
  os: string;
  arch: string;
  installerFileName: string;
  fileSizeBytes: number;
  sha256: string;
  signature: string;
  releaseNotesEn: string;
  releaseNotesFa: string;
  canonicalString?: string;
}

/**
 * Builds the canonical string format used for update manifest signing & verification.
 * Standardized across Python release signer and TypeScript client/server verifiers.
 */
export function buildCanonicalManifestString(
  appName: string,
  version: string,
  channel: string,
  osName: string,
  arch: string,
  sha256Hash: string,
  fileSize: number,
  minVersion: string = '1.0.0'
): string {
  return [
    `APP=${appName}`,
    `VERSION=${(version || '').replace(/^v/, '').trim()}`,
    `CHANNEL=${channel}`,
    `OS=${osName}`,
    `ARCH=${arch}`,
    `SHA256=${sha256Hash.toLowerCase().trim()}`,
    `SIZE=${fileSize}`,
    `MIN=${(minVersion || '1.0.0').replace(/^v/, '').trim()}`,
  ].join('|');
}
