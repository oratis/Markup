# Markup for iOS — Complete Design

> Status: **Design / pre-implementation.** This is the source-of-truth design for a
> native iOS + iPadOS companion to the macOS Markup app.
>
> Confirmed direction (decided with the user):
> - **Architecture:** native **SwiftUI** rewrite (no Tauri, no WebView shell for the chrome).
> - **Positioning:** **reader-first lightweight companion** — read a vault beautifully, light
>   editing, full-text search, one-tap export/share. Graph view and Canvas are **out of scope**
>   for v1.
> - **Devices:** **Universal** — iPhone + iPad from day one, adaptive layout.
> - **Vault model:** **companion-first** — lead with "open my existing iCloud/Files folder"; offer
>   "create a Markup vault in iCloud" as an alternative (see §4.1).
> - **Pricing:** **free in v1** (revisit an optional Pro tier after traction).
> - **Repo:** **same repo**, app under `ios/`, with its own CI lane (`swift test` on MarkupKit).
> - **License:** **MIT**, consistent with the desktop app.
>
> The macOS app (Tauri 2 · Rust · Milkdown · CodeMirror · Tantivy) stays the "power" desktop
> product. iOS is the on-the-go reader/editor that syncs the same `.md` vault.

---

## 0. TL;DR

A native, fast, beautiful Markdown **reader** for iPhone and iPad that opens the *same vault* you
use in the macOS app (synced via iCloud Drive / Files). You read your notes rendered like a clean
page, tap to make quick edits, jump anywhere with Quick Open, search the whole vault, follow
`[[wikilinks]]` and backlinks, and share any note as themed HTML or PDF. No account, no telemetry,
MIT-spirit. Heavy features (graph, Canvas, WYSIWYG ProseMirror editing) are deliberately deferred.

**The one design tension to keep resolving:** iOS is sandboxed and touch-first. We can't point at
"any folder" the way macOS does — we adopt the **document-based / security-scoped bookmark** model
and lean on iCloud Drive so the *same* vault round-trips with the desktop app.

---

## 1. Goals & Non-goals

### Goals (v1)
1. **Read a vault like a page.** Open a folder of `.md` files, render high-fidelity (code
   highlight, KaTeX math, Mermaid diagrams, GFM tables/task lists). Reading is the default.
2. **Open the *same* vault as macOS** via iCloud Drive / Files — no proprietary format, no import.
3. **Light, comfortable editing.** A native source editor with a Markdown formatting accessory
   bar and live preview. Not full WYSIWYG.
4. **Find anything fast.** Quick Open (fuzzy file jump) + full-text search across the vault.
5. **Navigate the knowledge base.** Wikilinks, backlinks, per-document outline.
6. **Share & export.** One tap → themed HTML or PDF into the iOS share sheet.
7. **Native feel.** Adaptive iPhone/iPad layout, Dynamic Type, Dark Mode, haptics, hardware
   keyboard shortcuts on iPad, full VoiceOver.
8. **Privacy.** No account, no telemetry, on-device + iCloud only.

### Non-goals (v1 — explicitly deferred)
- **Graph view** and **Canvas** (`.canvas`) — heavy, low value on a phone. Round-trip safe: we
  *preserve* `.canvas` files untouched, just don't render them (show a "Open on desktop" card).
- **Full WYSIWYG** (Milkdown/ProseMirror) editing.
- **Plugins / community themes.**
- **Real-time collaborative editing.**
- **Android** (separate track).

### Success criteria
- Open + render a 200-note vault in < 1 s to first readable paint.
- Cold full-text search of a 10k-file vault returns in < 100 ms after first index build.
- Idle, < 60 MB memory; scroll a long rendered note at 120 Hz on ProMotion devices.
- A macOS Markup user can install iOS, point at the same iCloud vault, and be reading in < 30 s
  with zero migration.

---

## 2. Feature parity matrix (macOS → iOS v1)

