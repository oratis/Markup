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
      MarkdownLite.swift    M0 placeholder Markdown→HTML renderer + reader themes
    Tests/MarkupKitTests/   ports of the matching *.test.ts files (+ MarkdownLite)
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
cd ios/MarkupKit && swift test          # 37 tests, ports of the desktop unit tests

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
- [ ] **M1** — Reader MVP (themes, KaTeX, Mermaid, code, tables, task-list toggle, reading
  position, font controls; iPhone + iPad layouts).
- [ ] **M2** — Navigate: file browser, Quick Open, wikilinks/backlinks/outline/tags, SQLite FTS5
  search with operators + snippets.
- [ ] **M3** — Light edit: native source editor, accessory bar, wikilink autocomplete, image
  insert, autosave + mtime/conflict handling, live preview.
- [ ] **M4** — Share/export (HTML/PDF), settings, localization (EN/中文), a11y, iPad shortcuts.
- [ ] **M5** — TestFlight beta, performance pass, App Store metadata + privacy label.

## Porting note
`MarkupKit` deliberately re-ports already-tested desktop logic from `src/lib/*` (and their
`*.test.ts`) so behaviour — fuzzy ranking, slug rules, search-operator parsing — stays identical
across platforms. When porting more modules, port the test too.
