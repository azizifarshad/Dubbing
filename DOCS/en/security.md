# Security Policy, Threat Model & Hardening

This document provides a comprehensive security review, cryptographic threat analysis, local network protection policy, and credential management standards for **Dubbing Vidans**.

---

## 1. Security Architecture & Core Tenets

1. **Permanently Private Repository:** Source code, development history, internal specifications, and release assets are strictly private to `azizifarshad/Dubbing`.
2. **Zero-Credential Distribution:** Distributed binaries, client bundles, frontend source maps, and installer packages never contain GitHub tokens, owner private keys, or infrastructure secrets.
3. **Cryptographic Separation of Concerns:**
   - Software licensing uses the owner's master Ed25519 keypair.
   - Application auto-update manifests use a separate, dedicated Ed25519 keypair.
   - Cross-key signing or validation is strictly forbidden.
4. **Local Network Isolation:** Background services bind strictly to loopback (`127.0.0.1`), preventing unauthorized access across local LAN or shared Wi-Fi networks.
5. **Machine-Wide License Hardening:** Customer licenses are tied to physical hardware properties and cannot be cloned to other machines.

---

## 2. Threat Model & Mitigations

### 2.1 License Tampering & Piracy
- **Threat:** An unauthorized user modifies the license JSON to extend expiry, change customer name, or enable unauthorized features.
- **Mitigation:** Ed25519 digital signatures cover the canonical string representation of all payload fields. Modifying any field invalidates the signature.
- **Threat:** Copying a valid license file from one PC to another.
- **Mitigation:** Hardware binding checks validate CPU ID, BIOS UUID, BaseBoard serial, Disk Drive serial, and Windows MachineGuid. Mismatched hardware fingerprints cause immediate rejection (`hardware_mismatch`).

### 2.2 Malicious Update Injection (MITM)
- **Threat:** An adversary intercepts the update download or spoofs the update server to distribute malware.
- **Mitigation:** The desktop client validates both SHA-256 package integrity and Ed25519 digital signatures against the embedded `UPDATE_AUTHORITY_PUBLIC_KEY_PEM`. Unsigned or tampered binaries are immediately purged from disk without execution.

### 2.3 Local Network Exposure
- **Threat:** A machine on the same Wi-Fi or LAN calls local REST endpoints (`/api/upload-video`, `/api/export-dubbed-video`, `/api/app-update/install`).
- **Mitigation:** The local server binds to `127.0.0.1` by default (`HOST=127.0.0.1`), refusing external network interfaces.

### 2.4 Credential Exposure in CI/CD
- **Threat:** Public pull requests or malicious workflow commits attempt to dump repository secrets.
- **Mitigation:**
  - Lightweight CI (`ci.yml`) runs with zero production secrets.
  - Release workflow runs only on protected Git tags (`v*`) or manual authorization.
  - Software owner private key is never uploaded to GitHub Secrets or Actions.

---

## 3. Vulnerability Reporting Procedure

If you discover a potential vulnerability:
1. Do **not** create a public GitHub issue or discussion.
2. Email the lead maintainer directly:
   - **Lead Maintainer:** Farshad Azizi
   - **Email:** `azizifarshad@hotmail.com`
   - **Subject:** `[SECURITY] Vulnerability Report - Dubbing Vidans`
3. Include detailed steps to reproduce and affected versions.
4. Security advisories and patches are distributed through the secure auto-update infrastructure.
