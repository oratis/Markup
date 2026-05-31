# Markup iOS — Packaging, Testing & Release Mechanism

> Modeled on the **luddi** mobile release mechanism (`Projects/Claude/Luddi/apps/mobile`),
> adapted for the one structural difference: **Markup iOS is a native SwiftUI app, not Expo/RN.**
> Where luddi relies on Expo (prebuild, EAS Update OTA, channels), we substitute the native
> equivalent (an EAS *custom build* that runs `xcodebuild`); everything else — EAS-managed Apple
> credentials, build profiles, derived build numbers, `eas submit`, the TestFlight-external-group
> automation — carries over almost unchanged.

---

## 0. What we keep from luddi vs. what changes

| luddi (Expo/RN) | Markup (native SwiftUI) | Why |
|---|---|---|
| `eas build` → Expo prebuild → Gradle/xcodebuild | `eas build` → **custom build** (`.eas/build/*.yml`) → `xcodebuild` | No JS/RN; EAS just runs Xcode on its macOS worker. |
| `credentialsSource: remote` (EAS-managed certs/profiles) | **same** | Keep Apple credentials "托管给 Expo". |
| Build profiles: simulator / preview / staging / production | simulator / preview / **production** | Drop `staging` (no backend env split). |
| Version in root `package.json`; `buildNumber` derived in `app.config.ts` | Version in `MARKETING_VERSION`; build number derived by `derive-build-number.sh` | Native single-source = the Xcode marketing version. |
| `IOS_BUILD_BUMP` retry offset | **same** | Apple rejects duplicate build numbers per version. |
| `eas submit` (`ascAppId`) → App Store Connect | **same** | Identical. |
| `add-to-external-testing.py` (ASC API) → public group | **same** (ported) | Identical. |
| EAS Update channels (OTA JS rollback) | **dropped** | Native apps can't OTA; rollback = rebuild + resubmit. |
| Android (Play, AAB) | **dropped** | iOS-only scope. |
| `ITSAppUsesNonExemptEncryption: false` in infoPlist | **same** (build setting) | Skip the export-compliance prompt each upload. |
| Mobile CI = typecheck + jest (fast); build/submit manual | iOS CI = `swift test` (fast); build/submit manual | Same separation: CI gates code, humans cut releases. |

---

## 1. Version & build number (single source of truth)

Mirrors luddi §1.1 ("版本号只在一处维护"):

- **Marketing version** (`CFBundleShortVersionString`) is maintained in **one place**: `MARKETING_VERSION`
  in the Xcode target. This is the semver shown to users (e.g. `0.1.0`).
- **Build number** (`CFBundleVersion`) is **derived**, never hand-maintained, by
  [`ios/scripts/derive-build-number.sh`](../../../ios/scripts/derive-build-number.sh) using luddi's
  monotonic formula:

  ```
  build = MAJOR*100000 + MINOR*1000 + PATCH*10 + SUB + IOS_BUILD_BUMP
  0.1.0 → 1000 · 0.1.1 → 1010 · 0.2.0 → 2000 · 1.0.0 → 100000
  ```

- **`IOS_BUILD_BUMP`** (env, default 0): Apple rejects a duplicate build number for the same
  marketing version. A killed/retried upload can "burn" a number. Set `IOS_BUILD_BUMP=1` to rebuild
  the same semver with a fresh build number — exactly luddi's mechanism.

SemVer rules (luddi §1.2): **PATCH** for fixes (bump per TestFlight build), **MINOR** for features,
**MAJOR** for breaking changes. Tag each App Store release `ios-vMAJOR.MINOR.PATCH`.

---

## 2. Build — always on EAS cloud

Like luddi, **all device/release iOS builds go through EAS** so we never maintain signing certs or
provisioning profiles locally (`credentialsSource: remote` — EAS generates and stores the Apple
Distribution cert + provisioning profile, logging into your Apple account once via `eas credentials`).

Because the app is native, the build is an **EAS custom build**: `eas.json`'s profile points at a
YAML in `.eas/build/` whose steps run `xcodebuild archive`/`-exportArchive` on the EAS macOS worker
(image pinned to `macos-sequoia-15.6-xcode-26.2`, matching luddi).

### Profile matrix ([`ios/eas.json`](../../../ios/eas.json))

| Profile | Distribution | Export method | Use | Status |
|---|---|---|---|---|
| `preview-simulator` | — | simulator `.app` | Quick internal sim runs (no signing). | ✅ shipped (`simulator.yml`) |
| `production` | store | App Store `.ipa` | TestFlight + App Store. | ✅ shipped (`production.yml`) |
| `preview` | internal | Ad Hoc `.ipa` | Install on registered devices without TestFlight. | ◻︎ planned (needs device registration + ad-hoc ExportOptions) |

All set `ios.credentialsSource: remote`, the pinned `image`, and `resourceClass: large` for
`production`. A wrapper, [`ios/scripts/build-ios.sh`](../../../ios/scripts/build-ios.sh) (ported from
luddi), gives `simulator | device | production` modes:

```bash
cd ios
./scripts/build-ios.sh production     # eas build --platform ios --profile production
```

> **Local builds** (instead of EAS) are possible via `ios/scripts/archive-and-upload.sh`, but this
> Mac needs the iOS platform installed first (`xcodebuild -downloadPlatform iOS`) — EAS workers have
> it. See `ios/RELEASE.md`.

---

## 3. Submit — TestFlight & App Store

Two-step, exactly like luddi (build, then submit):

