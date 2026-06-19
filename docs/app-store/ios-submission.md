# Markup iOS → App Store: submission runbook

> The iOS app already ships to **TestFlight** (see the
> [`ship-ios-testflight`](../../.claude/skills/ship-ios-testflight/SKILL.md)
> skill / [`ios/RELEASE.md`](../../ios/RELEASE.md)). This doc is the **additional**
> steps to take a TestFlight build to the public App Store. The engineering is
> done — what's left is App Store Connect listing + the submit flow.

Fixed facts: bundle id `com.appkon.markup.ios` · Apple Team `9LH9NBX7P4` · App
Store Connect app id `6775530509` · account `wangharp@gmail.com` · deployment
target iOS 17 · universal (iPhone + iPad).

## Already satisfied in the project (no work)

- ✅ **App Privacy** is "Data Not Collected" (backed by `PrivacyInfo.xcprivacy`).
  Fill the questionnaire per [`privacy-and-review.md`](../../marketing/app-store/privacy-and-review.md).
- ✅ **Export compliance**: `ITSAppUsesNonExemptEncryption=NO` is set, so uploads
  don't prompt.
- ✅ **App icon**: a 1024×1024 marketing icon is present (single-size app icons
  are accepted).
- ✅ **Photo picker** uses SwiftUI `.photosPicker` (out-of-process PHPicker) — no
  usage-description string and no permission prompt required.
- ✅ EN + 简体中文 in-app.

## You provide (account-gated — I can't log in)

1. **Apple Developer Program** active on `wangharp@gmail.com` (Team `9LH9NBX7P4`). ✅ already used for TestFlight.
2. **Screenshots** (see [`screenshots/README.md`](../../marketing/app-store/screenshots/README.md) for sizes): iPhone
   6.9" + 6.5", and **iPad 13" (required — the app supports iPad)**.
3. **Privacy Policy URL**: https://github.com/oratis/Markup/blob/main/PRIVACY.md
4. (optional) Localized zh-Hans metadata for a China listing.

## Steps (App Store Connect)

1. **Get a build on TestFlight** for the version you want to ship:
   ```bash
   # bump MARKETING_VERSION in ios/MarkupApp/MarkupApp.xcodeproj/project.pbxproj
   # (currently 0.2.7 → consider 1.0.0 for the first public release), then:
   cd ios && ./scripts/build-ios.sh production
   ```
   The build self-uploads to TestFlight (see the skill). Wait for processing.
2. In **App Store Connect → Apps → Markup → (＋) macOS/iOS App → iOS App**, create
   a new **App Store version** (e.g. `1.0.0`).
3. **Listing**: paste name/subtitle/keywords/description/promo from
   [`listing.md`](../../marketing/app-store/listing.md). Set **Category = Productivity**,
   **Price = Free**, **Support URL** + **Privacy Policy URL**.
4. **Screenshots**: upload iPhone + iPad sets.
5. **Build**: attach the processed TestFlight build to this version.
6. **App Privacy**: complete as "Data Not Collected"
   ([`privacy-and-review.md`](../../marketing/app-store/privacy-and-review.md)).
7. **Age rating**: answer the questionnaire → 4+.
8. **App Review Information**: paste the review notes (incl. the sample-vault
   pointer + "GitHub sign-in is optional") from
   [`privacy-and-review.md`](../../marketing/app-store/privacy-and-review.md).
9. **Submit for Review.** First reviews are typically ~24–48h.

## Versioning note

`MARKETING_VERSION` is the single source of truth (build number is derived by
`ios/scripts/derive-build-number.sh`). For the first public release, bump from
`0.2.x` to `1.0.0` so the store version reads as a 1.0. Subsequent updates: bump
`MARKETING_VERSION`, ship to TestFlight, then add a new App Store version and
attach the build.

## Ownership

| Step | Owner |
|---|---|
| Build → TestFlight, version bump, listing copy, privacy answers, review notes, sample vault | repo / me (done or scriptable) |
| Apple account, screenshots, hitting Submit, review responses | you |
