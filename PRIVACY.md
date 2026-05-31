# Privacy Policy — Markup

_Last updated: 2026-05-31_

**Markup does not collect any data.**

Markup is a local-first macOS Markdown editor. Everything you do stays on your Mac:

- **No account, no sign-in.** Markup never asks you to register or log in.
- **No telemetry or analytics.** Markup does not track usage, send crash reports, or phone home.
- **No data collection.** Your notes, vault contents, file paths, and settings never leave your device. They are stored as plain files on your disk and in the app's local preferences.
- **No third-party tracking.** Markup contains no advertising or third-party analytics SDKs.

## Network access

Markup works fully offline. It only makes a network request in these optional, user-initiated cases:

- **HTML export of documents that use math or diagrams.** When you export or preview such a document, the generated HTML loads the KaTeX and/or Mermaid rendering libraries from a public CDN (jsDelivr) so the math/diagrams render in your browser. This happens in the exported file, not in the app, and only for documents that actually use those features. Ordinary documents export as a fully offline, self-contained file.
- **Software updates (direct-download build only).** The version distributed outside the Mac App Store checks GitHub Releases for a newer version. The Mac App Store build does not do this — the App Store handles updates.

No personal information is transmitted in any of these requests.

## Contact

Questions about this policy: open an issue at https://github.com/oratis/Markup or email wangharp@gmail.com.

## Changes

If this policy ever changes, the updated version will be published in this repository.
