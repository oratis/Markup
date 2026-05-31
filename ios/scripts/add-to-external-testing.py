#!/usr/bin/env python3
"""
Promote the latest TestFlight build to the external (public) testing group.

Ported from luddi (apps/mobile/scripts/add-to-external-testing.py). After
`eas submit` uploads the IPA, Apple processes it (~5-10 min); this script polls
until it's VALID, submits it for Beta App Review (required for external testing),
and adds it to the external group so the public TestFlight link picks it up.

Setup (fill these in once the App Store Connect app + API key exist):
    KEY_ID / ISSUER_ID  – from App Store Connect → Users and Access → Integrations
    APP_ID              – the numeric app id (same as eas.json submit.ascAppId)
    EXTERNAL_GROUP_ID   – the external TestFlight group's id
    key file            – ios/keys/AuthKey_<KEY_ID>.p8   (gitignored)

Usage:
    python3 ios/scripts/add-to-external-testing.py                 # latest build
    python3 ios/scripts/add-to-external-testing.py --version 0.1.0 --build 1000
    python3 ios/scripts/add-to-external-testing.py --wait-review   # block until approved

Requires: pip install pyjwt cryptography
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error

# ── App Store Connect config (FILL IN) ────────────────────────────────────────
KEY_ID = os.environ.get("ASC_KEY_ID", "REPLACE_KEY_ID")
ISSUER_ID = os.environ.get("ASC_ISSUER_ID", "REPLACE_ISSUER_ID")
APP_ID = os.environ.get("ASC_APP_ID", "REPLACE_ASC_APP_ID")
EXTERNAL_GROUP_ID = os.environ.get("ASC_EXTERNAL_GROUP_ID", "REPLACE_EXTERNAL_GROUP_ID")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PATH = os.environ.get(
    "ASC_KEY_PATH", os.path.join(SCRIPT_DIR, "..", "keys", f"AuthKey_{KEY_ID}.p8"))


def make_token():
    import jwt
    with open(KEY_PATH) as f:
        private_key = f.read()
    now = int(time.time())
    payload = {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}
    return jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": KEY_ID})


def api_get(path, token):
    req = urllib.request.Request(
        f"https://api.appstoreconnect.apple.com{path}",
        headers={"Authorization": f"Bearer {token}"})
    return json.loads(urllib.request.urlopen(req).read())


def api_post(path, token, body):
    req = urllib.request.Request(
        f"https://api.appstoreconnect.apple.com{path}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read()) if resp.status != 204 else None
    except urllib.error.HTTPError as e:
        if e.code == 409:
            return {"conflict": True}
        print(f"  API error {e.code}: {e.read().decode()}", file=sys.stderr)
        raise


def find_build(token, version=None, build_number=None):
    data = api_get(
        f"/v1/builds?filter[app]={APP_ID}&sort=-uploadedDate&limit=10", token)
    for build in data.get("data", []):
        attrs = build["attributes"]
        num = attrs.get("version", "")
        short = attrs.get("cfBundleShortVersionString", num)
        print(f"  build: v{short} ({num}) — {attrs.get('processingState','')}")
        if version and build_number:
            if num == str(build_number):
                return build
        elif version:
            if short == version:
                return build
        else:
            return build
    return None


def wait_for_processing(token, version, build_number, timeout):
    print("⏳ Waiting for Apple to finish processing…")
    start = time.time()
    while time.time() - start < timeout:
        build = find_build(token, version, build_number)
        if build:
            state = build["attributes"].get("processingState", "")
            if state == "VALID":
                print("✅ Build is VALID")
                return build
            if state in ("FAILED", "INVALID"):
                print(f"❌ Processing failed: {state}")
                sys.exit(1)
        time.sleep(30)
    print("❌ Timeout waiting for processing")
    sys.exit(1)


def submit_for_beta_review(token, build_id):
    print("📝 Submitting for Beta App Review…")
    body = {"data": {"type": "betaAppReviewSubmissions",
                     "relationships": {"build": {"data": {"type": "builds", "id": build_id}}}}}
    try:
        result = api_post("/v1/betaAppReviewSubmissions", token, body)
        print("  already submitted" if result and result.get("conflict") else "  ✅ submitted")
    except urllib.error.HTTPError as e:
        if e.code == 422:
            print("  ⏭️  skipped (auto-approved or already reviewed)")
        else:
            raise


def add_to_external_group(token, build_id):
    print("📦 Adding to external testing group…")
    result = api_post(
        f"/v1/betaGroups/{EXTERNAL_GROUP_ID}/relationships/builds", token,
        {"data": [{"type": "builds", "id": build_id}]})
    print("  already in group" if result and result.get("conflict") else "  ✅ added")


def main():
    p = argparse.ArgumentParser(description="Promote a TestFlight build to external testing")
    p.add_argument("--version")
    p.add_argument("--build")
    p.add_argument("--no-wait", action="store_true")
    p.add_argument("--timeout", type=int, default=600)
    args = p.parse_args()

    if "REPLACE" in (KEY_ID + ISSUER_ID + APP_ID + EXTERNAL_GROUP_ID):
        print("✗ Fill in KEY_ID / ISSUER_ID / APP_ID / EXTERNAL_GROUP_ID "
              "(or set the ASC_* env vars).", file=sys.stderr)
        sys.exit(2)

    token = make_token()
    print(f"🔑 ASC API authenticated (key {KEY_ID})")

    build = (find_build(token, args.version, args.build) if args.no_wait
             else wait_for_processing(token, args.version, args.build, args.timeout))
    if not build:
        print("❌ Build not found")
        sys.exit(1)

    build_id = build["id"]
    submit_for_beta_review(token, build_id)
    add_to_external_group(token, build_id)
    print("✓ Done — external testers get it once Beta Review approves.")


if __name__ == "__main__":
    main()
