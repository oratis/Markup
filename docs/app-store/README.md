# App Store / Mac App Store — submission docs

Everything needed to take Markup to the **iOS App Store** and the **Mac App
Store**. The engineering is done on both platforms; what remains is account
setup, listing assets, and the submit flow. These docs cover the parts that live
in the repo; the account-gated steps are called out as "you".

> **1.0 launch (2026-06):** ship **1.0.0** to both stores **in parallel** — see
> [ADR-004](../decisions/ADR-004-app-store-1.0.md) (supersedes ADR-003's MAS
> deferral). Versions are bumped in-repo. **Start here:**
> [launch-1.0-checklist.md](./launch-1.0-checklist.md).

## Status at a glance

| | iOS App Store | Mac App Store |
|---|---|---|
| Code ready | ✅ (on TestFlight, `com.appkon.markup.ios`) | ✅ (sandboxed MAS flavor built; `com.appkon.markup`) |
| Privacy label | ✅ "Data Not Collected" (`PrivacyInfo.xcprivacy`) | ✅ "Data Not Collected" |
| Build command | `cd ios && ./scripts/build-ios.sh production` | `./scripts/build-mas.sh` (needs certs) |
| What's left | listing + screenshots + submit | certs + listing + screenshots + submit |

## Documents

- **[launch-1.0-checklist.md](./launch-1.0-checklist.md)** — ⭐ the actionable 1.0 launch checklist for both stores (start here).
- **[HANDOFF.md](./HANDOFF.md)** — current-state snapshot + "resume here" for picking the launch back up.
- **[ios-submission.md](./ios-submission.md)** — iOS App Store runbook (TestFlight → App Store).
- **[MAS-publishing-plan.md](./MAS-publishing-plan.md)** — Mac App Store plan (sandbox, certs, build flavor, review gotchas, phased plan).
- **[signing-setup.md](./signing-setup.md)** — Developer ID signing for the **direct-download** macOS DMG (separate from MAS).
- **[listing.md](../../marketing/app-store/listing.md)** — store text for both products (name, subtitle, keywords, description), EN + 中文. *(canonical; in `marketing/app-store/`)*
- **[privacy-and-review.md](../../marketing/app-store/privacy-and-review.md)** — App Privacy questionnaire answers + App Review notes for both. *(canonical; in `marketing/app-store/`)*
- **[reviewer-sample-vault/](./reviewer-sample-vault/)** — a tiny vault to hand reviewers so the BYO-folder app isn't seen as "empty".
- Related: the iOS TestFlight build is the [`ship-ios-testflight`](../../.claude/skills/ship-ios-testflight/SKILL.md) skill; privacy policy is [`PRIVACY.md`](../../PRIVACY.md).

## The split: repo vs you

- **In the repo (done here):** listing copy, privacy answers, review notes, sample
  vault, submission runbooks, build scripts.
- **Only you can do (account-gated):** Apple Developer Program, certificates &
  provisioning profiles, App Store Connect records, screenshots, and pressing
  **Submit for Review**.

## Shared prerequisites

- Apple Developer Program active on the team (`9LH9NBX7P4`, account
  `wangharp@gmail.com`). ✅ already used for TestFlight.
- Privacy Policy URL: https://github.com/oratis/Markup/blob/main/PRIVACY.md
- Pricing: Free, no IAP, on both stores.
