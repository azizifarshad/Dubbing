#!/usr/bin/env python3
"""
Release Signing & Update Manifest Generation Tool
Used by CI/CD and release automation to sign application installer packages
using Ed25519 asymmetric cryptography and compute SHA-256 checksums.
"""

import os
import sys
import json
import hashlib
import base64
from datetime import datetime, timezone
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

APP_NAME = "Dubbing Vidans"

def compute_sha256(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def get_keys():
    """
    Load dedicated Ed25519 update-signing keys.
    CRITICAL SECURITY RULE:
    Never use or fall back to the software owner's licensing private key.
    Update signing is strictly separated from software licensing.
    """
    # 1. Check environment variable (primary in CI/CD pipeline secrets)
    env_priv = os.environ.get("UPDATE_SIGNING_PRIVATE_KEY") or os.environ.get("UPDATE_SIGNING_PRIVATE_KEY_PEM")
    if env_priv and env_priv.strip():
        priv_key = serialization.load_pem_private_key(env_priv.strip().encode("utf-8"), password=None)
        pub_key = priv_key.public_key()
        return priv_key, pub_key

    # 2. Check local update-signer keys directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))

    candidates = [
        os.path.join(script_dir, "keys"),
        os.path.join(project_root, "tools", "update-signer", "keys"),
        os.path.join(project_root, "keys"),
    ]

    priv_path = None
    pub_path = None

    for d in candidates:
        pr = os.path.join(d, "update_signer_private_key.pem")
        pb = os.path.join(d, "update_signer_public_key.pem")
        if os.path.exists(pr):
            priv_path = pr
            if os.path.exists(pb):
                pub_path = pb
            break

    if not priv_path:
        raise FileNotFoundError(
            "Dedicated update signing private key not found.\n"
            "To resolve in GitHub Actions CI/CD:\n"
            "  1. Go to repository Settings -> Secrets and variables -> Actions\n"
            "  2. Add secret named UPDATE_SIGNING_PRIVATE_KEY with the update signer PEM private key.\n"
            "To resolve locally:\n"
            "  Place update_signer_private_key.pem inside tools/update-signer/keys/."
        )

    with open(priv_path, "rb") as f:
        priv_key = serialization.load_pem_private_key(f.read(), password=None)

    if pub_path and os.path.exists(pub_path):
        with open(pub_path, "rb") as f:
            pub_key = serialization.load_pem_public_key(f.read())
    else:
        pub_key = priv_key.public_key()

    return priv_key, pub_key

def build_canonical_manifest_string(app_name: str, version: str, channel: str, os_name: str, arch: str, sha256_hash: str, file_size: int, min_version: str) -> str:
    return "|".join([
        f"APP={app_name}",
        f"VERSION={version.lstrip('v')}",
        f"CHANNEL={channel}",
        f"OS={os_name}",
        f"ARCH={arch}",
        f"SHA256={sha256_hash}",
        f"SIZE={file_size}",
        f"MIN={min_version}"
    ])

def sign_release_manifest(installer_path: str, version: str, channel: str = "stable", notes_en: str = "", notes_fa: str = ""):
    if not os.path.exists(installer_path):
        raise FileNotFoundError(f"Installer not found: {installer_path}")

    file_size = os.path.getsize(installer_path)
    sha256_hash = compute_sha256(installer_path)
    file_name = os.path.basename(installer_path)
    clean_version = version.lstrip("v")
    min_supported_version = "1.0.0"

    priv_key, pub_key = get_keys()

    canonical_str = build_canonical_manifest_string(
        app_name=APP_NAME,
        version=clean_version,
        channel=channel,
        os_name="windows",
        arch="x64",
        sha256_hash=sha256_hash,
        file_size=file_size,
        min_version=min_supported_version
    )

    signature = priv_key.sign(canonical_str.encode('utf-8'))
    sig_b64 = base64.b64encode(signature).decode('utf-8')

    # Verify signature before completing
    pub_key.verify(signature, canonical_str.encode('utf-8'))

    manifest = {
        "schemaVersion": 1,
        "appName": APP_NAME,
        "version": clean_version,
        "channel": channel,
        "os": "windows",
        "arch": "x64",
        "fileName": file_name,
        "fileSizeBytes": file_size,
        "sha256": sha256_hash,
        "minSupportedVersion": min_supported_version,
        "canonicalString": canonical_str,
        "signature": sig_b64,
        "algorithm": "Ed25519",
        "releaseDate": datetime.now(timezone.utc).isoformat(),
        "releaseNotes": notes_en or f"Dubbing Vidans v{clean_version} update with performance and stability improvements.",
        "releaseNotesFa": notes_fa or f"به‌روزرسانی دوبله ویدانس نسخه {clean_version} شامل بهبودهای سرعت، پایداری و امنیت.",
    }

    return manifest, sha256_hash

def main():
    if len(sys.argv) < 3:
        print("Usage: python sign_release.py <path_to_installer> <version> [channel] [out_dir]")
        sys.exit(1)

    installer_path = sys.argv[1]
    version = sys.argv[2]
    channel = sys.argv[3] if len(sys.argv) > 3 else "stable"
    out_dir = sys.argv[4] if len(sys.argv) > 4 else os.path.dirname(installer_path)

    print(f"[*] Computing SHA-256 and signing release: {installer_path} (Version: {version}, Channel: {channel})...")
    manifest, sha256_hash = sign_release_manifest(installer_path, version, channel)

    os.makedirs(out_dir, exist_ok=True)
    manifest_path = os.path.join(out_dir, "update-manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    checksum_path = os.path.join(out_dir, "sha256sums.txt")
    with open(checksum_path, "w", encoding="utf-8") as f:
        f.write(f"{sha256_hash}  {os.path.basename(installer_path)}\n")

    print(f"[✓] Successfully generated and signed update manifest: {manifest_path}")
    print(f"[✓] Installer SHA-256: {sha256_hash}")
    print(f"[✓] Ed25519 Signature: {manifest['signature'][:32]}...")

if __name__ == "__main__":
    main()
