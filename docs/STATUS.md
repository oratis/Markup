# Status — Last updated 2026-05-13 (153 batches landed; v2 Canvas closed)

This is the wake-up brief. Read this first.

## TL;DR

`main` branch has 170+ commits across **153 feature batches** (v1
B001–B135, v2 B201–B218), all CI-green. `main` is protected (linear
history, required CI, no force-push, no deletion; admin can hotfix).
`v0.1.2` is the latest released DMG (unsigned). The app compiles,
type-checks, lint-clean, **841 React tests + 26 Rust unit + 9 integration**,
double-Codecov coverage upload, runs cleanly in dev.

**Obsidian roadmap closed end-to-end:**
- Tier-1 (must-have to be an Obsidian alternative): ✅ **5/5 complete**
- Tier-2 (nice-to-have power features): ✅ **7/7 complete** — Canvas
  shipped in v2 (B201–B218); the other six landed earlier
- Tier-3 (out of scope for v1): plugins, sync, mobile

## v2 — Obsidian-compatible Canvas (B201–B218, all green)

Single-goal sub-project: implement the .canvas whiteboard so Markup
opens, edits, and saves Obsidian's JSON canvas format. 18 batches across
4 phases, all merged to main with green CI.

### Phase 1 — Data layer (B201–B204)
- **B201** canvas-format.ts — parseCanvas / serializeCanvas / validateCanvas.
  Round-trips text / file / link / group nodes + edges with optional
  fromSide/toSide/label/color. Preserves unknown fields verbatim so
  future Obsidian additions never silently drop. Tolerant on malformed
  input — keeps good entries, skips bad ones.
- **B202** canvas-store.ts + canvas-registry.ts — per-tab Zustand-shaped
  reactive store with snapshot-based undo/redo (100-entry cap),
  selection (not in history). Registry disposes on tab close so
  re-opening a canvas reads fresh disk content.
- **B203** Rust read_file gains a canvas-aware extension gate +
  open_file dialog adds a Canvas filter. write_file already accepted
  any extension. New ext_tests + tokio integration test on a real
  .canvas round-trip.
- **B204** Tab.kind discriminant + canvas-path.ts + openLoadedFile
  routing + FileTree icon for .canvas. Render-branch in App.tsx routes
  `tab.kind === "canvas"` to CanvasView, leaving Markdown tabs
  untouched.

### Phase 2 — Rendering (B205–B210)
- **B205** CanvasView pan/zoom skeleton — viewport math in
  canvas-viewport.ts (pure: applyWheelZoom keeps point under cursor
  fixed, screen↔world round-trip, clampZoom). ctrl/cmd+wheel zooms,
  plain wheel pans, space+drag pans, middle-drag pans, Mod+0 resets.
- **B206** CanvasNodeText — static markdown rendered through marked +
  stripDangerousAttrs. Drag-to-move with local in-flight state so
  one moveNode commits on pointer up (single history entry).
- **B207** CanvasNodeFile — loads vault file on mount, optional
  #Section / ^block slicing via embed-slice, double-click opens as a
  tab.
- **B208** CanvasNodeLink + CanvasNodeGroup — emerald link card with
  parsed host + double-click→window.open; amber dashed group frame
  with label band that's the only pointer-active part (frame interior
  is transparent so child nodes stay clickable).
- **B209** CanvasEdgesLayer — single SVG with cubic Bezier per edge.
  Anchors honour explicit fromSide/toSide or auto-pick via closestSide.
  Obsidian colour scheme 1–6 maps to red/orange/yellow/green/cyan/
  purple; raw hex passes through. Selection styling + dangling-ref
  skip.
- **B210** CanvasTextOverlay — single shared Milkdown editor mounted
  on double-click, aligned to node coords. Esc / blur commits via
  updateNode; commonmark+gfm+history+listener plugins only (light
  variant for the in-canvas use).

### Phase 3 — Interactions (B211–B215)
- **B211** Drag-rectangle selection + Delete/Backspace removes selected
  nodes + their dangling edges (one history entry) + Esc clears
  selection. Editable-target check stops the editor swallowing canvas
  keys.
- **B212** Text-node creation — double-click empty canvas spawns a
  200×100 node + opens the overlay; Shift+drag draws a sized node
  (160×80 floor).
- **B213** Anchor handles on selected nodes — 4 blue dots, 6/zoom
  radius so they stay constant-pixel size. Drag from anchor →
  nodeAtPoint hit-test → store.addEdge with computed toSide. Dashed
  ghost path follows the cursor.
- **B214** Mod+Z / Mod+Shift+Z / Ctrl+Y wired to store.undo/redo;
  editor overlay's history isn't hijacked (editable-target check).
