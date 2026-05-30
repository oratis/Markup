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
    Tests/MarkupKitTests/   ports of the matching *.test.ts files
  (app target — Xcode project — added in M0/M1)
```

## Develop
```bash
cd ios/MarkupKit
swift build
swift test          # 26 tests, ports of the desktop unit tests
```
Requires a Swift 6 toolchain (Xcode 16+ / Swift 6.0+). Verified on Xcode 26 / Swift 6.2.

## Status — milestones
See the design doc §18 for detail.

- [x] **M0 (in progress)** — `MarkupKit` package + first ported logic (fuzzy, slugify, search
  operators, models) with passing tests; CI lane wired.
- [ ] **M0 cont.** — Xcode app target, document picker + security-scoped bookmark, open a folder,
  list `.md`, render one in a WebView with a bundled theme (the end-to-end companion loop).
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
