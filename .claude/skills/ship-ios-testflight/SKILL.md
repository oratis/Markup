---
name: ship-ios-testflight
description: >-
  Publish the Markup iOS app to TestFlight. Use when asked to ship/release the
  iOS app, cut a TestFlight build, bump the iOS version, or "发个 TestFlight 版本".
  Covers the real, working flow: EAS custom build (cloud) that archives the
  hand-authored Xcode project and uploads to TestFlight via altool, plus a
  local-Mac fallback. Documents the credentials the user must supply (never
  committed) and the gotchas that actually bit us.
---

# Ship Markup iOS to TestFlight

Markup iOS is a **native SwiftUI Xcode app** (`ios/MarkupApp/MarkupApp.xcodeproj`,
hand-authored) plus the pure-logic `ios/MarkupKit` Swift package. It is **not**
an Expo/React-Native app, so EAS's *standard* JS build can't build it — we use an
**EAS custom build** that runs `xcodebuild`/`fastlane gym` on an EAS macOS worker
and uploads the `.ipa` to TestFlight with `xcrun altool`.

This skill is the runbook + the exact commands. The scripts and EAS config it
drives are **already tracked in the repo** (paths below) — this file does not
duplicate them, so there's one source of truth that travels with the repo to any
machine.

## Fixed facts (not secrets)

| Thing | Value |
|---|---|
| Bundle id | `com.appkon.markup.ios` |
| Apple Team ID | `9LH9NBX7P4` |
| App Store Connect app id (`ascAppId`) | `6775530509` |
| Expo account / project | `hakkoai` / `markup` |
| App record in App Store Connect | already created (Apps → Markup) |
| Signing | **EAS-managed remote credentials** (automatic) — Distribution cert + App Store provisioning profile, set up once via `eas credentials`. No local certs/profiles to juggle. |

## Repo files this flow uses (canonical — don't duplicate)

- `ios/scripts/build-ios.sh` — entry point. `production` (default) → EAS custom build; `simulator` → unsigned cloud `.app`.
- `ios/scripts/derive-build-number.sh` — derives a monotonic `CFBundleVersion` from `MARKETING_VERSION`.
- `ios/eas.json` — EAS profiles. `production` uses `config: production.yml`, `credentialsSource: remote`, `image: macos-sequoia-15.6-xcode-26.2`, `resourceClass: large`.
- `ios/.eas/build/production.yml` — the worker steps: `configure_ios_credentials` → install ASC key → `fastlane gym` (App Store archive) → `xcrun altool --upload-app` → collect artifact.
- `ios/MarkupApp/ExportOptions.plist` — `app-store-connect`, `signingStyle: automatic` (used by the local fallback).
- `ios/scripts/archive-and-upload.sh` — local-Mac fallback (Path B).
- `ios/RELEASE.md` — longer prose runbook.

## Credentials — the user supplies these; NEVER commit them

Nothing below belongs in git. `.gitignore` already blocks `*.p8`, `.env`,
`ios/keys/`, `*.p12`, `*.mobileprovision`.

**For the EAS path (Path A — normal):** the App Store Connect API key is stored as
**Expo project secrets**, not on disk. Required secret names (set once per Expo
project with `eas secret:create --scope project`):

- `ASC_KEY_BASE64` — `base64 -i AuthKey_<KEYID>.p8` (the API key, base64-encoded)
- `ASC_KEY_ID` — the key's Key ID (e.g. the `WCSUJX7FW7` in `AuthKey_WCSUJX7FW7.p8`)
- `ASC_ISSUER_ID` — the App Store Connect API Issuer ID (a UUID)

Check they exist with `eas secret:list` (needs `eas login`, account `hakkoai`).

**For the local fallback (Path B):** export these env vars pointing at a `.p8`
kept **outside the repo**:

- `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID=9LH9NBX7P4`
- `ASC_KEY_PATH` — absolute path to `AuthKey_<KEYID>.p8`

On the original Mac the key lives at **`~/AppleIntegration/AuthKey_WCSUJX7FW7.p8`**
(outside the repo, alongside other app secrets). On a new Mac, download the `.p8`
again from App Store Connect → Users and Access → Integrations → App Store Connect
API (you can only download a given key once; generate a new one if lost), and put
it somewhere outside the repo.

