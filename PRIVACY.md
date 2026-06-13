# Privacy Policy — Markup

_Last updated: 2026-06-06_

**Markup does not collect any data.**

Markup is a local-first Markdown editor and reader, available for **macOS**
(desktop app) and **iOS / iPadOS**. Everything you do stays on your device:

- **No account for Markup, no sign-in.** Markup never asks you to register or log in to use it.
- **No telemetry or analytics.** Markup does not track usage, send crash reports, or phone home.
- **No data collection.** Your notes, vault contents, file paths, and settings never leave your device. They are stored as plain files on your disk (and, on iOS, in your own iCloud if you keep your vault there) and in the app's local preferences.
- **No third-party tracking.** Markup contains no advertising or third-party analytics SDKs.

Markup has **no server of its own** — there is nowhere for your data to be sent to.

## Network access

Markup works offline. It only makes a network request in these optional,
user-initiated cases:

- **Opening files from GitHub.** When you choose to open a file or repository
  from GitHub, Markup requests that content from GitHub (`api.github.com`,
  `raw.githubusercontent.com`). Public repositories work without signing in. If
  you choose to sign in (GitHub OAuth), an access token is stored **on your
  device only** — in the iOS Keychain or the macOS login Keychain — and is sent
  only to GitHub, as the authorization for your own requests. Markup never
  receives your token or your GitHub data on any server of ours, because we don't
  operate one. You can sign out at any time, which deletes the stored token.
- **HTML export/preview of documents that use math or diagrams.** The generated
  HTML loads the KaTeX and/or Mermaid rendering libraries from a public CDN
  (jsDelivr) so math/diagrams render. On macOS this happens in the exported file;
  the iOS reader bundles these libraries and renders fully offline. Only
  documents that actually use those features trigger this.
- **Software updates (direct-download macOS build only).** The macOS version
  distributed outside the Mac App Store checks GitHub Releases for a newer
  version. The Mac App Store and iOS App Store builds do not — the App Store
  handles updates.

No personal information is transmitted in any of these requests, and none of them
are used for tracking.

## Permissions

- **Folders/files you pick.** Markup only reads and writes the folders and files
  you explicitly choose (the macOS app is sandboxed on the Mac App Store and uses
  the system file picker + security-scoped bookmarks).
- **Photos (iOS).** Inserting an image uses the system photo picker, which runs
  outside the app — Markup only receives the single image you pick, and has no
  access to your photo library.

## Contact

Questions about this policy: open an issue at https://github.com/oratis/Markup or email wangharp@gmail.com.

## Changes

If this policy ever changes, the updated version will be published in this repository.