1. **Build** → `eas build --platform ios --profile production` → signed App Store `.ipa` artifact.
2. **Submit** → `eas submit --platform ios --latest` → App Store Connect, using
   `submit.production.ios.ascAppId` (the app's numeric ASC id) and EAS's stored ASC API key.

Apple then processes the build (~5–10 min) and it appears in **TestFlight → internal testers**
automatically.

### Internal vs. external TestFlight
- **Internal** (up to 100 of your team, no review): available immediately after processing.
- **External** (up to 10,000, needs a one-time Beta App Review per version): automated by
  [`ios/scripts/add-to-external-testing.py`](../../../ios/scripts/add-to-external-testing.py)
  (ported from luddi) — it mints an ASC API JWT, polls until the build is processed, submits it for
  Beta App Review, and adds it to the external group:

  ```bash
  python3 ios/scripts/add-to-external-testing.py            # latest build
  ```

---

## 4. Credentials model ("托管给 Expo")

Two separate Apple credentials, both effectively Expo-managed:

1. **Signing** (Distribution cert + provisioning profile): **EAS-managed** via
   `credentialsSource: remote`. Created once with `eas credentials` (logs into your Apple account).
   Nothing sensitive in the repo.
2. **App Store Connect API key** (`.p8`): used by `eas submit` and the external-testing script.
   Stored as an **EAS secret** (`eas secret:create … ASC_KEY_BASE64`) and/or locally at
   `ios/keys/AuthKey_<id>.p8` (gitignored, mirroring luddi's `keys/`).

> **Hard prerequisite (unchanged):** an **Apple Developer Program** membership ($99/yr). Expo/EAS
> cannot substitute for it — there is no TestFlight without it.

App config (`ios/app.json`): `owner: hakkoai`, `slug: markup`, `ios.bundleIdentifier:
com.appkon.markup.ios`, real `extra.eas.projectId` written by `eas init`.

---

## 5. Export-compliance & Info.plist

Set once as a build setting so every upload skips the encryption questionnaire (luddi does this in
`infoPlist`):

```
INFOPLIST_KEY_ITSAppUsesNonExemptEncryption = NO
```

Markup uses only standard OS encryption (HTTPS/UserDefaults) → "uses non-exempt encryption" = NO.
Privacy is declared in `PrivacyInfo.xcprivacy` (Data Not Collected).

---

## 6. CI separation (same philosophy as luddi)

- **Fast CI on every PR** — our `iOS (MarkupKit tests)` lane (`swift test`) is the analog of luddi's
  `mobile-ci.yml` (typecheck + jest). It gates correctness in < 1 min; it does **not** build the app
  or touch credentials.
- **Builds & submits are manual**, run by a human via the scripts above and watched on
  `expo.dev/accounts/hakkoai/projects/markup/builds`. This keeps signing credentials out of CI and
  makes "cut a release" a deliberate act — matching luddi, where build/submit live in scripts, not
  the PR pipeline.
- (Future) a GitHub-label trigger (`eas-build-ios:production`) or an EAS Workflow can automate
  builds on demand, as luddi's dashboard hints — deferred until the manual flow is proven.

---

## 7. First App Store submission — one-time checklist

1. Apple Developer Program membership active.
2. App Store Connect → **Apps → +** → bundle id `com.appkon.markup.ios`, name "Markup". Note the
   numeric **ASC app id** → put it in `eas.json` `submit.production.ios.ascAppId`.
3. ASC API key (App Manager role) → `.p8` → EAS secret + `ios/keys/`. Note Key ID / Issuer ID →
   fill the constants in `add-to-external-testing.py`.
4. `cd ios && eas init` (writes the real projectId), `eas credentials` (EAS generates signing).
5. `./scripts/build-ios.sh production` → `eas submit -p ios --latest`.
6. App Store privacy answers: **Data Not Collected** (matches `PrivacyInfo.xcprivacy`).
7. For App Store *release* (beyond TestFlight): screenshots, description, keywords, support URL,
   category (Productivity) — tracked separately when we go past beta.

---

## 8. Release flow (steady state)

```
bump MARKETING_VERSION (semver)  ──►  ./scripts/build-ios.sh production
   (build number auto-derived)          │
                                         ▼
                              eas submit -p ios --latest  ──►  App Store Connect
                                         │                         │ (~5-10 min processing)
                                         ▼                         ▼
                          add-to-external-testing.py  ──►  TestFlight (internal + external)
                                         │
                                         ▼
                              git tag ios-v<version>   (traceability, luddi §1.3)
```

**Rollback** (luddi §1.4, native-adapted): no OTA — to roll back, rebuild the previous tagged
version and resubmit, or expire the bad TestFlight build in App Store Connect. Because every release
is git-tagged and the build number is derived from the version, any prior build is reproducible.

---

## 9. Files

| File | Role |
|---|---|
| `ios/eas.json` | CLI pin, build profiles, `submit.production.ios.ascAppId`. |
| `ios/app.json` | Expo project link (owner/slug/projectId/bundleId). |
| `ios/.eas/build/production.yml` | Custom build: derive build number → archive → export → artifact. |
| `ios/scripts/build-ios.sh` | Wrapper over `eas build` (simulator/device/production). |
| `ios/scripts/derive-build-number.sh` | Monotonic build number from `MARKETING_VERSION` + bump. |
| `ios/scripts/archive-and-upload.sh` | Local fallback archive → TestFlight (needs local iOS platform). |
| `ios/scripts/add-to-external-testing.py` | ASC-API promote-to-external-group automation. |
| `ios/MarkupApp/ExportOptions.plist` | `app-store-connect` export options. |
| `ios/keys/` | ASC API key(s) — **gitignored**. |
| `ios/RELEASE.md` | Operator runbook (the "how", this doc is the "why"). |

---

_Reference: luddi `apps/mobile/{eas.json,app.config.ts,scripts/build-ios.sh,scripts/add-to-external-testing.py}` and `docs/architecture/release-strategy.md`._
