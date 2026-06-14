# 1.0 App Store launch — checklist

Target: **1.0.0** on the **iOS App Store** and the **Mac App Store**, in parallel
(see [ADR-004](../decisions/ADR-004-app-store-1.0.md)). The direct-download DMG
channel stays live alongside MAS.

Versions are already bumped in-repo:
- iOS `MARKETING_VERSION = 1.0.0` → build **100000** (derived; > prior 2100)
- desktop `1.0.0` in `package.json` / `src-tauri/tauri.conf.json` / `Cargo.toml` (+`Cargo.lock`)

Repo-side prep is done. Everything below is **account-gated** unless marked 🤖.

Legend: 🔑 needs your Apple account / portal · 🤖 I can run/drive · ⏳ wait/review · ✅ done

---

## A. Shared prerequisites
- [x] ✅ Apple Developer Program active — Team `9LH9NBX7P4` (Bihao Wang), `wangharp@gmail.com`
- [x] ✅ Privacy Policy URL live — https://github.com/oratis/Markup/blob/main/PRIVACY.md
- [x] ✅ Listing copy (EN+中文), privacy-label answers, App Review notes, reviewer sample vault — in `docs/app-store/`
- [ ] 🔑 Screenshots (see §D)

---

## B. iOS App Store  (`com.appkon.markup.ios`, ASC app `6775530509`)
Binary pipeline already proven (EAS → App Store Connect). Remaining:

1. 🤖 Build 1.0.0 to ASC: `cd ios && ./scripts/build-ios.sh production` (build 100000). *I can trigger this on your say-so.*
2. ⏳ ~5–10 min ASC processing.
3. 🔑 App Store Connect → Markup → **+ Version → 1.0.0**:
   - Attach build **100000**
   - Paste metadata from [`listing-copy.md`](./listing-copy.md) — name, subtitle, keywords, description, promo text, support/marketing/privacy URLs, **category Productivity**, **age 4+**, copyright
   - **App Privacy → "Data Not Collected"** (answers in [`privacy-label-and-review.md`](./privacy-label-and-review.md))
   - Upload screenshots — iPhone 6.9″ (1320×2868) + 6.5″ (1242×2688) + iPad 13″ (2064×2752)
   - **App Review notes** + sample-vault pointer ([`privacy-label-and-review.md`](./privacy-label-and-review.md))
4. 🔑 **Submit for Review.**

---

## C. Mac App Store  (`com.appkon.markup`) — first-time MAS setup
Code is ready; this is new account/cert work.

1. 🔑 developer.apple.com → **Identifiers** → register App ID `com.appkon.markup` with the **App Sandbox** capability.
2. 🔑 Create two certificates (CSR from Keychain Access → Certificate Assistant):
   - **Apple Distribution** — signs the `.app`
   - **Mac Installer Distribution** ("3rd Party Mac Developer Installer") — signs the `.pkg`
3. 🔑 Create a **Mac App Store** provisioning profile for `com.appkon.markup` + the Apple Distribution cert → download `Markup_MAS.provisionprofile`.
4. 🔑 Add GitHub repo **Secrets → Actions** (Settings → Secrets and variables → Actions):
   - `MAS_CERT_P12_BASE64` — base64 of a `.p12` holding **both** certs + private keys
   - `MAS_CERT_P12_PASSWORD` — the `.p12` export passphrase
   - `MAS_APP_IDENTITY` — e.g. `Apple Distribution: Bihao Wang (9LH9NBX7P4)` (exact string from Keychain)
   - `MAS_INSTALLER_IDENTITY` — e.g. `3rd Party Mac Developer Installer: Bihao Wang (9LH9NBX7P4)`
   - `MAS_PROVISION_PROFILE_BASE64` — base64 of the `.provisionprofile`
5. 🤖 Produce the `.pkg`: push tag **`v1.0.0`** → CI `mas` job runs `scripts/build-mas.sh` → uploads `Markup.pkg` artifact (7-day retention). *I can create + push the tag once the secrets exist.* (Local alt: run `scripts/build-mas.sh` with the three `MAS_*` env vars.)
6. 🔑 App Store Connect → **+ New App** (macOS) for `com.appkon.markup`: SKU, **Free**, metadata from [`listing-copy.md`](./listing-copy.md), **"Data Not Collected"**, screenshots (1280×800 or 2560×1600, ≥1).
7. 🔑 Upload `Markup.pkg` — **Transporter.app** (drag in) or
   `xcrun altool --upload-app -f Markup.pkg -t macos --apple-id wangharp@gmail.com --password <app-specific-password>`.
8. 🔑 Attach build → **Submit for Review.**

Background + gotchas: [`MAS-publishing-plan.md`](./MAS-publishing-plan.md).

---

## D. Screenshots
- **iOS** 🔑 — needs a Simulator/device. (I can't run an iOS Simulator here — Command Line Tools only; the app target builds in CI/Xcode.) You capture, or we automate later with a dedicated screenshot scheme.
- **macOS** 🤖 — I can build + launch the app and capture, using `docs/app-store/reviewer-sample-vault/` for content, if you want.

---

## What I can drive next (just say which)
- **B1** — trigger the iOS 1.0.0 build to App Store Connect now.
- **C5** — once the `MAS_*` secrets are in, push `v1.0.0` to produce `Markup.pkg`.
- **D (macOS)** — generate Mac screenshots from the sample vault.

Release notes for the tag: [`../release-notes-v1.0.0.md`](../release-notes-v1.0.0.md).
