# Markup — App Store submission kit

Everything to submit Markup to the App Store, in one place: the marketing
screenshots, the listing copy (EN + 中文), the App Privacy answers, and the App
Review notes. The account-gated step (the actual **Submit for Review**) is still
yours — this kit is the paste-ready content + assets.

Target: **1.0.0** on the iOS App Store (and the Mac App Store in parallel) — see
[../../docs/app-store/launch-1.0-checklist.md](../../docs/app-store/launch-1.0-checklist.md)
for the full step-by-step (certs, ASC, submit).

## What's in here
- **[listing.md](./listing.md)** — name, subtitle, promo text, keywords,
  description, category, URLs, copyright, age (EN + 中文) + the screenshot captions.
- **[privacy-and-review.md](./privacy-and-review.md)** — App Privacy questionnaire
  answers ("Data Not Collected"), App Review notes, export compliance.
- **[screenshots/ios-6.9/](./screenshots/ios-6.9/)** — 5 ready-to-upload iPhone
  6.9″ marketing screenshots (1320×2868).
- **[screenshots/README.md](./screenshots/README.md)** — caption map, sizes, and
  what's still needed (iPad). Source captures: `../MarkupScreenshots/`.
- Regenerate screenshots: `python3 marketing/scripts/make-screenshots.py`.

## iOS — status
| Item | Status |
|---|---|
| App record | ✅ "Markup - MD Reader" · `com.appkon.markup.ios` · ASC `6775530509` |
| Build | ✅ 1.0.0 (100000) uploaded to TestFlight |
| Name / subtitle / category / copyright | ✅ values in [listing.md](./listing.md) |
| Promo / keywords / description | ✅ in [listing.md](./listing.md) |
| App Privacy label | ✅ "Data Not Collected" ([privacy-and-review.md](./privacy-and-review.md)) |
| iPhone 6.9″ screenshots | ✅ 5 in [screenshots/ios-6.9/](./screenshots/ios-6.9/) |
| **iPad 13″ screenshots** | ❌ still needed — the app is universal, so Apple requires them |
| Submit for Review | 🔑 you, in App Store Connect |

## To finish iOS (in App Store Connect)
1. **App 信息** → paste name / subtitle / category / content-rights ([listing.md](./listing.md) §App info).
2. **1.0 版本页** → paste promo / description / keywords / URLs / copyright; attach build **100000**.
3. **App 隐私** → "Data Not Collected" ([privacy-and-review.md](./privacy-and-review.md)).
4. **Upload screenshots** from `screenshots/ios-6.9/` (+ iPad once captured).
5. **App 审核信息** → paste the review notes ([privacy-and-review.md](./privacy-and-review.md)).
6. **Submit for Review.**

## Mac
Listing copy for the Mac app is in [listing.md](./listing.md) (§Mac). Mac
screenshots aren't in this kit yet (the provided captures are iPhone) — capture
macOS shots (editor, GitHub vault, search, themes) and they can be framed the
same way via the generator script.
