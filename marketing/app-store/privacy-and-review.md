# App Privacy + App Review notes — Markup

Exact answers for App Store Connect's **App Privacy** questionnaire and the
**App Review Information** notes. Markup has no backend and no analytics, so the
label is **Data Not Collected** on both platforms — backed in code by the iOS
`PrivacyInfo.xcprivacy` (Tracking = false, Collected data types = none) and the
absence of any analytics SDK in either app.

## App Privacy questionnaire → answers
**"Do you or your third-party partners collect data from this app?"** → **No.**
Result label: **Data Not Collected.**

Rationale you can paste if asked:
- No account system, no server owned by us — nowhere for data to be collected to.
- No analytics, crash-reporting, advertising, or tracking SDKs.
- Notes/files stay on the device (and the user's own iCloud, iOS only).
- The only outbound network is **user-initiated**:
  - **GitHub API** (api.github.com / raw.githubusercontent.com) when the user
    opens a file/repo from GitHub. Requests go to GitHub, not to us. An optional
    OAuth token is stored **on-device** (iOS Keychain / macOS login Keychain) and
    sent only to GitHub as an `Authorization` header.
  - **Math/diagram CDN** (jsDelivr) only inside *exported/preview* HTML using
    KaTeX/Mermaid (Mac export; the iOS reader bundles these offline). No personal
    data is sent.
- This contacts third parties (GitHub, jsDelivr) but does **not** "collect data"
  in the App Privacy sense — nothing about the user is gathered; the calls fetch
  content the user explicitly asked for.

**Tracking** (App Tracking Transparency): **No tracking.** Do not add
`NSUserTrackingUsageDescription` — the app never tracks.

## Export compliance (iOS) — already answered in the project
`ITSAppUsesNonExemptEncryption = NO` is set in the Xcode build settings, so each
upload auto-answers the export-compliance prompt (standard HTTPS / ATS is
exempt). Nothing to do per-submission.

## App Review notes (paste into "App Review Information → Notes")
```
Markup is a local-first Markdown reader/editor. It has NO account and NO server
of ours — there is no login to Markup itself and no test credentials are needed.

HOW TO REVIEW (the app works on a folder of files the user picks):
1. Launch the app. On first run an onboarding card explains the "bring your own
   folder / GitHub repo" model.
2. Tap "Open folder" and choose any folder of .md files (on the simulator, use
   the Files app's "On My iPhone" area), OR tap "Open from GitHub" and paste a
   public repo — e.g. github.com/oratis/Markup — then "Open as Vault". No account
   needed to review.
3. A sample vault for review is included in the repo at
   docs/app-store/reviewer-sample-vault/ — copy it into Files/iCloud and open it.
   It demonstrates rendering (code, math, tables, callouts), wikilinks, search,
   and editing.

OPTIONAL GITHUB SIGN-IN:
- "Open from GitHub" works with PUBLIC repos WITHOUT signing in.
- Signing in (GitHub OAuth device flow) is OPTIONAL and only unlocks private
  repos + higher rate limits. The token is stored in the Keychain on-device and
  is sent only to GitHub.

PRIVACY: no analytics, no tracking, no data collection. See PRIVACY.md.
```
(Mac: same notes; instead of Files, the reviewer uses ⌘⇧O / "Open Folder" and the
same sample vault. The Mac App Store build is sandboxed.)

## Why this matters (BYO-folder gotcha)
Markup's whole model is "point me at a folder/repo you already have." A reviewer
who launches it cold sees onboarding, not content. The review notes + the bundled
sample vault prevent a "the app appears non-functional / incomplete" rejection.