- **B215** Autosave — useCanvasAutosave hook flows store mutations
  through updateActiveContent + a debounced writeFile, mirroring the
  markdown editor's save lifecycle (dirty → saving → saved / error).
  First render skipped so opening a canvas doesn't churn its mtime.

### Phase 4 — Integration (B216–B218)
- **B216** "New Canvas in Vault…" palette command writes `{}` to a
  fresh .canvas file and opens it. Existing "Open File…" already
  shows canvas in the OS dialog (B203 added the filter).
- **B217** Scanner gains is_canvas + scan_vault_files so .canvas files
  show in FileTree and QuickOpen; Tantivy indexing keeps using
  is_markdown so canvas JSON doesn't pollute body search. FileTree
  + QuickOpen rows show an amber ◈ glyph for canvases.
- **B218** This STATUS rewrite + V2_CANVAS.md flipped to shipped.

### Canvas in numbers
- 11 new pure helpers in src/lib/: canvas-format, canvas-store,
  canvas-registry, canvas-path, canvas-viewport, canvas-md-render,
  canvas-drag, canvas-file-resolve, canvas-edge-geom, canvas-select,
  canvas-ids
- 8 new components in src/components/: CanvasView, CanvasNodeText/
  File/Link/Group, CanvasEdgesLayer, CanvasInteractionLayer +
  CanvasAnchorHandles, CanvasTextOverlay
- 216 React tests added (625 → 841) — every pure helper at near-100%
  line coverage; component layer is render + smoke + drag/edit/undo
  events
- 9 Rust tests added (17 → 26) — ext gate + scanner extension
- 1 new direct dep: `marked` (16.4.2) — promoted from transitive,
  static rendering inside canvas text nodes

## What landed in batches 132–135 (newest) — Polish + closing items

- **#133** Hover preview on `.wikilink` / `.embed` — 320ms dwell pops
  a tooltip with the target's first ~280 chars (or anchor-sliced
  section for `#heading` / `^block`). Per-path content cache cleared
  on link-index mutation; abort generation prevents stale tooltip
  writes when a later hover races a slow readFile.
- **#134** Tab bar star indicator — bookmarked tabs show `★` next to
  filename; right-click → "Bookmark" / "Remove Bookmark" toggle.
  Subscribed to bookmarks store via useSyncExternalStore.
- **#135** QuickOpen `^block` mode — fourth reactive index store
  (links / tags / headings / blocks) with identical lifecycle. Parses
  `^blockid` markers (whitespace-bounded, fence-aware), fuzzy-matches
  against id AND snippet so users can find blocks by content text.

## What landed in batches 125–131 — Tier-2 + Visual polish

- **#126** SearchPanel `tag:` / `path:` operators — Tier-2 #4. Client-side
  intersection over the tag index for operator-only queries; free-text
  still goes through Rust search. Filter combinable: `tag:#todo path:journal/`.
- **#127** BookmarksPane — Tier-2 #5. Persisted-anywhere starred files
  (independent of vault), shown at the bottom of the right aside.
  "Toggle Bookmark for Active File" palette command.
- **#128** Vault heading index + QuickOpen `#` mode — Tier-2 #3. Third
  reactive store in the link-index pattern; built off parseHeadings;
  fuzzy match across every heading in the vault, opens + jumps to line.
- **#129** Milkdown tag chip decoration — `#tag` rendered as rounded
  pills in WYSIWYG, click → SearchPanel filtered by tag. Skips code
  spans / blocks / pure-numeric.
- **#130** Milkdown embed decoration — `![[…]]` rendered with dashed
  border to read as transclusion, click → open target + jump to
  `#heading` anchor when present.
- **#131** GraphView — Tier-2 A. Force-directed layout in pure SVG
  (no D3): Coulomb repulsion + Hooke attraction along edges + centre
  gravity, deterministic per seed (testable), 120 iters with linear
  cooling. Node radius ∝ √degree, edges weighted by ref count, active
  tab's node highlighted. NODE_LIMIT=300 with truncation banner.
  Opens via "Open Vault Graph" palette command.

## What landed in batches 114–124 — Obsidian Tier-1

After researching Obsidian's defining features, set a Tier-1 list of
five that turn Markup from "Markdown editor with wikilinks" into a
credible Obsidian alternative. **All five now have at least their core
shipped.**

### #1 Backlinks (✅ panel + indexer)
- `extractLinks` / `resolveTarget` / `buildIndex` / `updateFileLinks`
  in src/lib/link-index.ts — parse `[[…]]` / `![[…]]`, skip fences +
  inline code, GitHub-style basename + path-suffix resolution
- Singleton store in src/lib/link-index-store.ts with subscribe API,
  vault-root keyed localStorage cache (4 MB cap), incremental
  onFileSaved hook wired into the App.tsx save path
