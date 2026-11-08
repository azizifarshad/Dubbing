#!/usr/bin/env python3
"""
Dubbing Vidans License Generator CLI (Software Owner Tool)
Usage:
    python license_generator_cli.py --request customer_activation.vidansreq --customer "Ali Rezaei" --output AliRezaei.vidanslic
"""

import os
import sys
import json
import argparse
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from license_engine import (
    PRODUCT_NAME,
    verify_activation_request,
    generate_signed_license
)

def main():
    parser = argparse.ArgumentParser(description=f"{PRODUCT_NAME} Offline License Generator (Owner Tool)")
    parser.add_argument("--request", "-r", required=True, help="Path to customer's .vidansreq activation request file")
    parser.add_argument("--customer", "-c", required=True, help="Customer name or organization label")
    parser.add_argument("--output", "-o", help="Path to write the generated .vidanslic license file")

    args = parser.parse_args()

    if not os.path.exists(args.request):
        print(f"Error: Activation request file not found: {args.request}")
        sys.exit(1)

    with open(args.request, "r", encoding="utf-8") as f:
        try:
            req_data = json.load(f)
        except Exception as e:
            print(f"Error: Failed to parse request JSON: {e}")
            sys.exit(1)

    verification = verify_activation_request(req_data)
    if not verification["valid"]:
        print(f"Verification Error: {verification['error']}")
        sys.exit(1)

    details = verification["details"]
    print("=" * 60)
    print(f" {PRODUCT_NAME} - Activation Request Verified")
    print("=" * 60)
    print(f"  Computer Name: {details.get('computerName')}")
    print(f"  OS:            {details.get('osName')}")
    print(f"  CPU Model:     {details.get('cpuModel')}")
    print(f"  Fingerprint:   {details.get('hardwareFingerprint')}")
    print(f"  Customer:      {args.customer}")
    print("=" * 60)

    signed_license = generate_signed_license(
        customer_name=args.customer,
        hardware_fingerprint=details["hardwareFingerprint"],
        device_public_key_pem=details["devicePublicKey"],
        product_name=details.get("product", PRODUCT_NAME)
    )

    out_path = args.output
    if not out_path:
        clean_name = "".join(c for c in args.customer if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
        out_path = f"DubbingVidans_License_{clean_name}.vidanslic"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(signed_license, f, indent=2, ensure_ascii=False)

    print(f"\n[SUCCESS] Permanent license generated and signed successfully:")
    print(f" -> {os.path.abspath(out_path)}")
    print(f"\nSend this .vidanslic file to the customer to activate {PRODUCT_NAME} permanently on their device.\n")

if __name__ == "__main__":
    main()