| macOS feature | iOS v1 | Notes / adaptation |
|---|---|---|
| Reader (rendered MD) | ✅ Keep | Core. WKWebView render surface, reuse desktop CSS themes. |
| WYSIWYG edit (Milkdown) | ❌ Drop | Replaced by native source editor + live preview. |
| Source edit (CodeMirror) | ✅ Adapt | Native `UITextView`/`TextKit 2` source editor + Markdown accessory bar. |
| KaTeX math | ✅ Keep | Rendered inside the reader WebView (reuse pipeline). |
| Mermaid diagrams | ✅ Keep | Same. (Edit view shows code; reader renders SVG.) |
| Syntax-highlighted code | ✅ Keep | Reuse comrak+syntect output, or Highlight.js in WebView. |
| GFM tables / task lists | ✅ Keep | Task-list checkboxes tappable in reader (writes back to file). |
| Vault file tree | ✅ Adapt | Native `List`/`OutlineGroup` browser; virtualized. |
| Multi-tab | ◐ Adapt | iPhone: recents + back stack. iPad: real tabs / columns. |
| Quick Open (⌘P) | ✅ Keep | Native fuzzy finder sheet; ⌘P on iPad keyboard. |
| Full-text search (Tantivy) | ✅ Re-implement | **SQLite FTS5** native index (Rust core not reused). |
| Wikilinks + backlinks | ✅ Keep | Native link index (SQLite). Tap link → navigate. |
| Graph view | ❌ Defer | "Open on desktop" placeholder. |
| Canvas (`.canvas`) | ❌ Defer | File preserved, not rendered. Placeholder card. |
| Outline panel (⌘⌥O) | ✅ Keep | Native outline drawer from headings. |
| Command Palette (⌘⇧P) | ◐ Adapt | iPad keyboard-driven palette; iPhone via menu. |
| Themes Light/Dark/Sepia | ✅ Keep | + follow-system. |
| Focus / typewriter mode | ◐ Optional | Editor focus mode; typewriter low priority. |
| Image paste → vault `assets/` | ✅ Adapt | Photo/file picker + paste → save to `assets/`, insert link. |
| Bilingual UI (EN/中文) | ✅ Keep | Reuse string catalog; iOS localization. |
| File watching / external reload | ✅ Adapt | `NSFilePresenter` / iCloud change coordination. |
| Export HTML | ✅ Keep | Reuse render → share sheet (file) instead of "open in browser". |
| Export/Print PDF | ✅ Adapt | `UIPrintInteractionController` / WKWebView → PDF → share sheet. |
| Auto-save (debounced, atomic, mtime guard) | ✅ Keep | `NSFileCoordinator` atomic writes + conflict handling. |
| Double-click `.md` in Finder | ✅ Adapt | Document type association → open `.md`/`.markdown` from Files/share. |

---

## 3. Technical architecture

Native app, **SwiftUI** first, with a thin **UIKit/WebKit** layer where SwiftUI is weak (text
editing, high-fidelity rendering).

