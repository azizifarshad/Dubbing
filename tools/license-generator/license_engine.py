import os
import json
import uuid
import base64
from datetime import datetime, timezone
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

PRODUCT_NAME = "Dubbing-Gholam"
LICENSE_SCHEMA_VERSION = 1

def get_keys_dir():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    keys_dir = os.path.join(current_dir, "keys")
    os.makedirs(keys_dir, exist_ok=True)
    return keys_dir

def load_or_generate_master_keys():
    keys_dir = get_keys_dir()
    priv_path = os.path.join(keys_dir, "owner_private_key.pem")
    pub_path = os.path.join(keys_dir, "owner_public_key.pem")

    if os.path.exists(priv_path) and os.path.exists(pub_path):
        with open(priv_path, "rb") as f:
            priv_key = serialization.load_pem_private_key(f.read(), password=None)
        with open(pub_path, "rb") as f:
            pub_key = serialization.load_pem_public_key(f.read())
        return priv_key, pub_key

    # Generate new keypair if not found
    priv_key = ed25519.Ed25519PrivateKey.generate()
    pub_key = priv_key.public_key()

    priv_pem = priv_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    pub_pem = pub_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    with open(priv_path, "wb") as f:
        f.write(priv_pem)
    with open(pub_path, "wb") as f:
        f.write(pub_pem)

    return priv_key, pub_key

def build_canonical_request_string(hw_fingerprint, device_pubkey, computer_name, requested_at):
    return "|".join([
        f"PRODUCT={PRODUCT_NAME}",
        f"VERSION={LICENSE_SCHEMA_VERSION}",
        f"FINGERPRINT={hw_fingerprint}",
        f"DEVICE_KEY={device_pubkey.strip()}",
        f"MACHINE={computer_name}",
        f"REQUESTED_AT={requested_at}"
    ])

def build_canonical_license_string(p):
    features_sorted = ",".join(sorted(p.get("features", [])))
    return "|".join([
        f"PRODUCT={p['product']}",
        f"VERSION={p['version']}",
        f"ID={p['licenseId']}",
        f"CUSTOMER={p['customerName']}",
        f"FINGERPRINT={p['hardwareFingerprint']}",
        f"DEVICE_KEY={p['devicePublicKey'].strip()}",
        f"TYPE={p['licenseType']}",
        f"ISSUED={p['issuedAt']}",
        f"FEATURES={features_sorted}"
    ])

def verify_activation_request(req_data: dict) -> dict:
    """
    Verifies that the customer's activation request was signed by the device's private key.
    """
    try:
        if req_data.get("product") != PRODUCT_NAME:
            return {"valid": False, "error": f"Invalid product name: {req_data.get('product')}"}

        hw_fp = req_data.get("hardwareFingerprint")
        dev_pubkey_pem = req_data.get("devicePublicKey")
        comp_name = req_data.get("computerName")
        req_at = req_data.get("requestedAt")
        dev_sig_b64 = req_data.get("deviceSignature")

        if not all([hw_fp, dev_pubkey_pem, comp_name, req_at, dev_sig_b64]):
            return {"valid": False, "error": "Missing required fields in request"}

        canonical_req = build_canonical_request_string(hw_fp, dev_pubkey_pem, comp_name, req_at)
        dev_pubkey = serialization.load_pem_public_key(dev_pubkey_pem.encode("utf-8"))
        dev_sig = base64.b64decode(dev_sig_b64)

        dev_pubkey.verify(dev_sig, canonical_req.encode("utf-8"))
        return {"valid": True, "details": req_data}
    except Exception as e:
        return {"valid": False, "error": f"Device signature verification failed: {str(e)}"}

def generate_signed_license(
    customer_name: str,
    hardware_fingerprint: str,
    device_public_key_pem: str,
    features=None,
    license_id=None
) -> dict:
    """
    Signs a permanent hardware-bound license file using the Master Authority Private Key.
    """
    priv_key, _ = load_or_generate_master_keys()

    if not customer_name or not customer_name.strip():
        customer_name = "Valued Customer"

    if features is None:
        features = [
            "offline_stt",
            "offline_translation",
            "offline_tts",
            "offline_timeline_sync",
            "offline_video_muxing",
            "unlimited_export"
        ]

    if not license_id:
        license_id = str(uuid.uuid4())

    issued_at = datetime.now(timezone.utc).isoformat()

    payload = {
        "version": LICENSE_SCHEMA_VERSION,
        "product": PRODUCT_NAME,
        "licenseId": license_id,
        "customerName": customer_name.strip(),
        "hardwareFingerprint": hardware_fingerprint.strip(),
        "devicePublicKey": device_public_key_pem.strip(),
        "licenseType": "permanent",
        "issuedAt": issued_at,
        "features": features
    }

    canonical_str = build_canonical_license_string(payload)
    sig = priv_key.sign(canonical_str.encode("utf-8"))
    sig_b64 = base64.b64encode(sig).decode("utf-8")

    return {
        "payload": payload,
        "authoritySignature": sig_b64
    }