- BacklinksPanel.tsx under the Outline aside — grouped by source file,
  L<line> + snippet, click to open + jump via `markup:jump-to-line`
- "Rebuild Link Index" palette command (opt-in full scan — touching
  every file on vault-open would freeze 1000+-file vaults)

### #2 Tag system (✅ panel + indexer)
- `extractTags` in src/lib/tag-extract.ts — inline `#tag` (incl. nested
  `#tag/sub`), YAML frontmatter inline + block array forms, Unicode-aware,
  case-preserving, skips fences / inline code / ATX heading prefix /
  pure-numeric `#42`
- Singleton tag-index store with sorted-snapshot caching for
  useSyncExternalStore stability
- TagsPane.tsx stacked under BacklinksPanel — alpha-sorted with file
  counts, inline filter, click → cross-vault SearchPanel pre-filled
  with `#tag`
- Rebuild palette command builds both indices in one pass, toast
  reports `links/files/tags`

### #3 Daily notes + templates (✅)
- Three persisted settings: `dailyNotesFolder` (default `journal`),
  `dailyNotesFormat` (`YYYY-MM-DD`), `dailyNotesTemplate` (vault-
  relative path, optional)
- Pure helpers in src/lib/template.ts — `formatDate` (YYYY MM DD HH mm
  ss), `applyTemplate` (`{{title}}` `{{date}}` `{{date:FMT}}` `{{time}}`
  `{{cursor}}`), `dailyNotePath` (slash-formats nest by date)
- "Open Today's Daily Note" palette command — opens existing or creates
  from template, refreshes file tree, places caret at `{{cursor}}` slot

### #4 Properties UI (✅)
- `parseFrontmatter` / `serializeFrontmatter` round-trip — scalars,
  inline + block arrays, booleans (`true/false/yes/no`), nulls, quote
  preservation, ambiguity-aware quoting on emit
- PropertiesEditor.tsx mounted above the editor body in WYSIWYG mode
  (hidden in source mode — raw YAML is already visible) — text /
  number / boolean / list rows, × removes, bottom-row submit adds key
- Edits round-trip through serialiser + updateActiveContent in place

### #5 Embeds (✅ slicer + resolve-to-clipboard)
- `splitEmbedTarget` / `findSectionByHeading` / `findBlock` /
  `sliceEmbed` in src/lib/embed-slice.ts — handles `Foo`, `Foo#Section`
  (fence-aware heading match), `Foo^block` (paragraph marker with
  whitespace boundary, stops at heading lines)
- "Copy Document with Embeds Resolved" palette command — walks the
  active doc, resolves every `![[…]]` via vault read + slice, emits a
  blockquote-style expansion below each embed line, copies to clipboard.
  Reports resolved/unresolved counts. Future batch will add a Milkdown
  inline renderer.

### Other (batches 114-124)
- Branch protection on `main` (linear history, required CI checks,
  conversation resolution, no force-push, no deletion, admin can override)
- `markup:open-search` custom event for cross-component filter triggers
- `markup:jump-to-line` custom event for cross-component scroll
- `EMPTY_REFS` / cached-snapshot sentinels to keep useSyncExternalStore
  stable across renders

## What landed in batches 91–107

### User-visible
- **Insert Table of Contents** palette command — markdown bullet list
  with GitHub-flavoured anchors (Unicode-preserving slugs, duplicate
  slugs suffixed with -N, indent normalised to the doc's shallowest
  heading level).
- **Copy Current Section** — copies the heading the cursor sits in,
  plus its body and nested subsections, to the clipboard.
- **Selection: Sentence case** — pairs with the existing upper/lower/
  title commands. Lowercases then capitalises after . ! ? + ws.
- **Toggle HTML Comment** replaces the old "Wrap in HTML Comment"
  command — running it twice now unwraps instead of producing
  `<!-- <!-- … --> -->`.
- **Insert Horizontal Rule** shortcut (⌘⇧-).
- **Wrap Selection in Collapsible Block** (`<details><summary>`).
- **Export Settings (Download File)** alongside the existing clipboard
  copy — both share a serializeSettings helper so JSON shape stays
  consistent.
- **Save As: default name from first H1** of scratch buffers.
- **StatusBar: relative "last saved" pill** ticks every 5 s.

### Engineering / hardening
- `parseSettings` validator on Import Settings — drops fields with the
  wrong type, rejects invalid enum values, rejects non-finite numbers.
  Previous `JSON.parse + typeof === "object"` check passed garbage
  straight into setSettings.
- `DEFAULT_SETTINGS` is now the single source of truth — both the
  "Reset All" palette command and the Settings dialog's "Restore
  defaults" button consume it instead of inlining 17 fields each.