```
┌──────────────────────────────── App (SwiftUI) ───────────────────────────────┐
│  Scenes: Library · Reader · Editor · Search · Settings                         │
│  Navigation: NavigationSplitView (iPad) / NavigationStack (iPhone)             │
├───────────────────────────────────────────────────────────────────────────────┤
│  ViewModels (Observation / @Observable)                                        │
│     VaultStore · DocumentStore · SearchStore · LinkIndexStore · SettingsStore  │
├───────────────────────────────────────────────────────────────────────────────┤
│  Services                                                                      │
│   ┌─ VaultService ─────────┐  ┌─ RenderService ───────┐  ┌─ IndexService ────┐ │
│   │ security-scoped access │  │ Markdown → HTML        │  │ SQLite FTS5       │ │
│   │ NSFileCoordinator I/O  │  │ (swift-markdown OR a   │  │ full-text + links │ │
│   │ iCloud presence        │  │  bundled JS renderer)  │  │ + tags + outline  │ │
│   └────────────────────────┘  └───────────────────────┘  └───────────────────┘ │
│   MarkdownEditorView (UITextView/TextKit2)   ReaderWebView (WKWebView)          │
├───────────────────────────────────────────────────────────────────────────────┤
│  Storage:  Files / iCloud Drive (the vault)  +  app-container SQLite index      │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Why not reuse the Rust core
The chosen direction is a native rewrite, so Tantivy / comrak / the vault scanner are **not**
linked. Their native equivalents:
- **Full-text search:** SQLite **FTS5** (ships with iOS; via `GRDB.swift`). Mature, fast, tiny.
- **Markdown parse:** Apple **swift-markdown** (cmark-gfm based) for structure (outline, links,
  tags), and a render path for the reader (see §8).
- **Vault scan / watch:** Foundation `FileManager` + `NSFileCoordinator` + `NSFilePresenter`.

> **Escape hatch (documented, not v1):** the Rust core *can* be cross-compiled to a static lib and
> bridged via a C FFI + Swift wrapper if we later want byte-for-byte parity (esp. Tantivy ranking
> or comrak HTML identical to desktop). Kept as a fallback for the render pipeline; see §8.3.

### 3.2 Module list (Swift packages)
- `MarkupKit` — models, VaultService, IndexService, RenderService (pure, testable, no UI).
- `MarkupUI` — SwiftUI views & view models.
- `MarkupEditor` — UITextView-backed source editor + accessory bar.
- App target — wiring, scenes, document types, share extension.

### 3.3 Key dependencies (candidates)
| Need | Choice | Why |
|---|---|---|
| Markdown AST | `swift-markdown` (Apple) | First-party, GFM, stable. |
| FTS / link index | `GRDB.swift` (SQLite) | Best-in-class Swift SQLite, FTS5, observation. |
| Fuzzy match (Quick Open) | small in-house scorer | Port `src/lib/fuzzy.ts` logic. |
| Reader rendering | WKWebView + bundled CSS/JS | Reuse desktop themes + KaTeX/Mermaid. |
| Syntax highlight | reuse comrak/syntect HTML *or* Highlight.js | See §8. |

Keep the dependency surface tiny (matches the project's "lightweight, no telemetry" ethos).

---

## 4. Data & storage model

### 4.1 The vault on iOS
iOS apps can't roam the filesystem. Three supported ways to get a vault, in priority order:

1. **iCloud Drive folder (recommended, the "companion" path).** User keeps their vault in iCloud
   Drive; the same folder is opened on macOS Markup. We access it through the document picker and
   persist a **security-scoped bookmark** so it reopens silently.
2. **On-My-iPhone / Files folder.** Any folder the user grants via the document picker (Dropbox,
   Working Copy, local). Same bookmark mechanism.
3. **App's own iCloud container (optional "Markup vault").** A first-party `Documents/` ubiquity
   container for users who want Markup to *own* a vault that still syncs across their devices.

> **Decision:** Support **(1) + (2)** in v1 via `UIDocumentPickerViewController` + security-scoped
> bookmarks (a "bring your own folder" model, like Obsidian/iA Writer on iOS). Offer **(3)** as an
> optional "Create a Markup vault in iCloud" in onboarding. This maximizes the *companion* value:
> point both apps at one iCloud folder, done.

### 4.2 Data the app owns (app container, never the vault)
A single SQLite DB in the app's container (rebuildable from the vault at any time):
- `documents(path, rel_path, title, mtime, size, word_count)`
- `fts(rel_path, title, body)` — FTS5 virtual table for full-text search.
- `links(src_path, target_path, target_heading, kind)` — wikilinks/embeds → backlinks.
- `tags(path, tag)` — `#tag` index.
- `headings(path, level, text, slug, line)` — outline + `#heading` link targets.
- `bookmarks_blob` — security-scoped bookmark(s) for the chosen vault root(s).
- `session` — open document, scroll positions, recents, per-doc view mode.

The vault folder itself only ever contains the user's `.md`/`.canvas`/`assets/` — we never write
index files into it (keeps it clean and macOS-compatible).

### 4.3 File I/O rules (parity with desktop)
- **Atomic writes** via `NSFileCoordinator` (`coordinate(writingItemAt:options:.forReplacing)`).
- **mtime guard** before save; if the on-disk mtime changed since load → conflict prompt
  ("Reload" / "Keep mine" / "Save as copy"), mirroring desktop's external-change reload.
- **Debounced autosave** (~800 ms idle) while editing; explicit save on background/scene exit.
- **iCloud download coordination:** files may be placeholders (`.icloud`); trigger
  `startDownloadingUbiquitousItem` and show a small "downloading from iCloud" state.

### 4.4 Sync & conflicts
iCloud Drive handles sync. We handle **conflicts** explicitly:
- Detect `NSFileVersion.unresolvedConflictVersions`. Surface a non-destructive banner:
  "This note has conflicting versions" → a simple two-pane diff/choose UI (text-level).
- Never silently overwrite. This is the #1 trust issue for a sync companion — design for it.

