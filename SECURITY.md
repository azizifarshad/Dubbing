# Security Policy

## Supported Versions

We actively provide security patches and updates for the following versions of Dubbing:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Security Vulnerability

We take the security of our application, server infrastructure, and user data very seriously. If you believe you have discovered a security vulnerability in this project, please report it responsibly.

### How to Report
**Do NOT disclose security vulnerabilities via public GitHub issues, discussions, or social media.**

Please send a detailed vulnerability report via email to:
- **Lead Maintainer:** Farshad Azizi
- **Email:** `azizifarshad@hotmail.com`
- **Subject:** `[SECURITY] Vulnerability Report - Dubbing Application`

### What to Include in Your Report
To help us triage and resolve the issue quickly, please provide:
1. **Description:** Clear explanation of the potential vulnerability.
2. **Impact:** Affected components (Desktop Client, Server API, Auto-Update System, Licensing Engine).
3. **Reproduction Steps:** Step-by-step instructions or proof-of-concept (PoC).
4. **Environment:** OS version, application version, and runtime details.
5. **Mitigation:** Any proposed fix or remediation suggestions (if available).

### Response Timeline
- **Initial Acknowledgment:** Within 48 hours of receipt.
- **Triage & Assessment:** Within 5 business days.
- **Patch Deployment:** Critical security updates will be prioritized and published via the secure automated update delivery system.

---

## Security Architecture & Design Principles

### 1. Zero Credential Exposure
- No GitHub Personal Access Tokens, GitHub App private keys, or cloud infrastructure secrets are ever compiled into the client-side bundles, installers, or desktop binaries.
- Client applications communicate with the dedicated update backend service which manages GitHub integration server-side.

### 2. Cryptographic Package Verification
- All auto-update packages and release manifests are cryptographically verified using SHA-256 hashes and digital signatures prior to execution.
- Tampered or corrupted packages are immediately rejected.

### 3. Private Repository & Access Control
- The source repository is permanently private.
- CI/CD workflows run with least-privilege token scopes.
- Branch protection rules enforce required CI checks prior to merging.

### 4. Data Protection & Privacy
- User preferences, local database files, audio samples, and offline licenses are stored strictly in dedicated user paths (`C:\ProgramData\DubbingVidans` on Windows) and are never deleted or overwritten during application updates.