- `countMatches` (regex search bound used by FindBar) had a subtle
  zero-length-match infinite-loop bug — escape clause only triggered
  when lastIndex was exactly 0. Now advances lastIndex manually when
  it stalls anywhere.
- Helpers extracted from components for direct test coverage:
  `serializeSettings` / `parseSettings` (settings-io.ts),
  `scoreSubsequence` (fuzzy.ts), `countWords` / `byteSize` /
  `humanSize` (text-stats.ts), `countMatches` (count-matches.ts),
  `slugifyForFilename` / `firstHeadingText` (slugify.ts),
  `toggleHtmlCommentText` / `toSentenceCase` (insert-md.ts),
  `getCurrentSectionText` (cm-section.ts), `buildToc` (toc.ts).

### Tabs / shortcuts
- Ctrl+Tab / Ctrl+Shift+Tab as alternate next/prev tab bindings.
- Recent-files cap bumped 20 → 50.

## What landed in batches 68–90

### Substantive
- **Outline drag-to-reorder section** (source mode): drag a heading
  row onto another to insert before/after based on pointer position.
  New moveSectionToLine primitive handles shrunken-doc reindexing.
- **Source-mode list editing**: Enter on a bullet/numbered/task line
  continues the list (auto-increments numbers); Tab/Shift-Tab indent/
  outdent by 2 spaces; Backspace at start of indented list outdents.
- **Cmd+click follows wikilink** in source mode (new lib/follow-wikilink
  shared with the palette "Follow Wikilink at Cursor" command).
- **Source-mode `[[` auto-trigger** opens the wikilink picker in
  completion mode (parity with WYSIWYG).
- **Vault sort: name / mtime** persisted setting + FileTree header
  toggle button (A↓ / ⏱).

### Editor commands
- Math: Wrap as Inline Math ($…$), Insert Math Block ($$…$$)
- Insert Mermaid Diagram, Insert Callout (Note/Warning/Tip)
- Wrap Selection in HTML Comment, Wrap as Code Block
- Toggle Wikilink on Selection, Paste Clipboard as Markdown Link
- Selection: Strip Markdown In Place, Tabs↔Spaces (2)
- Go to Document Start/End, Jump to Line, Select Next Occurrence
- Delete Current Line, Copy Line Up/Down
- Move Section to Top/Bottom

### Tabs / vault
- Ctrl+Tab / Ctrl+Shift+Tab alternate next/prev tab bindings
- Move Tab to First / Last
- Reload All Files from Disk
- New File in Vault, Rename Active File, Copy Vault-relative Path
- Recent-files cap bumped 20 → 50

### UI / status
- Shortcuts Cheatsheet modal + ⌘⇧/ shortcut
- Cycle Theme (⌘⌥T)
- Prose: Wider / Narrower column palette commands
- Toggle Spell Check, Toggle Toolbar, Toggle Tab Bar
- Outline: auto-scroll active heading into view
- StatusBar: file-size pill (UTF-8 bytes, ≥ 1 KB)
- Settings Export / Import (clipboard JSON)
- ShortcutsEditor: filter input + duplicate-binding ⚠ warning

### Session restore + persistence
- **Restore last open tabs** on launch (tabs + active + scroll
  offsets via path-keyed memory; "Restored N tabs" toast)
- **Persistent pinned tabs** survive relaunch
- **Persistent scroll memory** survives relaunch (path-keyed,
  200-entry cap)
- per-tab WYSIWYG scroll memory (in-session)

### Engineering
- 303 React tests across 39 files (was 277 / 37)
- All 32 shortcuts editable + filterable + conflict-flagged
- 17 persisted settings

## What landed in batches 53–67

### Big wins
- **Session restore on launch**: path-backed open tabs + active tab
  + scroll offsets (path-keyed, persisted 200-entry cap) come back
  exactly where you left them. Toast confirms count restored.
- **Persistent pinned tabs**: pin state survives relaunch via a
  separate localStorage set; new tabs auto-mark pinned on open.

### Editor commands
- Move Section to Top / Bottom (iterative; respects sibling level)
- Reverse Lines, Remove Duplicate Lines
- Strip Markdown In Place, Copy as HTML, Copy Plain Text
- Wrap Selection as Code Block… (language prompt)
- Set Heading H1..H6 / None (absolute)
- Jump to Line… (source-mode prompt + dispatch)
- Insert YAML Frontmatter (skips when one exists)
- Format Table, Toggle Task Checkbox on Line

### Search / replace
- FindBar: Replace (single) button alongside Replace All; both
  honour case-sensitive + regex toggles
- Find Selection in Vault (pre-fills SearchPanel with current
  selection, 200-char cap)
- New replaceOnce helper + extended replaceAll with caseSensitive

### Tabs
- Move Tab to First / Last; pinned-group preserved
- Switch to Tab: <name> palette entries (subscription-driven)