---

## 5. Information architecture & navigation

Adaptive: one mental model, two layouts.

### 5.1 iPad / large — `NavigationSplitView` (3 columns)
```
┌───────────────┬───────────────────────┬───────────────────────────────────┐
│  SIDEBAR      │  CONTENT (file list)  │  DETAIL (reader / editor)         │
│  (vault root) │                       │                                   │
│  • All notes  │  ▸ Inbox/             │   # My Note                       │
│  • Recents    │  ▸ Projects/          │   rendered page …                 │
│  • Search     │    · note-a.md        │                                   │
│  • Tags       │    · note-b.md   ●    │   [E] edit  [⤴] share  [⋯]        │
│  • Bookmarks  │    · note-c.md        │                                   │
│  • Settings   │                       │   ▸ Outline / Backlinks drawer    │
└───────────────┴───────────────────────┴───────────────────────────────────┘
```
- Columns collapse gracefully (Split View / Stage Manager / Slide Over).
- Keyboard shortcuts active (see §13). Optional **tab bar** above detail for multiple open docs.

### 5.2 iPhone / compact — `NavigationStack` + bottom toolbar
```
   Library (root)            File list (folder)          Reader
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Markup     ⌕  ⋯ │      │ ‹ Projects   ⌕   │      │ ‹            ⤴ ⋯ │
│                  │      │                  │      │                  │
│ ◍ All notes   ›  │      │ note-a.md     ›  │      │  # My Note       │
│ ◷ Recents     ›  │  →   │ note-b.md  ●  ›  │  →   │  rendered page…  │
│ # Tags        ›  │      │ note-c.md     ›  │      │                  │
│ ★ Bookmarks   ›  │      │                  │      │                  │
│                  │      │                  │      │ ───────────────  │
│ ⚙ Settings       │      │            ＋ new │      │ 📖  ✏️   ⌕   ⤴   │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```
- Bottom toolbar in reader: **Read / Edit** toggle · Outline · Search · Share.
- Quick Open is a pull-down/⌘P sheet reachable from anywhere.
- Swipe-from-left edge = back; swipe on list rows = rename / bookmark / move-to-trash.

### 5.3 Primary navigation surfaces
- **Library** (sidebar/root): All notes · Recents · Tags · Bookmarks · Settings.
- **File list:** folder hierarchy, sort (name/modified), `●` unsaved/edited dot, `⌫` swipe actions.
- **Reader/Editor** (detail): the document.
- **Quick Open** (modal, global): fuzzy file jump.
- **Search** (full screen / column): full-text results with snippets.

---

## 6. Screen-by-screen design

### 6.1 Onboarding / vault setup
First run, 3 short cards then the picker:
1. "Read your Markdown like a page." (hero)
2. "Bring your own folder." → explains iCloud/Files; **[Open a folder]** (document picker) or
   **[Create a Markup vault in iCloud]**.
3. "Private by default. No account, no telemetry."

After folder pick: index build with a progress ring ("Indexing 1,240 notes…"), then land in
Library. If the chosen folder is the user's macOS vault in iCloud → instant companion.

### 6.2 Library (root)
List of sections (All notes, Recents, Tags, Bookmarks) + the vault name as title + a **vault
switcher** (long-press / menu) if multiple roots added. Empty state nudges to add a folder.

### 6.3 File browser
- `OutlineGroup` folder tree, lazy/virtualized. Row = icon + name + relative mtime.
- `.canvas` rows show a canvas glyph and a subtle "desktop" badge (tap → placeholder, §11).
- Swipe actions: **Bookmark**, **Rename**, **Move to Trash** (to vault `.trash/` or iOS-safe
  delete with undo toast).
- `＋` new note (templated frontmatter optional), new folder.

### 6.4 Reader (the hero screen)
- Full-bleed rendered document (WKWebView, §8) inside native chrome.
- Top: back · title (collapses on scroll) · **⤴ Share** · **⋯ menu** (export, outline, info).
- Bottom (iPhone): **Read | Edit** segmented toggle · Outline · Search-in-doc · Share.
- Tap a **task-list checkbox** → toggles `- [ ]`/`- [x]` in the file (coordinated write).
- Tap a **wikilink/link** → navigate (internal) or open externally (sheet confirm for web URLs).
- **Reading affordances:** theme (Light/Dark/Sepia/System), font family, font size (Dynamic Type
  aware), line width — in a quick "Aa" popover, persisted per-vault.
