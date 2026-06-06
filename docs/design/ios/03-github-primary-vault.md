# iOS — GitHub as the primary vault (with a download-first reading pipeline)

> Status: **design proposal** (supersedes the "iCloud-first companion" entry model in
> [`00-ios-app-design.md`](./00-ios-app-design.md) §4; the reader, index, editor, and
> security-scoped File access in that doc are unchanged and reused).
> Scope: iOS app (`ios/MarkupApp`) + `MarkupKit`. No change to the macOS app.

## 0. The ask, restated

1. **A GitHub repository is a first-class vault.** The user taps / shares / pastes a
   GitHub repo and Markup opens it as a vault — browse its `.md` / `.html`, search,
   read with full fidelity.
2. **GitHub is the _primary_ channel.** iCloud Drive / Files (today's entry path)
   becomes the _secondary / auxiliary_ channel.
3. **Reading a GitHub doc must be as good as reading a local one.** Today a remote
   doc renders worse because relative images / CSS / links don't resolve. Fix it by
   **downloading the repo's docs (and the assets they reference) to a local working
   copy first, then opening that** — so the existing local-quality reader applies
   verbatim, and re-reads work offline.

## 1. Design principle — "materialize, then it's local"

The iOS app today is excellent at reading a **local folder**: `VaultStore` scans a
security-scoped folder, `IndexService` builds a SQLite FTS5 index, and `ReaderWebView`
renders each file through `ReaderHTML` with **bundled, offline** assets
(`marked` + KaTeX + Mermaid + highlight.js under `ReaderAssets/`), resolving relative
images/links against the folder root.

> The single most important decision: **a GitHub repo is opened by materializing a
> local working copy of its readable files + referenced assets, then handing that
> local root to the _existing_ pipeline.** Once materialized, GitHub content *is*
> local — so reading quality, search, outline, wikilinks, offline, and `.html`
> relative-asset resolution all come for free and stay identical across sources.

This avoids a parallel "remote renderer" with worse behavior, and it's why
download-first directly answers requirement #3.

## 2. Core abstraction — `VaultSource`

Today `VaultStore.rootURL` is a single security-scoped folder. Generalize to a
**source** that knows how to produce (and refresh) a **local root URL**:

```swift
enum VaultSourceKind: String, Codable { case files, icloud, appICloud, github }

protocol VaultSource: Identifiable {
    var id: String { get }                 // stable key (e.g. "github:owner/repo@ref")
    var kind: VaultSourceKind { get }
    var displayName: String { get }        // "oratis/Markup · main"
    var subtitle: String? { get }          // owner, branch, "iCloud Drive/Notes"
    var isEditable: Bool { get }           // Files/iCloud: true · GitHub (v1): false

    /// Local root that the rest of the app scans/indexes/reads.
    /// - Files/iCloud: the security-scoped folder itself (no copy).
    /// - GitHub: the materialized working-copy directory.
    func localRoot() async throws -> URL

    /// Bring the local copy up to date (no-op for Files/iCloud — the OS syncs).
    func refresh(progress: @escaping (SyncProgress) -> Void) async throws -> SyncResult
}
```

- `FilesVaultSource` / `iCloudVaultSource` — wrap the **current** behavior
  (`startAccessingSecurityScopedResource` + bookmark in `VaultStore`). `localRoot()`
  returns the folder; `refresh()` is a no-op (iCloud syncs the folder itself).
- `GitHubVaultSource` — materializes a working copy (§4) and returns it.
- The **app-owned iCloud vault** (`appICloud`) stays as an option for users who want
  Markup to own an editable, synced vault.

`VaultStore` becomes source-agnostic: it holds the *current* `VaultSource`, calls
`localRoot()`, and `scan()` / `rebuildIndex()` exactly as today. **No reader / index /
editor changes** to support GitHub — they only ever see a local folder.

## 3. The redesigned user journey

### 3.1 Home = **Sources** (the new primary surface)
Replaces "single folder, opened via picker." The Library home lists **sources** the
user has added, most-recent first:

```
┌─ Markup ───────────────────────────────┐
│  Sources                          ⊕ Add │
│                                         │
│  ◉ oratis/Markup            main  ↻ now │   ← GitHub (primary, avatar + branch)
│  ◉ obsidianmd/obsidian-help main  3h    │
│  ☁ iCloud Drive/Notes         synced    │   ← iCloud (secondary)
│  📁 Working Copy/blog                    │   ← Files provider (secondary)
│                                         │
│  Recently read ▸                        │
└─────────────────────────────────────────┘
```

Tapping a source opens it (its local root → the existing Library/file-browser →
Reader). **⊕ Add** presents the source picker:

```
Add a source
  ★ Open a GitHub repo            ← PRIMARY CTA (hero)
      paste a URL · browse · your repos
  ☁ Open an iCloud / Files folder ← secondary (today's document picker)
  ＋ Create a Markup vault in iCloud
```

### 3.2 First run (onboarding)
3 cards, ending on the **GitHub-first** CTA:
1. "Read any Markdown like a clean page."
2. "Open a GitHub repo — your docs, any open-source project." → **[Open a GitHub repo]**
   · small link: *or open an iCloud / Files folder*.
3. "Downloads for offline. Private by default."

### 3.3 "Open a GitHub repo" — the four entry points
We **cannot** claim Universal Links on `github.com` (we don't own the domain), so
"tap a repo and it opens in Markup" is delivered by:

1. **Share Extension (the headline "tap a repo" UX).** In Safari or the GitHub app,
   on any `github.com/{owner}/{repo}…` page: **Share → Open in Markup**. The extension
   parses the URL (§3.4) and hands the app a deep link. *This is the closest thing to
   "tap a GitHub repo to open it."*
2. **Custom URL scheme** `markup://` — `markup://github?repo=owner/repo&ref=main&path=docs`.
   Register `CFBundleURLTypes`. Lets our website / QR codes / other apps deep-link in.
   (Today `RootView.onOpenURL` only handles file URLs — extend it to parse `markup://`.)
3. **Paste / type in-app** — a field that accepts `owner/repo`, a full
   `https://github.com/...` URL, or `git@github.com:owner/repo.git`.
4. **Browse in-app** — search public repos (`GET /search/repositories`), and — once
   signed in (§6) — list **your** repos and **starred** repos.

> Later: Universal Links on **our** domain (`markup.app/open?...` → redirect) and a
> Safari Web Extension "Open in Markup" button. Not required for v1.

### 3.4 URL shapes we accept
Parse every common GitHub URL into `{owner, repo, ref?, subPath?, file?}`:

| URL | Opens as |
|---|---|
| `github.com/o/r` | repo at default branch, root = repo root |
| `github.com/o/r/tree/main` | repo at `main` |
| `github.com/o/r/tree/v1.2/docs` | **subdir `docs` as the vault root** (great for monorepos) |
| `github.com/o/r/blob/main/README.md` | repo opened + that file focused |
| `o/r` / `o/r@ref` | shorthand |

Opening a **subdirectory as the vault root** is the key escape hatch for huge
monorepos — you don't download the whole repo, just the docs subtree (§4).

### 3.5 The open animation
On "open repo": resolve ref → fetch tree → **show the file browser immediately** from
the tree metadata (names/sizes, before blobs arrive) with a top progress bar
("Downloading 42 docs… 18/42"). Text docs stream in; tapping one that's already
downloaded opens instantly, one that isn't shows a tiny per-file spinner then renders.
Background-prefetch the rest. Subsequent opens are instant and offline.

## 4. GitHub → local working copy (the download pipeline)

### 4.1 What we download
- **Eagerly (small, enables index + instant reads):** every `*.md/.markdown/.mdx/.mkd`,
  `*.html/.htm`, `*.canvas`. These are tiny; downloading all of them up front gives a
  full FTS5 index and offline reading.
- **Lazily, on demand, then cached:** **assets referenced by a doc** — images
  (`png/jpg/jpeg/gif/svg/webp`), and for `.html`, its relative `<link>/<script>/<img>`
  targets. Resolved by scanning a doc when it's opened (or pre-scanning during the
  eager pass) and fetching only what it references. Never bulk-download binaries.
- **Never:** files over a size cap, LFS pointers' payloads (show a "stored in Git LFS"
  placeholder), `.git`, anything outside the chosen subPath.