### UI / status
- Reload from Disk, Reload All Files from Disk (parallel reads,
  dirty-confirm + summary toast)
- Rename Active File…, New File in Vault… (auto-extension)
- Copy Vault-relative Path
- Save As… auto-appends .md when missing extension
- Status bar: file size pill (UTF-8 bytes, KB/MB) once ≥ 1 KB
- Settings export / import (clipboard JSON)
- Toggle Toolbar, Toggle Tab Bar, Toggle Spell Check (zen-mode flags)
- Outline right-click context (Copy Wikilink / Heading Text /
  Scroll To)

### Help / shortcuts UX
- ShortcutsEditor: filter input + duplicate-binding ⚠ warning
- Shortcuts Cheatsheet modal + ⌘⇧/ shortcut
- Cycle Theme (⌘⌥T)
- Source-mode `[[` auto-trigger opens wikilink picker

### Engineering
- 277 React tests across 37 files (was 245 / 34)
- All 32 shortcuts editable + filterable + conflict-flagged

## What landed in batches 32–52

### Editor commands
- Heading nav (⌘⇧J / ⌘⇧K), absolute Set Heading H1..H6, Move
  Section Up / Down (sibling-only swap)
- Format Table (auto-align), Toggle Task Checkbox on Line, Wrap as
  Code Block, Insert YAML Frontmatter
- Sort Lines Asc / Desc, UPPER/lower/Title case, Strip Markdown
  in-place + Copy as Plain Text
- Editor zoom (⌘= / ⌘- / ⌘0), Cycle Theme (⌘⌥T)
- Insert Link prompt (⌘K), Copy as HTML

### Tabs
- Cmd+1..9 jump-to-tab, Move Active Tab Left / Right (⌘⇧⌥←/→)
- Switch to Tab: <name> palette entries for fuzzy-search across open
  docs, middle-click to close, Reveal in File Tree from tab ctx menu

### Files / vault / save
- Reload from Disk, Reload All Files, Rename Active File…,
  New File in Vault…, Recent Vaults palette, Open Recent inline
- Trim trailing whitespace on save (opt-in)

### Find / replace / status
- Find & Replace bar with case-sensitive (Aa) + regex (.*) toggles
- Status bar: caret position, selection counter, heading breadcrumb,
  reading time, word-count goal progress, dirty-count badge,
  vault file count, clickable mode pill

### UI polish
- Toolbar formatting buttons (Bold/Italic/Code/Link/HR)
- Outline H1..H6 level chips + filter input + right-click context
  menu (Copy Wikilink, Copy Heading Text, Scroll To)
- Sidebar / Outline drag-to-resize (persisted widths)
- Toggle Toolbar / Tab Bar (zen mode), MRU command palette,
  per-tab scroll memory, beforeunload dirty guard

### Settings (15 persisted)
- spellcheck, lineWrap, sidebarWidth, outlineWidth, saveOnBlur,
  trimOnSave, showLineNumbers, wordCountGoal, showToolbar, showTabBar
  + the original 5 (font / width / autosave / image dir / export theme)
- ShortcutsEditor lists every registered binding (32 in total) and
  has a filter input

### Engineering
- 245 React tests across 34 files (was 192 / 27); 17 Rust unit + 9
  integration unchanged
- All shortcuts editable from the Settings dialog

## What landed in batches 17–31 (recent)

### Editor commands (palette + shortcuts)
- Smart paste (URL over selection → markdown link), insert HR, insert
  table prompt, insert today's date, insert link prompt (⌘K)