- Reading position remembered per document (scroll memory, parity with desktop).

### 6.5 Editor (light edit)
- Native source editor (TextKit 2 `UITextView`) showing raw Markdown with **lightweight inline
  styling** (bold headings, dimmed syntax, monospace code) — *not* a WYSIWYG tree.
- **Markdown accessory bar** above the keyboard (scrollable): **H1/H2** · **B** · *I* · `code` ·
  link · `[[wikilink]]` (opens picker) · list · checkbox · quote · table · image (picker) · undo/
  redo. Long-press for variants.
- **Live preview:** swipe/segment to flip Read↔Edit; on iPad, optional **split** (source left,
  preview right) with synced scroll.
- **Wikilink autocomplete:** typing `[[` opens an inline picker (fuzzy file/heading), port of the
  desktop `WikilinkPicker`.
- **Smart list continuation, auto-close brackets, table formatting** — port the small CodeMirror
  helpers (`cm-list-continue`, `cm-auto-close`, `cm-table-format`) as TextKit input handlers.
- **Image insert:** PhotosPicker / Files → copy into vault `assets/`, insert `![](assets/…)`.
- Autosave + mtime guard (§4.3).

### 6.6 Quick Open
- Pull-down sheet (or ⌘P). Search field + fuzzy-ranked file list (recent-weighted), arrow/return
  on hardware keyboard. Shows path breadcrumb. This is the primary "go anywhere" on iPhone.

### 6.7 Full-text search
- Dedicated screen/column. Query → FTS5 results with **highlighted snippets**, title, path,
  mtime. Supports the desktop **search operators** (port `search-operators.ts`: `tag:`, `path:`,
  quoted phrases). Tap → open at match. Recent searches saved.

### 6.8 Outline & Backlinks (drawer / column)
- **Outline:** heading tree of the current doc; tap → scroll. Auto-updates on edit.
- **Backlinks:** notes linking to the current note (from `links` table) with context snippets.
- iPhone: a bottom sheet / segmented drawer. iPad: the third column or an inspector panel.

### 6.9 Tags
- Tag list (counts) → tapping a tag lists notes. Tag index from `#tag` extraction (port
  `tag-extract.ts`).

### 6.10 Settings
- **Appearance:** theme (System/Light/Dark/Sepia), reader font & size, line width, code theme.
- **Editor:** accessory bar layout, autosave, focus mode, default new-note template.
- **Vault:** current root(s), add/remove folder, "Reindex", index size, location (iCloud/local).
- **Export:** default HTML theme (GitHub/plain/Tufte), PDF page size.
- **Language:** Auto / English / 中文.
- **About:** version, open-source/MIT, links to repo, "Get Markup for Mac". No account section.

### 6.11 Share / Export sheet
- **⤴ Share** → action list: **Share as HTML** (themed, self-contained file), **Export PDF**,
  **Copy as HTML**, **Copy Markdown**, **Share .md file**. All funnel into `UIActivityViewController`.

---

## 7. Reading experience (the core)

Reader-first means the *rendered* surface is the product. Design priorities: typographic quality,
fidelity (math/diagrams/code), and speed.

- **Typography:** system **SF Pro** for UI; reader prose offers SF, New York (serif), and a
  monospace option. Respect **Dynamic Type** (scale rendered base font). Comfortable measure
  (line width) with a max for iPad.
- **Themes:** reuse the desktop **CSS themes** (`github` / `plain` / `tufte`) verbatim where
  possible, plus app **Light/Dark/Sepia** chrome. Theme switch is instant (no reload flash).
- **Fidelity:** KaTeX math, Mermaid → SVG, syntax-highlighted code, GFM tables (zebra), task
  lists, footnotes, heading anchors — all matching desktop output so a note looks the same on
  both. This is the trust anchor of a "companion".
- **Performance:** lazy-load KaTeX/Mermaid only for docs that use them (the desktop already does
  this — reuse the `needs_math` / `needs_mermaid` detection). Virtualize very long docs if needed.

---

## 8. Rendering pipeline (decision)

Three candidate strategies; we choose a pragmatic hybrid.

