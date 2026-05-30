# Markup for iOS

Native **SwiftUI** iPhone + iPad companion to the macOS [Markup](../README.md) editor.
Reader-first: open the *same* `.md` vault (via iCloud Drive / Files), read it like a page,
light editing, full-text search, one-tap export/share.

> **Design:** [`docs/design/ios/00-ios-app-design.md`](../docs/design/ios/00-ios-app-design.md) is
> the source-of-truth spec. Read it first.

## Locked decisions (v1)
- **Architecture:** native SwiftUI (no Tauri / WebView shell for chrome). WKWebView used only as the
  high-fidelity *reader surface* (reuses the desktop CSS themes + KaTeX/Mermaid, bundled offline).
- **Scope:** reader-first companion. **Out:** graph view, Canvas render, full WYSIWYG.
- **Devices:** Universal (iPhone + iPad), adaptive layout.
- **Vault model:** companion-first — open your existing iCloud/Files folder (security-scoped
  bookmark). "Create a Markup vault in iCloud" offered as an alternative.
- **Pricing:** free in v1. **License:** MIT (consistent with desktop).
- **Repo:** same repo, under `ios/`, with its own CI lane.

## Layout
```
ios/
  MarkupKit/        Swift Package — pure, UI-free core (no UIKit). Tested in CI via `swift test`.
    Sources/MarkupKit/
      Models.swift          VaultFile / LoadedFile / SearchHit  (← src/lib/types.ts)
      Fuzzy.swift           scoreSubsequence  (← src/lib/fuzzy.ts)
      Slugify.swift         slugifyForFilename / firstHeadingText  (← src/lib/slugify.ts)
      SearchOperators.swift parseQuery / pathMatches  (← src/lib/search-operators.ts)
      ReaderHTML.swift      high-fidelity reader doc (marked + KaTeX/Mermaid/highlight) + themes
    Tests/MarkupKitTests/   ports of the matching *.test.ts files (+ ReaderHTML)
  MarkupApp/        The SwiftUI app target (Xcode project).
    MarkupApp.xcodeproj     synchronized groups; links the local MarkupKit package
    MarkupApp/
      MarkupAppApp.swift     @main App
      RootView.swift         NavigationSplitView shell (adaptive iPhone/iPad)
      VaultStore.swift       folder open + security-scoped bookmark + scan
      FolderPicker.swift     UIDocumentPicker (folder) wrapper
      ReaderWebView.swift    WKWebView reader surface
      ReaderView.swift       rendered note + theme switcher
```

## Develop
```bash
# Core logic (fast, no Xcode UI):
cd ios/MarkupKit && swift test          # 35 tests, ports of the desktop unit tests + reader

# The app:
open ios/MarkupApp/MarkupApp.xcodeproj   # run on an iPhone/iPad simulator
# or compile-check from CLI:
cd ios/MarkupApp && xcodebuild -project MarkupApp.xcodeproj -target MarkupApp \
  -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```
Requires a Swift 6 toolchain (Xcode 16+ / Swift 6.0+). Verified on Xcode 26 / Swift 6.2;
the app builds & links for the iOS Simulator SDK.

## Status — milestones
See the design doc §18 for detail.

- [x] **M0** — `MarkupKit` package + ported logic (fuzzy, slugify, search operators, models,
  MarkdownLite) with passing tests + CI lane; **Xcode app target**: document picker +
  security-scoped bookmark → open a folder → list `.md` → render one in a WKWebView with a
  bundled theme. The end-to-end companion loop. App builds & links for the iOS Simulator SDK.
- [x] **M1** — high-fidelity reader (`ReaderHTML`: marked + conditional KaTeX/Mermaid/highlight,
  pinned to desktop versions) + GFM tables/task-list; task-list tap-to-toggle, reading-position
  memory, text-size/width controls. _Remaining: offline-bundle the renderer assets (currently CDN)._
- [x] **M2** — file browser, Quick Open (fuzzy), full-text search (SQLite FTS5 + `tag:`/`path:`),
  wikilinks/backlinks, outline, tags. _Remaining: in-reader wikilink click-through._
- [x] **M3** — native source editor (`UITextView`) + Markdown accessory bar + smart list
  continuation; debounced atomic autosave with mtime conflict guard. _Remaining: image insert,
  wikilink autocomplete in-editor._
- [x] **M4** — share/export (HTML/PDF/Markdown via share sheet), Settings, EN/中文 localization,
  iPad keyboard shortcuts (⌘P/⌘⇧F).
- [ ] **M5** — TestFlight beta, performance pass, App Store metadata + privacy label. _(needs the
  owner's Apple account.)_

> **Note on verification:** all iOS code is verified by `swift test` (the MarkupKit logic) and an
> `xcodebuild` compile+link for the simulator SDK. Actual on-screen behaviour (rendering, gestures,
> editor) needs a run on a simulator/device — open the Xcode project to try it.

## Porting note
`MarkupKit` deliberately re-ports already-tested desktop logic from `src/lib/*` (and their
`*.test.ts`) so behaviour — fuzzy ranking, slug rules, search-operator parsing — stays identical
across platforms. When porting more modules, port the test too.
