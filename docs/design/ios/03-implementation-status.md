# Markup for iOS — implementation status

> Living status of the native iOS/iPadOS app against the design
> ([`00-ios-app-design.md`](./00-ios-app-design.md)). Current TestFlight build:
> **0.2.5**. Architecture: SwiftUI app + `MarkupKit` (pure,
> unit-tested logic) + `MarkupApp` (UI). CI runs `swift test` **and** a
> simulator app build on every PR.

## Shipped

### Reading (M1)
- High-fidelity reader (WKWebView) with **offline-bundled** assets (marked,
  KaTeX, Mermaid, highlight.js + fonts) served over a `markupasset://` scheme —
  no CDN, works fully offline.
- Themes Light/Dark/Sepia, font scale, reading width, **line spacing**,
  **system Dynamic Type** (incl. accessibility sizes).
- Task-list tap-to-toggle, wikilink navigation, per-doc outline, scroll memory.
- Reading position remembered per document.

### Navigate (M2)
- Vault file list with kind icons + relative modified time; index-build progress.
- Quick Open (fuzzy), full-text search (SQLite FTS5) with `tag:`/`path:`
  operators and **match snippets**.
- Wikilinks, **backlinks with line context**, tags browser.
- **Multi-vault**: open several folders, switch between them, remove (security-
  scoped bookmarks). `.canvas` files listed with an "open on desktop" card.

### Edit (M3)
- Native `UITextView` source editor with a formatting accessory bar.
- Smart list continuation, **auto-close brackets** (+ type-over), **table
  formatting**, inline **`[[` wikilink** and **`#` tag** autocomplete,
  **image insert** → vault `assets/`.
- **Create / rename / delete** notes from the file list (＋ ⌘N, swipe actions).
- Autosave (debounced) + mtime conflict guard.

### Share & polish (M4)
- Export/Share as HTML, Export PDF, Share Markdown, **Copy as HTML / Markdown**.
- **EN / 中文** in-app language switch (instant, no relaunch).
- Accessibility pass (VoiceOver labels, Dynamic Type, Reduce Motion).
- First-run **3-card onboarding**.
- iPad hardware-keyboard shortcuts: ⌘N new · ⌘P Quick Open · ⌘⇧F search ·
  ⌘E read/edit · ⌘⌥O outline · ⌘B/⌘I/⌘` formatting.

### HTML & shared-file consumption (post-M4, inspired by 即览)
- Open `.html`/`.htm` and **`.txt`**; open from other apps (`onOpenURL`).
- **HTML scripts off by default** with a per-doc enable toggle (safety for
  untrusted shared HTML); **mobile/desktop layout** toggle.
- **`.zip` web bundles** (index.html + assets) unzipped and rendered.
- **Recents + favorites**: files opened from other apps are copied into the app
  (content-hashed, de-duped) and listed for re-open.

### Open from GitHub (cross-platform with desktop)
- Paste a GitHub file/folder/repo URL (or bare `owner/repo`) **or browse** a
  repo tree and pick a file; the fetched file opens for reading.
- **OAuth Device Flow sign-in** (public Client ID, no secret): unlocks private
  repos + higher rate limits, with a **sign-out confirmation** and a **"Your
  repositories"** list (private-first). Token stored in the Keychain.

### Callouts / GitHub alerts
- `> [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION]` blockquotes
  render as styled callout blocks in the reader (incl. Obsidian-style inline
  titles), matching the desktop export's comrak markup — handy for GitHub
  READMEs opened via the GitHub viewer.

### Infrastructure
- EAS custom build → TestFlight (`scripts/derive-build-number.sh`, lockfile in
  `ios/`). CI builds the full app on the simulator (UI-regression gate).

## Not yet (tracked)

| Area | Item | Why deferred |
|---|---|---|
| iPad | Multiple open-doc **tabs**; **split-view** live preview | Large, behaviour needs on-device verification |
| Sync | iCloud "downloading" banner; **conflict two-pane** diff | Needs async read-path + device testing |
| Files | Drag-and-drop; new **folder** + templated frontmatter | — |
| Editor | Accessory-bar customization; focus/typewriter mode | — |
| v2 (design §18) | Graph, Canvas render, full WYSIWYG, Share Extension, Apple Pencil, Shortcuts/App Intents, Widgets, Spotlight | Deliberately deferred |
| Release | App Store submission (metadata, screenshots, privacy label); iOS-specific icon | Needs human / design assets |