### 8.1 Option A — WKWebView + bundled assets (recommended for v1)
Render Markdown → HTML and display in a `WKWebView` with **bundled, offline** CSS/JS (the desktop
themes + KaTeX + Mermaid + highlight assets shipped *inside the app*, not from a CDN — better than
desktop, which CDN-loads math/diagram renderers).
- **Pro:** pixel-parity with macOS reader, all fidelity features for free, fastest path to "looks
  great", reuses existing CSS.
- **Con:** WebView memory; bridging taps (links, checkboxes) needs a JS↔Swift message bridge;
  text selection feel is web, not native.
- **HTML source:** either (a) port the comrak output by shipping a tiny JS markdown renderer
  (marked, already a desktop dep) in the WebView, or (b) generate HTML in Swift via
  `swift-markdown` and inject. **v1: render HTML in-WebView with `marked` + bundled KaTeX/Mermaid/
  highlight.js** — least new code, proven assets.

### 8.2 Option B — fully native (`swift-markdown` → AttributedString/SwiftUI)
Render to native views.
- **Pro:** best scrolling/selection/accessibility, lowest memory.
- **Con:** must hand-build math, Mermaid, code highlighting, tables — large effort; fidelity
  drift from desktop. **Not v1.** Revisit for v2 if WebView proves limiting.

### 8.3 Option C — reuse Rust comrak via FFI
Cross-compile the desktop `render_markdown_document` to a static lib; call from Swift; display HTML
in WebView. Gives **byte-identical** HTML to desktop.
- Kept as a **documented fallback** if parity bugs appear with the JS renderer. Not the default
  (contradicts "native rewrite", adds a Rust toolchain to the iOS build).

**Decision:** ship **Option A** for v1 (WebView reader, bundled offline assets, `marked`-based
HTML). Use **swift-markdown** in parallel for *structure* extraction (outline, links, tags) feeding
the index — structure native, presentation in WebView. Keep C as the escape hatch.

---

## 9. Editing experience (light)

- Source-centric, not WYSIWYG (per scope). The win is a *great* source editor with assists, plus
  one-tap live preview — covers 90% of mobile editing (fix a typo, jot a paragraph, check a box).