- Bold / Italic / Inline Code / Strikethrough wrap (⌘B / ⌘I / ⌘E / ⌘⇧X)
- Move line up/down (⌥↑/↓), duplicate line (⇧⌥↓), toggle blockquote (⌘')
- Promote/Demote heading (⌘⌥↑/↓), toggle bullet/numbered/task list
  (⌘⇧8 / ⌘⇧7 / ⌘⇧9)
- Sort lines asc/desc, UPPER / lower / Title case selection
- Editor zoom in/out/reset (⌘= / ⌘- / ⌘0)
- Next / Previous heading (⌘⇧J / ⌘⇧K)
- CM6 bracket matching + auto-close pairs (no autocomplete dep)
- Source-mode line wrap toggle (live Compartment reconfigure)

### Tabs
- Pin / Unpin tab (📌 glyph, hides close button, survives Close All
  / Others / Right)
- Next / Previous tab (⌘⌥] / ⌘⌥[), Reopen Last Closed Tab (⌘⇧T),
  Close All Tabs, Copy Path

### Files / vault / save
- Save All (⌘⌥S), reload from disk, reveal in file tree, recent vaults
  + open recent vault palette commands, recent files in palette,
  trim trailing whitespace on save (opt-in setting), save on blur
  (opt-in setting)

### Layout / status
- Resizable sidebar + outline panels (drag handles, persisted widths)
- Status bar: live selection counter, source-mode caret position,
  heading breadcrumb (current section path)
- Outline filter input (case-insensitive substring)
- Spell check toggle (browser-native), Settings dialog now has 11 rows

What's still on you:
- **Spike 0.2** quantitative numbers — instrumentation is wired; you open
  `test-fixtures/big.md` and read `~/Library/Logs/markup/perf.log`.
- **Spike 0.4** signing+notarization — `scripts/sign-and-notarize.sh` is
  ready; needs your Apple ID app-specific password.
- **Auto-updater** key-pair generation — `lib/updater.ts` documents the
  3-step setup; release.yml reads `TAURI_SIGNING_PRIVATE_KEY` secrets
  if present and emits `latest.json`.
- Replace placeholder app icons.
- Decide if you want to merge any of the open Dependabot PRs (most are
  major bumps — risk-managed by you, not me).

## Feature highlights

### Editor
- WYSIWYG (Milkdown) ↔ Source mode (CodeMirror 6, fold gutter, `⌘/`)
- Multi-tab with HTML5 drag-drop reorder + right-click "Close / Others
  / To the Right" + dirty-on-close confirm
- Find in File (`⌘F`) with match counter (n / 9999+) — uses
  `window.find()` for WYSIWYG; CM6 has its own search panel in source
- Save / Save As (atomic temp+rename, mtime stale-check, autosave
  debounce configurable 0–2000ms)
- 5MB+ docs auto-fall back to source mode
- 500KB+ docs in source mode skip line numbers / syntax highlighting
- KaTeX math, Mermaid diagrams, Shiki code highlighting, GFM tables,
  task lists

### Wikilinks
- `[[name]]` clicks open the matching vault file (basename / case-
  insensitive / extension-tolerant fallback)
- Typing `[[` in WYSIWYG auto-pops the wikilink picker (completion mode)
- Manual "Insert Wikilink…" command opens the picker (full mode)
- Inline ProseMirror decoration tints `[[xxx]]` in WYSIWYG

### Vault management
- Open vault, virtualised file tree (@tanstack/react-virtual)
- Right-click in tree: Rename / Move to Trash
- Quick Open (`⌘P`, fuzzy subsequence)
- Full-text search (`⌘⇧F`, Tantivy index)
- File watcher → vault refresh + reload-on-external-edit prompt
- Recent files (capped 20, persisted to localStorage AND
  `~/Library/Application Support/markup/recent.json` — survives
  cross-window + first-launch)

### Editor flow
- Outline panel with cursor-tracking active-heading highlight + click
  to scroll (Milkdown DOM in WYSIWYG, CM6 line dispatch in source)
- Outline parsing in a Web Worker for docs > 50KB
- Focus / Typewriter modes (CSS attribute + selectionchange handler)
- Command Palette (`⌘⇧P`) — ~22 commands
- Copy Link to Paragraph → `[[file#heading]]` in clipboard
- Image paste / drag-drop into vault `assets/` (or configurable dir)
- Drop a `.md` file from Finder onto the editor → opens it
- Toast queue (cap 3, fade animation)

### Settings
- Font size / prose width / autosave delay / image-paste folder
- Export theme (GitHub / Plain / Tufte)
- Language (Auto / English / 中文) — also drives native macOS menu
- Custom keyboard shortcuts (11 commands, click-to-record)
- Reset All Settings command (palette)
- All persisted to localStorage; locale also persisted to disk so the
  next launch's menu reflects the choice

### Native macOS integration
- Full menu bar (File / Edit / View / Window / Help) localised to
  en/zh, JS-side locale picker rebuilds it live via `set_locale`
- File associations: `.md` / `.markdown` / `.mdx` / `.mkd`
- New Window (`⌘⇧N`)
- About dialog with version + bundle ID + repo link
- First-launch onboarding modal with shortcut cheatsheet
- System theme follow ("Auto" theme) — flips light/dark with macOS

### Distribution
- Two GH Actions workflows:
  - `ci.yml`: lint + tsc + Vite build + cargo test + cargo build —
    every push & PR. Uploads frontend + Rust coverage to Codecov.
  - `release.yml`: tag-triggered. Builds .app + plain hdiutil DMG,
    SHA256SUMS, optional `latest.json` (when updater secrets set),
    attaches to the GitHub Release with auto-generated notes.
- Tauri-plugin-updater wired (active=false until you set the pubkey)
- Three published commits, two tags (v0.1.0, v0.1.1), one full release
- Dependabot watches npm / cargo / GH Actions weekly with grouping

### Engineering
- Biome 1.9 lint + format with project-fitted rules (no warnings)
- React tests: 105 across 20 files (Vitest + jsdom + RTL)
- Rust tests: 17 unit + 9 integration + 2 spike (release-only, ignored
  by default; reproduce via `pnpm bench:spike03`)
- Coverage flowed to Codecov with separate `frontend` / `rust` flags

## Spike status

### Spike 0.1 — Tauri + Milkdown boot
- App built and launched in dev mode
- markup process: 88MB RSS at idle (vs 200-300MB Electron baseline)
- Vite serves http://localhost:1420 at 16ms
- Welcome doc renders on first load

### Spike 0.3 — Tantivy + notify
- Tantivy index with title/body/path/mtime schema, 64MB writer heap
- walkdir scanner skipping `.git`, `node_modules`, `.obsidian`, `.markup`, etc.
- notify-debouncer-full with 150ms coalesce
- Unit tests for index upsert/search/replace
- Integration test `bench_10k_files` (file: `src-tauri/tests/spike_03.rs`)

### M1 P0 features
- WYSIWYG (Milkdown) ↔ Source mode (CodeMirror 6) toggle (⌘/)
- Multi-tab editor (state in zustand store, drop-welcome-on-first-file behavior)
- Vault open/close, virtualized file tree (`@tanstack/react-virtual`)
- macOS native menu: File / Edit / View / Window / Help, full ⌘ shortcuts
- Quick Open (⌘P, fuzzy subsequence match)
- Vault search panel (⌘⇧F, Tantivy queries)
- Status bar: source/WYSIWYG indicator, words/chars/lines, save status, vault root
- Theme: Light / Dark / Sepia (CSS variables, persists in localStorage)
- `.md` / `.markdown` / `.mdx` / `.mkd` file association
- File watcher → "vault-changed" event → UI re-syncs file tree
- Save: 300ms debounce + ⌘S override, mtime stale-check, atomic temp+rename

### Spike 0.4 — Signing/notarization (script ready, not run)
- `scripts/sign-and-notarize.sh` (executable)
- `src-tauri/Entitlements.plist` (hardened runtime + JIT + file/network access)

## What you need to do when you wake up

### 1. (Optional) Run Spike 0.3 bench
```bash
. "$HOME/.cargo/env"
cd src-tauri
cargo test --release --test spike_03 -- --nocapture --ignored bench_10k_files
```
Should print "indexed 10000 files in <Xms>" and assert it's < 5000ms.

### 2. (Optional) Run Spike 0.2 perf measurement
```bash
. "$HOME/.cargo/env"
pnpm tauri:dev
# In the running app:
#   1. Cmd+O → select test-fixtures/big.md (the 5MB fixture)
#   2. Wait for it to render
#   3. cat ~/Library/Logs/markup/perf.log  →  shows wysiwyg-load timing
#   4. Cmd+/ to toggle to source mode → log shows source-load timing
#   5. Type continuously in either mode; visual lag observation is your test
```

### 3. Unsigned release artifacts (already built)

The autonomous run built these for you:

| Artifact | Size | Path |
|----------|------|------|
| Binary | 9.6MB | `src-tauri/target/x86_64-apple-darwin/release/markup` |
| App bundle | 9.2MB | `src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Markup.app` |
| DMG | 4.8MB | `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/Markup_0.0.1_x64.dmg` |

**About the DMG**: Tauri's bundled `bundle_dmg.sh` uses AppleScript to
position icons in the DMG window — this **failed** during the autonomous
run because macOS demands interactive Automation permission for
`osascript` to control Finder, which can't be granted headlessly.

I worked around it by calling `hdiutil` directly to produce a basic
compressed DMG with no custom icon layout. **This DMG works** — open it,
drag the .app to Applications, done. The aesthetic "drag here ↘" arrow
is what's missing.

To produce the fancy layout DMG yourself (you'll get an Automation
permission prompt; click Allow):
```bash
. "$HOME/.cargo/env"
pnpm tauri:build
```

To rebuild the simple DMG:
```bash
cd src-tauri/target/x86_64-apple-darwin/release/bundle
hdiutil create -volname Markup -srcfolder macos/Markup.app \
  -ov -format UDZO -fs HFS+ dmg/Markup_0.0.1_x64.dmg
```

**First time you double-click the DMG**, macOS Gatekeeper will warn (no
signature). To suppress: System Settings → Privacy & Security →
"Open Anyway". For real distribution, use the signing script (step 4 below).

### 4. (Required for distribution) Sign + notarize
Before running:
1. Confirm you have a "Developer ID Application" certificate in Keychain
   (https://developer.apple.com/account → Certificates → +)
2. Generate an app-specific password at https://appleid.apple.com →
   Sign-In and Security → App-Specific Passwords. Name it `markup-notarize`.
3. Find your Team ID at https://developer.apple.com/account (top right).
4. Run once to store creds in keychain:
   ```bash
   xcrun notarytool store-credentials "AC_PASSWORD" \
     --apple-id "wangharp@gmail.com" \
     --team-id "<YOUR_TEAM_ID>" \
     --password "<APP_SPECIFIC_PASSWORD>"
   ```

Then:
```bash
./scripts/sign-and-notarize.sh
```

This handles: build release → re-sign with hardened runtime → submit to
notarytool → wait → staple. Output: signed + notarized DMG ready to share.

### 5. Replace placeholder icons
Current icons are a solid blue square (RGBA placeholder).
Drop a 1024×1024 PNG at `src-tauri/icons/icon-source.png` and run a real
icon-generation flow (e.g. `pnpm tauri icon`) before public release.

## What's NOT done (intentionally deferred)

- **Spike 0.2 quantitative numbers** — instrumentation is ready, but
  measuring 5MB doc load / input latency requires running the app and
  observing `perf.log`. Autonomous run can't drive the GUI.
- **Recent files menu** — easiest path is a localStorage list + ⌘P
  surfacing recents on empty query. Not blocking dogfood.
- **Rename / delete from file tree** — currently you can rename/delete
  in Finder; the watcher picks it up. Right-click context menu in the
  tree is M2.
- **External-edit reload prompt** — currently editing while the file
  is touched externally produces a `StaleMtime` error on save. The UX
  fix (banner offering to reload) is M2.
- **Outline panel** — defined as P1.
- **Focus / Typewriter mode** — defined as P1.
- **Mac App Store submission** — out of M1 scope (ADR-002 §三档需求).
- **Universal binary** — confirmed Apple Silicon-only build target during
  autonomous run, then corrected to x86_64-apple-darwin (your machine is
  Intel MBP 16"); see ADR-002 update.
- **Real icons** — placeholder is fine for self-use.
- **Migration of deprecated milkdown plugins** to `@milkdown/kit/plugin/*` —
  current versions still work; refactor as separate task.

## Risks identified

- **Xcode CLT is from 2020** (clang 11.0.3 / SDK 10.15.4). On macOS 26
  this is way out of date. Symptoms during autonomous run: `cargo build
  --release --target x86_64-apple-darwin` failed with `clang: error:
  invalid version number in '-mmacosx-version-min=12.0'` because the
  10.15.4 SDK can't target 12.0+. Worked around by lowering
  `minimumSystemVersion` to "10.15" in tauri.conf.json. Ironically this
  makes the binary MORE compatible (Catalina+).
  **To restore 12.0 target**: run `softwareupdate --list` then
  `softwareupdate --install --label "Command Line Tools for Xcode-..."`
  (needs admin). Or install the full Xcode.app from App Store. Then
  edit `src-tauri/tauri.conf.json` `minimumSystemVersion` back to "12.0".
- **88MB RSS** measured at idle (Spike 0.1). Sub-300MB target met
  comfortably. **NOT** measured under load (5MB doc + 10k vault).
- **Mermaid bundles 1.4MB** of flowchart-elk JS in the main chunk. May
  want to lazy-load in M2.
- **CSP** allows `'wasm-unsafe-eval'` for KaTeX/WebKit. Tighten in M3
  if security review flags it.
- **No tests for the React layer**. Pre-1.0, set up Vitest + Playwright.

## Files of note

| Path | Why it matters |
|------|----------------|
| `docs/decisions/ADR-001-tech-stack.md` | The selection rationale |
| `docs/decisions/ADR-002-distribution.md` | Signing strategy |
| `docs/research/05-spike-results.md` | Spike pass/fail log |
| `docs/research/spike-0.1-manual-test.md` | Step-by-step manual test |
| `scripts/sign-and-notarize.sh` | The Spike 0.4 walkthrough |
| `src-tauri/tests/spike_03.rs` | The 10k bench |
| `test-fixtures/big.md` | 5MB perf fixture (gitignored) |

## Commits

Local `main` is in sync with `origin/main` (https://github.com/oratis/Markup).

```
6415ca1 Lower minimumSystemVersion to 10.15; add bench scripts
1e03c34 Merge remote-tracking branch 'origin/main'   ← merged your LICENSE commit
d384fac Spike 0.3 measurements + STATUS.md wake-up brief
1b5eff0 M1 features: vault + multi-tab + source mode + menu + theme
bf32758 Initial commit                                ← yours, on remote
4116ec4 Initial scaffold: Tauri 2 + React + Milkdown skeleton
```

I did the merge with `--allow-unrelated-histories` because the local repo
was started with `git init` separately from the remote. Result: a single
unified main branch including the LICENSE.