> The App Store Connect API key needs the **App Manager** role. An Apple Developer
> Program membership ($99/yr) is required — nothing substitutes for it.

## Release procedure (Path A — EAS, the one we actually use)

1. **Verify the code first** (CI gates these too, but check locally):
   ```bash
   (cd ios/MarkupKit && swift test)
   (cd ios/MarkupApp && xcodebuild -project MarkupApp.xcodeproj -scheme MarkupApp \
      -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
      CODE_SIGNING_ALLOWED=NO build)
   ```
   Make sure the PR(s) you're shipping are merged and `main` CI is green.

2. **Bump the version.** Edit `MARKETING_VERSION` in
   `ios/MarkupApp/MarkupApp.xcodeproj/project.pbxproj` — it appears **twice**
   (Debug + Release configs); change **both**. This is the single source of truth;
   the build number is derived from it, so never hand-edit `CURRENT_PROJECT_VERSION`.
   ```bash
   sed -i '' 's/MARKETING_VERSION = 0.2.5;/MARKETING_VERSION = 0.2.6;/g' \
     ios/MarkupApp/MarkupApp.xcodeproj/project.pbxproj
   ```
   Confirm the derived build number is **higher than the last shipped build**
   (Apple rejects duplicate/lower build numbers):
   ```bash
   ios/scripts/derive-build-number.sh   # 0.2.6 → 2060 ; formula: M*100000 + m*1000 + p*10 + s
   ```
   Commit the bump on a branch → PR → merge (don't push to `main` directly).

3. **Build + upload** (from a Mac with `eas login` done; account `hakkoai`):
   ```bash
   cd ios
   ./scripts/build-ios.sh production
   ```
   The `production.yml` worker uploads to TestFlight with `altool` **before** the
   build reports "Build finished" — so **build success == uploaded**. The build
   prints an `.ipa` artifact URL and an `expo.dev/.../builds/<id>` page.

4. **Wait for processing.** The build shows in App Store Connect → TestFlight in
   ~5–10 min. Internal testers can install via the TestFlight app. To push to an
   external group, `python3 ios/scripts/add-to-external-testing.py`.

## Gotchas (these actually bit us — heed them)

- **Do NOT pass `--auto-submit`.** `production.yml` already uploads via `altool`.
  The extra `eas submit --latest --non-interactive` step fails with
  *"App Store Connect API Keys cannot be set up in --non-interactive mode"* and is
  redundant. Just run `./scripts/build-ios.sh production`.
- **`ios/package-lock.json` must stay committed.** EAS's lockfile pre-flight runs
  locally (before the remote build) and fails with "No lockfile found" without it.
  `eas.json`'s `EAS_BUILD_SKIP_LOCKFILE_CHECK` only affects the remote step.
- **Build numbers must be strictly increasing and unique.** Bump
  `MARKETING_VERSION` every release. To re-build the *same* semver (e.g. after a
  rejected upload), set `IOS_BUILD_BUMP=1` (or higher) in the environment so
  `derive-build-number.sh` yields a fresh number.
- **EAS macOS image is pinned** (`macos-sequoia-15.6-xcode-26.2`). If a build
  fails on a toolchain mismatch, that's the knob in `eas.json`.
- **First build on a fresh Expo project** needs `eas credentials` run once to mint
  the Distribution cert + provisioning profile (then `credentialsSource: remote`
  reuses them).

## Path B — local archive on a Mac (fallback, no EAS)

When you'd rather not use EAS and have Xcode locally:
```bash
export ASC_KEY_ID=WCSUJX7FW7
export ASC_ISSUER_ID=<your-issuer-uuid>
export APPLE_TEAM_ID=9LH9NBX7P4
export ASC_KEY_PATH=~/AppleIntegration/AuthKey_WCSUJX7FW7.p8
ios/scripts/archive-and-upload.sh
```
This `xcodebuild archive` (with `-allowProvisioningUpdates` so signing is
automatic) → `-exportArchive` (via `ExportOptions.plist`) → `altool --upload-app`.

## Quick reference

```bash
# normal release
cd ios && ./scripts/build-ios.sh production
# check next build number
ios/scripts/derive-build-number.sh
# verify Expo secrets are present
eas secret:list
```