- TextKit 2 backing for performance on long docs; minimal inline decoration (don't fight the IME).
- **Chinese IME care:** the desktop's only open bug is an IME rendering quirk in WebKit
  contenteditable — **a native `UITextView` editor sidesteps it entirely**, a real reason native
  editing beats a WebView editor here. Document this as a deliberate advantage.
- Accessory bar + wikilink picker + smart list/table helpers as in §6.5.

---

## 10. Search & indexing

- **Index build:** on first vault open, scan `.md`, parse with swift-markdown, populate FTS5 +
  links + tags + headings. Show progress. Incremental updates on file change (NSFilePresenter).
- **Full-text:** FTS5 `MATCH` with snippet()/highlight(); BM25 ranking. Operators (`tag:`,
  `path:`, phrases) parsed client-side into FTS queries (port `search-operators.ts`).
- **Quick Open:** in-memory fuzzy over file list (port `fuzzy.ts`), recent-weighted.
- **Backlinks/outline/tags:** straight SQL queries over the index tables.
- **Reindex** control in Settings; index lives in app container (rebuildable, not in vault).
- Target: 10k files index in a few seconds on-device; queries < 100 ms.

---

## 11. Deferred features — graceful placeholders

- **`.canvas` files:** show a clean card — canvas thumbnail glyph, "Canvas is a desktop feature.
  Open in Markup for Mac." + the file's node/edge count. **Never modify or drop the file**
  (round-trip safety, matches desktop's forwards-compat rule).
- **Graph view:** a Settings/Library entry that explains it's desktop-only (or a static
  "coming later" state). No half-baked phone graph.

---

## 12. Export & sharing

- **Share as HTML:** reuse the render pipeline to produce a **self-contained, offline** `.html`
  (math/diagram assets inlined — better than desktop's CDN approach) → share sheet as a file.
- **Export PDF:** render to WKWebView, `createPDF` / `UIPrintPageRenderer`, wait for
  math/Mermaid settle (mirror desktop's load-wait), → share sheet. Themes: GitHub/plain/Tufte.
- **Copy as HTML / Copy Markdown / Share .md.** All via `UIActivityViewController`.
- **Share Extension (v1.1):** receive `.md`/text from other apps → save into vault.

---

## 13. iPad-specific & hardware keyboard

- **Multi-column** `NavigationSplitView`; **multiple open docs** as tabs above the detail column.
- **Hardware keyboard shortcuts** (`UIKeyCommand` / SwiftUI `.keyboardShortcut`), mirroring
  desktop muscle memory:
  - ⌘P Quick Open · ⌘⇧F full-text search · ⌘⇧P command palette · ⌘⌥O outline ·
    **E** edit toggle · ⌘/ source view · ⌘S save · ⌘B/I formatting · ⌘\[ \] indent ·
    ⌘1/2/3 focus sidebar/list/detail.
- **Pointer/trackpad** hover states; **drag & drop** notes (reorder, into folders, out to other
  apps).
- **Multitasking:** Split View, Slide Over, **Stage Manager**, multiple **scenes** (two notes
  side by side via `UIWindowScene`).
- **Apple Pencil:** out of scope for v1 reader (no Canvas), but Scribble works in the editor for
  free. Pencil → annotation is a v2 idea tied to Canvas.

---

## 14. Visual design system

- **Foundation:** native iOS materials, vibrancy, system semantic colors → automatic Dark Mode.
- **Accent:** carry the Markup brand accent from the macOS app/icon for continuity.
- **Themes:** Light · Dark · Sepia · System. Sepia reuses desktop sepia tokens. Reader themes
  (GitHub/plain/Tufte) are independent of chrome theme.
- **Typography:** SF Pro (UI), New York (serif reader), SF Mono (code). Full Dynamic Type.
- **Iconography:** SF Symbols throughout (book, pencil, magnifyingglass, link, number for tags,
  square.and.arrow.up for share) for crisp, consistent, accessible icons.
- **Spacing & layout:** 8-pt grid; generous reading margins; safe-area aware; large-title nav.
- **Motion:** standard iOS transitions; subtle haptics on save, link-follow, checkbox toggle,
  swipe actions. Respect Reduce Motion.
- **App icon:** adapt the macOS Markup mark for iOS (rounded-rect, simplified for small sizes).

---

## 15. Accessibility & internationalization

- **VoiceOver:** full labels; the reader WebView exposes semantic HTML (headings, links, lists,
  tables) → good rotor navigation for free.
- **Dynamic Type** end-to-end (UI + reader prose). **Bold Text / Increase Contrast / Reduce
  Motion / Reduce Transparency** honored.
- **Keyboard-only** operation on iPad (every action reachable).
- **i18n:** reuse the desktop **EN/中文** string catalog (`src/lib/locales`) → iOS
  `.xcstrings`/`Localizable`. RTL-safe layout. Locale-aware date/relative-time (port `rel-time`).

---

## 16. Privacy, security, App Store

- **No account, no telemetry, no analytics SDKs.** On-device + the user's own iCloud only.
- **App Privacy "nutrition label":** Data Not Collected. Strong differentiator; state it in copy.
- **Sandbox/entitlements:** iCloud Documents, Files access (security-scoped), Photos (add-only for
  image insert), background fetch (light, for index refresh). No network entitlement needed for
  core (assets bundled) — request none unless a feature needs it.
- **App Store positioning:** "Markup — Markdown reader for your vault. Native, private, open."
  Free; optional future "tip jar"/Pro (e.g. multiple vaults, advanced export) — **not** a paywall
  on reading. Universal purchase mindset with the (future) Mac App Store build.
- **Review notes:** explain BYO-folder model and that no data leaves the device; provide a sample
  vault for reviewers.

---

## 17. Performance budget

| Metric | Target |
|---|---|
| First readable paint (open note) | < 150 ms (cached), < 500 ms (cold from iCloud local) |
| Vault index (10k files) | < 5 s, incremental thereafter |
| FTS query | < 100 ms |
| Quick Open keystroke latency | < 16 ms |
| Idle memory | < 60 MB (reader WebView is the main cost; reuse one instance) |
| Scroll | 120 Hz on ProMotion |

Techniques: single reused WKWebView (swap content, don't recreate), lazy math/Mermaid, list
virtualization, off-main indexing (background `Task`), SQLite WAL.

---

## 18. Engineering plan & milestones

> Ship code via PR + green CI (extend CI with an iOS build/test lane). Keep the iOS app in the same
> repo under `ios/` (or a sibling package) so themes/strings/test fixtures are shared.

**M0 — Skeleton (spike)**
- Xcode project, SwiftUI app, `NavigationSplitView`/`Stack` shell, document picker + security-scoped
  bookmark, open a folder, list `.md`, open one in a WebView with a bundled theme. Proves the
  companion loop end-to-end.

**M1 — Reader MVP**
- High-fidelity reader (themes, KaTeX, Mermaid, code, tables, task-list tap-to-toggle), reading
  position memory, theme/font controls, Light/Dark/Sepia. iPhone + iPad layouts.

**M2 — Navigate**
- File browser (folders, swipe actions), Quick Open (fuzzy), wikilinks + backlinks, outline, tags.
- SQLite index (FTS5 + links + headings + tags), full-text search with operators & snippets.

**M3 — Light edit**
- Native source editor, accessory bar, wikilink autocomplete, smart list/table helpers, image
  insert → `assets/`, autosave + mtime/conflict handling, live preview (split on iPad).

**M4 — Share & polish**
- Export HTML/PDF + share sheet, settings, localization (EN/中文), accessibility pass, haptics,
  iPad keyboard shortcuts, empty/error/iCloud-downloading states.

**M5 — Beta**
- TestFlight, conflict-handling hardening, performance pass against the budget, App Store metadata,
  privacy label, sample vault.

**Deferred (v2+):** Graph, Canvas render, full WYSIWYG, Share Extension, Apple Pencil annotation,
Shortcuts/AppIntents, Widgets ("today's note"), Spotlight indexing.

---

## 19. Risks & open questions

| Risk / question | Mitigation / note |
|---|---|
| iCloud conflict & data loss perception | Explicit conflict UI, never silent-overwrite, atomic writes. Highest-trust area — over-invest. |
| WebView reader memory/feel | Single reused instance; measure; fall back to native render (Opt B) only if needed. |
| Render parity vs desktop (comrak vs marked) | Bundle same CSS; if drift matters, switch to FFI comrak (Opt C). Add golden-file render tests shared with desktop. |
| Security-scoped bookmark staleness (iCloud paths move) | Handle stale bookmarks → re-prompt; store relative-to-root paths, not absolutes. |
| Large vault index time/battery | Background, incremental, WAL; cap initial body-index size, lazy-index on first search if huge. |
| Editing scope creep toward WYSIWYG | Hold the line: light source editor + preview is the v1 contract. |
| `.canvas` round-trip safety | Treat as opaque; never rewrite. Placeholder only. |
| App Store BYO-folder review friction | Reviewer notes + sample vault; this model is well-precedented (iA Writer, Obsidian, Runestone). |

### Decisions (resolved — were open questions)
1. **Vault ownership default:** ✅ **Companion-first.** Lead onboarding with "Open my existing
   iCloud folder"; offer "Create a Markup vault" as an alternative.
2. **Pricing:** ✅ **Free in v1.** Revisit an optional Pro tier only after traction.
3. **Repo layout:** ✅ **Same repo**, app under `ios/`, dedicated CI lane.
4. **License:** ✅ **MIT**, consistent with desktop.

---

## 20. Appendix — assets reused from macOS

- **Reader CSS themes** (`github`/`plain`/`tufte`) and reader styling → bundled into the app.
- **i18n strings** (`src/lib/locales`, EN/中文) → iOS string catalogs.
- **Pure logic to port** (already unit-tested on desktop — port tests too): `fuzzy.ts`,
  `search-operators.ts`, `slugify.ts`, `headings.ts`/`toc.ts`, `tag-extract.ts`, `wikilink.ts`,
  `frontmatter.ts`, `rel-time.ts`, `text-stats.ts`, `cm-list-continue`/`cm-auto-close`/
  `cm-table-format` (as TextKit handlers), `scroll-memory.ts`.
- **Render fidelity contract:** KaTeX, Mermaid, syntect/highlight output, heading anchors — match
  desktop output so a note is identical on both platforms.
- **Data shapes** (`LoadedFile`, `VaultFile`, `SearchHit`) → Swift structs.

---

_Design owner: (you). Built with the help of Claude Code. This doc is the contract for iOS v1 —
update it as decisions land, the way `HANDOFF.md` tracks the desktop GTM phase._