### 4.2 API surface (minimal)
| Need | Call | Notes |
|---|---|---|
| default branch / repo meta | `GET /repos/{o}/{r}` | also private-vs-public, size |
| full file list + blob SHAs | `GET /repos/{o}/{r}/git/trees/{sha}?recursive=1` | one call; `truncated` → fall back to per-dir `contents` walk for monorepos |
| a file's bytes | `https://raw.githubusercontent.com/{o}/{r}/{sha}/{path}` | **raw host, not the API** — CDN-fast and **not** counted against the 60/hr API rate limit |
| (private) file bytes | `GET /repos/{o}/{r}/contents/{path}?ref={sha}` (base64) or git blobs API | needs token; used only for private repos where raw needs auth |
| search repos | `GET /search/repositories?q=` | browse entry point |

Pinning to the tree **SHA** (not the branch name) makes the working copy immutable +
content-addressable and lets "pull latest" diff cleanly.

### 4.3 On-disk layout
```
<App Support>/Sources/
   sources.json                       # registered VaultSources (persistent, cheap)
   github/{owner}/{repo}/
       manifest@{treeSha}.json        # path → blobSha, size, type, downloaded?
       index.sqlite                   # FTS5 index (rebuildable)
<Caches>/Blobs/{sha[0:2]}/{sha}        # content-addressed blob store (OS-evictable)
<App Support>/Sources/github/{o}/{r}/worktree@{treeSha}/   # path-mirrored working copy
       docs/guide.md   →  (hardlink/copy of Blobs/<sha>)
       docs/img/x.png  →  (hardlink/copy of Blobs/<sha>)
```
- **Manifest + index in App Support** (persistent — survive cache eviction; re-download
  is cheap and integrity-checked by SHA).
