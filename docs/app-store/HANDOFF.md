# 1.0 launch — session handoff / current state

A "pick up here" snapshot for the 1.0 App Store launch. The authoritative,
step-by-step runbook is [launch-1.0-checklist.md](./launch-1.0-checklist.md);
this doc is the current state + where to resume.

## Goal
Publish Markup 1.0 to **both** the iOS App Store and the Mac App Store, in
parallel (see [ADR-004](../decisions/ADR-004-app-store-1.0.md)). The signed +
notarized direct-download DMG is already live and stays.

## State (as of the 1.0 launch, 2026-06)
- `main`: desktop **1.0.1** / iOS **1.0.0 (build 100000)** — the iOS build is on TestFlight. 0 open PRs.
- Desktop **v1.0.1** GitHub Release published (signed + notarized DMG + auto-updater).
- Submission materials are ready and in-repo:
  - Listing copy (EN + 中文), categories, URLs, copyright — `marketing/app-store/listing.md`
  - App Privacy "Data Not Collected" answers + App Review notes — `marketing/app-store/privacy-and-review.md`
  - Marketing screenshots, 5 each — `marketing/app-store/screenshots/{ios-6.9,ipad-13,mac}/`
- Fixed + shipped: iOS GitHub-vault reader black screen (in build 100000); desktop light-mode table dark-column (in 1.0.1).

## Key IDs / facts
- iOS: bundle `com.appkon.markup.ios`, ASC app id `6775530509`, App name **"Markup - MD Reader"**.
- Mac: bundle `com.appkon.markup`.
- Apple Team `9LH9NBX7P4` (Bihao Wang) · Apple ID `wangharp@gmail.com`.
- EAS: account `hakkoai` / project `markup` (this machine is logged in as `oratis`).
- iOS build: `cd ios && ./scripts/build-ios.sh production` (build number derived from `MARKETING_VERSION` by `ios/scripts/derive-build-number.sh`).

## Resume here
Most steps are account-gated (done by the user in the Apple Developer portal /
App Store Connect — the assistant guides, and can drive builds, but cannot log in
to the Apple account or press Submit).

**iOS App Store (basically ready):** in ASC → "Markup - MD Reader" → the 1.0
version: attach build 100000, paste `listing.md` copy, upload `ios-6.9/` +
`ipad-13/` screenshots, set App Privacy = Data Not Collected, paste the review
notes, Submit for Review. (Export compliance auto-answers: `ITSAppUsesNonExemptEncryption=NO`.)

**Mac App Store (needs one-time setup first):**
1. Register App ID `com.appkon.markup` with **App Sandbox**.
2. Create **Apple Distribution** + **Mac Installer Distribution** certs + a **Mac App Store** provisioning profile.
3. Add 5 GitHub secrets — `MAS_CERT_P12_BASE64`, `MAS_CERT_P12_PASSWORD`, `MAS_APP_IDENTITY`, `MAS_INSTALLER_IDENTITY`, `MAS_PROVISION_PROFILE_BASE64` (see checklist §C and `.github/workflows/release.yml`).
4. Once secrets exist → re-run the **v1.0.1** Release workflow; the `mas` job produces `Markup.pkg`. (Assistant can drive this.)
5. ASC → new macOS app for `com.appkon.markup` → `listing.md` §Mac copy + `mac/` screenshots + privacy/review → upload `Markup.pkg` (Transporter or `xcrun altool`) → Submit.

## Constraints (this machine)
- Only CommandLineTools (no full Xcode): the iOS **app target** is verified by CI, not locally; `MarkupKit` builds via `swift build`.
- No App Store Connect `.p8` locally → cannot query ASC; the Mac `.pkg` cannot be built until the user adds the `MAS_*` secrets.
- Outward-facing Apple steps are the user's; the assistant guides and can trigger CI/EAS builds.

## Optional follow-ups
- A Mac "Open from GitHub" screenshot (the Mac set is currently all local-folder docs); `mac/05_navigate.png` is a crop of a raw that had a browser window behind it.
- A localized 简体中文 screenshot set (re-run `marketing/scripts/make-screenshots.py` with 中文 captions).