- **Blobs in Caches** (evictable). The **worktree** mirrors repo paths so the reader's
  relative `<img src>` and `.html` `loadFileURL(allowingReadAccessTo: worktreeRoot)`
  resolve exactly like a local vault. Use APFS clonefile/hardlink from the blob store
  → no duplicate bytes.
- **Integrity:** each blob verified against its Git SHA (`sha1("blob "+len+"\0"+bytes)`).
- **Atomic:** download to a temp file, fsync, then link into the worktree — never a
  half-written doc (mirrors the desktop's atomic-write discipline).

### 4.4 Why this makes GitHub reading == local reading
- The reader gets a **local file URL** inside a path-mirrored worktree → relative
  images, relative links, and `.html` relative CSS/JS all resolve via the existing
  `ReaderWebView(fileURL:, readAccessURL: worktreeRoot)`.
- Wikilinks / embeds (`[[file]]`, `![[img]]`) resolve through the existing
  `Wikilink.findVaultFile` over the worktree.
- **Cross-file navigation:** a relative link to another repo doc (`./other.md`,
  `../api/x.md`) is intercepted in the WebView and opened **in the in-app reader**
  (downloading that doc on the fly if needed) instead of navigating the WebView away.
  External `http(s)` links → open in Safari.
- Everything is on disk → **fully offline** after first sync; search/outline/backlinks
  build from the same local index.

## 5. Refresh / freshness / sync
- A GitHub source pins to a **ref** (branch/tag/commit). Header shows
  `main · synced 3h ago`.
- **Pull latest:** re-resolve the branch HEAD → new tree SHA → diff manifests →
  download changed/added blobs, drop deleted, re-point the worktree, **incrementally
  reindex** only changed docs. Show "↻ 4 updated".
- **Branch/tag switcher** in the source header.
- **Auto-refresh:** light check on open if online and stale (> N hours), plus a manual
  pull. Background-fetch (already in the entitlements plan) can pre-warm pinned sources.
- **Conflict-free:** GitHub sources are read-only in v1 (§7), so refresh never fights a
  local edit.

## 6. Auth & rate limits
- **Public repos: no auth.** Tree = 1 API call; blob bytes come from
  `raw.githubusercontent.com` (CDN, not API-rate-limited). The unauthenticated 60/hr
  API budget is ample for opening + browsing many public repos.
- **Private repos & headroom:** **GitHub OAuth Device Flow** (no client secret on
  device — user enters a code at github.com/login/device), read-only `repo` scope,
  token in the **Keychain**. Authenticated raises the API limit to 5,000/hr and unlocks
  private repos (private blobs fetched via the authenticated contents/blobs API).
- Ship **public-first** (G1); add auth in G5.
- Handle 403 rate-limit (show reset time, offer sign-in) and 404-vs-403 (private repo
  without access → "Sign in to open private repos").

## 7. Editing semantics
- **GitHub sources are read-only in v1** (the app is reader-first; matches "great
  reading experience" as the goal). The edit affordance is hidden for GitHub docs.
- **iCloud / Files sources stay fully editable** (today's UITextView editor, autosave,
  mtime guard) — that's the user's *own* working vault.
- **Later (G6+):** "Edit a copy" → fork-less PR via the API (needs write scope), or
  "Save to my iCloud vault." Out of scope here; called out so the model is forward-compatible.

## 8. iCloud's role in the new model (secondary, not gone)
iCloud/Files is reframed, not removed:
- **GitHub = read the world** (open-source docs, any project's `/docs`, your repos'
  knowledge) — the primary, low-friction, "just paste a URL" path.
- **iCloud/Files = your private, editable vault** synced across *your* devices (the
  desktop companion path). Secondary, but the home for writing.
Both appear in the same **Sources** home; the user fluidly moves between "reading a
repo" and "writing in my vault."

## 9. What changes in code (delta on M0–M4)
| Area | Change |
|---|---|
| `VaultStore.swift` | Hold a `VaultSource` instead of a bare `rootURL`; `open(source:)` calls `source.localRoot()` then the existing `scan()`/`rebuildIndex()`. Multi-source registry persisted to `sources.json`. |
| **new** `Sources/VaultSource.swift` | Protocol + `FilesVaultSource` / `iCloudVaultSource` wrapping today's bookmark logic. |
| **new** `Sources/GitHubVaultSource.swift` | Implements `localRoot()`/`refresh()` over the §4 pipeline. |
| **new** `MarkupKit/GitHub/*.swift` | Pure (testable, no UIKit): URL parsing (§3.4), tree/manifest model, blob-SHA verify, asset-reference scanner (md image refs + html `<link>/<script>/<img>`), manifest diff. Mirrors the existing "port pure logic into MarkupKit + tests" pattern. |
| **new** `Sources/GitHubClient.swift` | `URLSession` calls (§4.2), Keychain token, rate-limit handling. |
| `RootView.swift` | New **Sources** home; extend `onOpenURL` to parse `markup://`; route Share-Extension hand-offs. |
| **new** Share Extension target | Receives a `github.com` URL → writes a deep link to a shared App Group → opens the app. |
| `Info.plist` / entitlements | Add `CFBundleURLTypes` (`markup`), an **App Group** (extension ↔ app), and the **outbound network** usage (App Review: declare it; was previously "no network"). |
| `ReaderWebView.swift` | Add a navigation-policy delegate to intercept in-repo relative links → in-app reader; external → Safari. (Bundled-asset scheme unchanged.) |
| `ReaderHTML.swift` | No change needed — it already renders local content with the bundled assets; relative refs resolve via the worktree. |
| `SettingsView.swift` | Per-source: branch, "Pull latest", storage used, "Remove source", "Clear cache"; global cache cap. |

## 10. Storage management
- Manifest + index = **persistent** (App Support); blobs = **evictable** (Caches) with
  LRU + a per-app cap (e.g. 500 MB) + per-source size shown in Settings.
- "**Make available offline**" pin per source → its blobs are protected from eviction.
- "**Clear cache**" drops blobs but keeps registered sources (re-download on next open).

## 11. Edge cases & risks
- **Monorepos / `truncated` trees:** prefer opening a **subPath** as root; if the
  recursive tree is truncated, walk `contents` per directory under the subPath only.
- **Git LFS:** detect pointer files → placeholder "stored in Git LFS (not downloaded)".
- **Huge / binary files:** size cap; never eagerly fetch non-text, non-referenced blobs.
- **Submodules / symlinks:** show as non-openable entries (don't traverse).
- **Rate limit (403):** surface reset time + "Sign in for higher limits."
- **Private 404 vs 403:** map to "Sign in to open private repos."
- **Branch deleted / force-push:** pinned tree SHA still reads from cache; "pull" detects
  the branch moved and offers to re-pin.
- **Untrusted HTML/JS from arbitrary repos:** the reader WebView is sandboxed, loads
  `file://` scoped to the worktree, and exposes **only** the minimal scroll/task
  message handlers — no privileged native bridge. Keep it that way; never widen the
  bridge for GitHub content.
- **Path safety:** reject `..`/absolute paths from the tree; everything stays inside the
  worktree dir.
- **Partial/failed downloads:** atomic link-in; a missing blob shows a retry affordance,
  never a broken render.

## 12. Privacy / App Review
- Network is now used → update the iOS privacy notes + the repo
  [`PRIVACY.md`](../../../PRIVACY.md): requests go only to `api.github.com`,
  `raw.githubusercontent.com`, `codeload.github.com`; **no analytics, no account unless
  the user signs in**; tokens stay in the Keychain. Still "Data Not Collected."
- OAuth via the system browser (ASWebAuthenticationSession) / device flow — no embedded
  web login. Read-only scope.

## 13. Milestones (G-series, on top of shipped M0–M4)
- **G0 — Source abstraction.** Refactor `VaultStore` onto `VaultSource`; Files/iCloud
  become sources; new **Sources** home. No behavior change, no network. (Pure refactor +
  MarkupKit tests.)
- **G1 — GitHub read MVP (public).** Paste `owner/repo`/URL → resolve ref → tree →
  materialize text docs → open as a vault, read with full parity, offline after sync.
  `markup://` deep link. **This delivers the headline ask.**
- **G2 — Share Extension + URL shapes.** "Open in Markup" from Safari/GitHub; `tree`/
  `blob`/subdir parsing (subdir-as-root).
- **G3 — Asset & link fidelity.** Image + html relative-asset download into the
  worktree; in-repo link interception → in-app reader. (Directly closes the
  "GitHub html/md worse than local" gap.)
- **G4 — Refresh & cache.** Pull latest, branch switcher, freshness UI, incremental
  reindex, eviction + offline pin + per-source storage UI.
- **G5 — Auth.** OAuth device flow → private repos + 5,000/hr; Keychain token; rate-limit
  states.
- **G6 — Polish / forward.** Search across all sources, large-repo ergonomics, and the
  groundwork for "edit a GitHub doc → PR / save to iCloud."

## 14. Acceptance (what "done" feels like)
- Paste `https://github.com/oratis/Markup` (or Share from Safari) → within a second the
  file browser shows the repo's docs; tapping `README.md` renders with code highlight,
  math, diagrams, and **working images/links** — indistinguishable from a local file.
- Airplane mode → the repo is still fully readable.
- "Pull latest" picks up new commits; only changed docs re-download.
- iCloud/Files vaults still open and **edit** exactly as before, alongside GitHub
  sources in one home.

## 15. Pro/con debate & decision log

Each contested decision is steelmanned both ways, then ruled. "Ruling" is the
recommendation we proceed on (open questions resolved per the author's call).

### D1 — How to materialize a repo: per-file-on-demand vs **zipball** vs tree+blob
- **Per-file Contents API (what shipped today).** _For:_ trivial — one file = one
  `GET …/contents/{path}` → `/tmp`; no state machine; lazy by nature. _Against:_ a
  doc's images/CSS/sibling links have **no on-disk neighbours** → they 404 (this is
  literally the "GitHub worse than local" complaint); N API calls re-hit the 60/hr
  unauthenticated limit on every open; `/tmp` files leak; **no offline**.
- **Zipball + unzip (codeload).** _For:_ **one** request gets the *entire* repo, so
  every relative image/CSS/link resolves with zero per-asset logic; atomic; offline
  immediately; not API-rate-limited; a path-mirrored worktree falls out for free.
  _Against:_ downloads the whole repo incl. binaries (wasteful for big monorepos);
  refresh = re-download the whole zip (no incremental); unzip cost/memory.
- **Git-tree + per-blob (the design's §4).** _For:_ download only docs (small),
  subdir-as-root cheap, content-addressed dedup, **incremental** refresh by SHA diff.
  _Against:_ most logic to build (manifest, blob fetch, asset scan, partial-state);
  metadata calls hit the API limit.
- **Ruling.** Target **zipball as the default working-copy** (best
  reading-experience-per-effort: complete assets, offline, atomic) with a **size
  guard** + a **subdir-as-root via the per-dir Contents API** escape hatch for huge
  monorepos; keep **per-file-on-demand** only as the bridge that already ships. The
  design's tree+blob+manifest is **not** the v1 path — fold it into a *later*
  incremental-refresh optimization, not the MVP. (Updates §4: prefer zipball; §13: G3
  = "zip the repo + resolve assets," G4 = incremental.)

### D2 — GitHub **primary** vs iCloud primary
- _For GitHub-primary:_ zero-setup "read the world" (any open-source `/docs`, your
  repos), inherently shareable ("open this repo in Markup"), differentiates from every
  generic iCloud reader, and is the natural top-of-funnel.
- _For iCloud-primary:_ editing/owning notes is the deep value; GitHub repos are
  read-mostly; most people's private notes aren't on GitHub; no Universal Links on
  github.com hurts the "tap a repo" dream.
- **Ruling.** **GitHub = acquisition/top-of-funnel** (shareable, instant, the hook);
  **iCloud/Files = retention/creation** (your editable vault). Both first-class in one
  **Sources** home. Keep GitHub primary, as asked.

### D3 — GitHub vaults **read-only** (v1) vs editable
- _For read-only:_ a temp/unzipped copy isn't a write-back target; no merge/PR/auth-
  write complexity; refresh never clobbers a local edit; matches reader-first.
- _For editable:_ "open as vault" implies writability; users want to fix a typo.
- **Ruling.** **Read-only in v1** (matches shipped). Surface the state explicitly. Path
  forward: "Edit a copy → save to my iCloud vault," then a PR flow (needs write scope).

### D4 — Entry point: **paste/browse first**, Share Extension later
- _For Share Extension first:_ closest to the literal "tap a repo in Safari → open."
  _Against:_ extra target + App Group, clunkier, lower discoverability than in-app.
- _For paste/browse first:_ already shipped; lowest friction; works for signed-in
  users' own repos.
- **Ruling.** Ship **paste + browse + your-repos** (done); land the **`markup://`
  scheme now** (near-zero cost, unblocks QR/website/deep-links); add the **Share
  Extension in G2**. Sequence: paste/browse → scheme → Share Extension.

### D5 — Auth: **OAuth Device Flow** (shipped) vs PAT vs none
- **Ruling.** Keep **device flow** (no client secret on device, no embedded web login);
  **public-first** (anonymous), device-flow unlocks private + 5,000/hr. Correct as-is.

### D6 — Storage: Caches (evictable) vs App Support (persistent); and `/tmp` leaks
- **Ruling.** Working copy in **Caches** (re-downloadable), source registry + recents in
  **App Support**; offline-pin protects from eviction. **Fix the `/tmp/gh-*` leak**:
  write into a managed per-repo cache dir and reap on close / size cap. (The shipped
  `/tmp` writes with no deletion are a privacy + disk leak — see §16.)

### D7 — Untrusted HTML/JS from arbitrary repos
- **Ruling.** Standing constraint: the reader WebView stays sandboxed, loads `file://`
  scoped to the worktree root, exposes **only** the minimal scroll/task message
  handlers, and never widens the bridge for GitHub content. External links open in
  Safari (never navigate the reader WebView away).

## 16. Reconciliation with the shipped implementation (2026-06)

The iOS app **already ships** a working GitHub path that diverges from this doc's
original §4. Correcting the record so the doc matches reality:

| Aspect | This doc (original) | **Shipped today** | Action |
|---|---|---|---|
| Download | tree + per-blob | **per-file Contents API → `/tmp/gh-*` per open** (`GitHubService.swift:29-52`) | Move to **zipball working copy** (D1); per-file is the bridge |
| Working copy | path-mirrored worktree + manifest | none (single temp file) | Build in G3 |
| Auth | device flow | **device flow shipped** (`GitHubDeviceFlow.swift`, `GitHubAuth.swift`) | ✅ keep |
| URL parsing | all github.com shapes | **shipped** (`GitHubLink.swift` / `GitHubLinkParser`) | ✅ reuse |
| Sources model | `VaultSource` protocol + Sources home | three separate paths (VaultStore / GitHubService / Recents) | G0 unify |
| `markup://` scheme | yes | **not registered** (`Info.plist` has no `CFBundleURLTypes`) | land now |
| Share Extension | yes (headline UX) | **none** | G2 |
| In-repo link nav | intercept → in-app / Safari | **none** — `ReaderWebView` `decidePolicyFor` always `.allow` (`:184-192`); links silently fail | **G3 — see below** |
| Asset resolution | download referenced assets | **none** — images/CSS 404 | **G3 — see below** |

### The two gaps that most hurt reading (and the first concrete step)
1. **Broken images / unstyled HTML** — referenced assets have no on-disk copy.
2. **Links silently fail** — no classification of in-repo vs external; the WebView
   nav-policy always allows, so relative links navigate nowhere and external links
   don't reach Safari.

Both are downstream of **one pure operation**: _given a doc, find every referenced
URL and classify it (in-repo relative path · external · anchor)._ That operation is
the highest-ROI, zero-collision, fully testable next step — it feeds **both** the
asset-download queue (G3) and the WebView link-interception policy, and it lands as a
pure `MarkupKit` module with no UI changes. **First step:** `DocReferences` in
`MarkupKit` (markdown + HTML reference scanner + relative-path resolver/classifier),
with `swift test` coverage. (Implemented alongside this doc.)

---

## 17. Implementation status — shipped (2026-06)

The download-first pipeline and the repos-as-vault target are **shipped and
device-verified**. Both reading gaps named in §16 are closed.

| Capability | PR | Notes |
| --- | --- | --- |
| `DocReferences` scanner (pure) | #103 | markdown/HTML ref scan + classify/resolve, tested |
| `markup://github?…` deep links + scheme registration | #104 | repo-root → vault, sub-folder → browse, file → reader |
| External links → system handler (Safari/Mail/Phone) | #104 | `ReaderWebView` nav policy; closes gap #2 (external half) |
| Managed download cache (no `/tmp` leak) | #104 | `<caches>/MarkupGitHub/` |
| **Working copy: doc + in-repo assets materialized** | #105 | `GitHubAssetPlan` + `loadFileURL(allowingReadAccessTo:)`; **closes gap #1** (images/CSS) |
| **In-repo link interception** (tap → open in-app) | #106 | closes gap #2 (in-repo half); pushes deeper docs on the nav stack |
| **Repo → vault (zipball working copy)** | #107 | `GitHubZipball` strip + `openAsVault` → `VaultStore.openLocalVault`; full sidebar/search/index, offline |
| Hardening (10 of 11 adversarial-review findings) | #108 | atomic extract, off-main decompress, zip64 fail-loud, `owner/ref/repo` vault path, 403-vs-rate-limit, surfaced in-repo errors |

**On-disk layout (as built):** `<App Support>/GitHubVaults/<owner>/<refSlug>/<repo>/…`
(separate path components — unambiguous, ref-keyed, repo name as the display leaf).
Per-file working copies for single-doc opens live under `<caches>/MarkupGitHub/<id>/…`.

### Deferred follow-ups (tracked)
- **In-vault Markdown image fidelity** — `ReaderView`'s markdown read path still uses
  `loadHTMLString` (shared with user folders); for app-owned GitHub vaults it should
  render to a sibling `.html` + `loadFileURL` like the single-doc path. Single-doc
  reading already renders images correctly.
- **Cross-doc `#fragment` scrolling** (review #7) — intercepted in-repo links open the
  target at the top; honoring the fragment needs a GitHub-slug → `mk-h{n}` heading map.
- **Incremental refresh** — `RepoManifest` + `ManifestDiff` (git-trees API) to fetch
  only changed files instead of re-downloading the whole zipball; plus a Refresh action.
- **Offline reuse on re-open** + storage eviction policy for `GitHubVaults/`.
- **Share Extension** (G2) and a unified `VaultSource`/Sources home (G0) remain as in §13.

---
_Companion docs: [`00-ios-app-design.md`](./00-ios-app-design.md) (reader/index/editor
architecture, reused wholesale) · [`02-html-support.md`](./02-html-support.md) (faithful
`.html` rendering)._
