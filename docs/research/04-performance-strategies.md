# 04 — Performance Strategies for "MarkUp"

> Research scope: how to make a Mac-native, Typora-style Markdown editor that stays fast on 10 MB / 100k-line files, 10k-file vaults, and long editing sessions. Compares the realistic cost/benefit of [Tauri + ProseMirror + Rust comrak] vs [Electron + ProseMirror + JS markdown-it].

---

## 1. Large File Rendering

### 1.1 The problem (and why naive rendering fails)

Rendering a 10 MB markdown file naively means parsing ~100k tokens, building ~100k DOM nodes, and asking the browser to lay them all out. The bottleneck is almost never the parser — it's the DOM. Markdown Monster's docs explicitly identify this: "Performance slowdown is due to the time it takes to render the large HTML document in the preview browser — it's the time the HTML DOM takes to refresh." A naive React+remark setup chokes well before 1 MB; the remark-js maintainers themselves recommend virtualization for "very large texts."

### 1.2 Virtual scrolling / viewport rendering

Industry-standard fix. Only render what's in the viewport plus a small overscan buffer; replace off-screen content with a single height-preserving spacer.

- **CodeMirror 6** does this natively. Off-screen lines are replaced by a `cm-gap` element that occupies the correct vertical height. The official "huge doc" demo loads files of several million lines and still scrolls smoothly. CodeMirror's parser is also explicitly designed to "limit the amount of work it does to avoid wasting too much battery and memory" — it parses lazily from the viewport outward.
- **ProseMirror** does NOT virtualize by default. There is a long-standing community thread "Lazy rendering for ProseMirror" — it's possible but you implement it (typically by replacing far-off blocks with placeholder nodes whose decoration carries the rendered height). For a Typora-style WYSIWYM where the source-of-truth IS the editor, this matters: you pay the full DOM cost unless you build lazy rendering yourself.
- **react-window / @tanstack/virtual** are fine if your preview is a list of pre-rendered HTML blocks (one per top-level markdown block). They are NOT a fit for a single contenteditable editor pane — selection, IME, and cursor logic break across virtualized boundaries.

**Chunk size matters.** A practical writeup ("How I Render 10MB Markdown Files in the Browser", igorstechnoclub.com) found ~140 KB per chunk to be the sweet spot: smaller chunks cause DOM churn on scroll and complicate cross-chunk anchors; larger chunks slow per-chunk parse and layout.

**Recommendation for MarkUp:** Use CodeMirror 6 for the source-mode editor (free virtualization), and for the WYSIWYM rendered view either (a) accept ProseMirror's full-render cost up to ~1 MB and gate larger files into a "large file mode" that drops to a CodeMirror source view, or (b) invest 1–2 weeks in a ProseMirror lazy-block decoration plugin.

### 1.3 Incremental parsing

Re-parsing the entire document on every keystroke is the second-worst thing you can do (after re-rendering it). Three approaches:

- **markdown-it token cache.** A common technique: store the line offset where the last edited block begins, re-tokenize only from there to end-of-document. The "Building Incremental Markdown Compiler" writeup reports this can drop large-doc parse time to "always sub-1 ms" regardless of total size, and maintain 60 fps with 20k-character documents.
- **tree-sitter.** General-purpose incremental parser. 2026 benchmarks: parses a 10k-line C file in <100 ms full-parse, and incremental edits run in roughly O(edit-size) — claims of "up to 70% reduction vs full re-parse" in large codebases. There IS an official tree-sitter-markdown grammar; using it gives you a real CST you can re-use for syntax highlighting, folding, and outline.
- **ProseMirror's transaction/Step model.** Edits are small `ReplaceStep`s carrying just the changed range. The editor never re-parses — the *document model is the source of truth*, and Markdown serialization happens only on save/export. This is the architecturally cleanest answer for a WYSIWYM editor and is why ProseMirror feels instant even on long docs.

**Recommendation:** Treat the ProseMirror doc as canonical (no re-parsing on keystroke). Re-parse from markdown text only on file open, paste-as-markdown, and external file change. Use markdown-it (or comrak) one-shot, on a Worker, for those events.

### 1.4 WebWorker parsing

Moving parse off the main thread keeps the UI at 60 fps even when a 5 MB paste lands. web.dev's guidance: workers are the right tool when "computationally expensive work … would otherwise cause long tasks that make the page unresponsive" and hurt INP. The catch: postMessage of parsed token trees involves structured-clone overhead — for a 5 MB doc this is non-trivial (tens of ms). Mitigations: send already-rendered HTML strings back (one allocation) rather than token arrays; use Transferable `ArrayBuffer` for binary representations.

### 1.5 WASM vs JS parsers — benchmark data

- **rusdown** (pulldown-cmark compiled to WASM): "3x faster than markdown-it" per its README.
- **markdown-wasm** (MD4C → WASM): "twice as fast as the best JavaScript Markdown parser" per InfoQ.
- **comrak-wasm** (comrak Rust → WASM): comparable to pulldown-cmark, slower than MD4C but with full GFM compatibility (tables, task lists, footnotes, autolinks) matching GitHub's renderer exactly.
- **markdown-it (pure JS)** is the slowest of the four but the most extensible — its rule/plugin ecosystem is the largest in the JS world.

Practical numbers from the field: a single 1 MB markdown doc parses in roughly 5–15 ms with comrak/pulldown-cmark-wasm vs 20–50 ms with markdown-it on a modern Mac. The WASM win matters most for first-open of big files; on a steady-state edit loop with incremental parsing, both are <1 ms and the difference is invisible.

**Recommendation for MarkUp:**
- **Tauri stack:** call native `comrak` directly via Rust IPC. No WASM overhead, full GFM, ~2-3x faster than markdown-it. Best perf possible.
- **Electron stack:** ship comrak-wasm or markdown-wasm in a Worker for cold opens; use markdown-it (or its tokens cached in the ProseMirror doc) for the live-edit loop.

### 1.6 What VSCode does with truly huge files

VSCode applies `editor.largeFileOptimizations` (default on, threshold ~20 MB): disables tokenization (so syntax colors), word-wrap recomputation, certain language features. It does NOT force plain-text mode automatically — it just degrades non-essential features. The community has filed multiple issues asking for *more* features to be disabled (folding, link providers) because language servers still struggle.

**Borrowing for MarkUp:** above some threshold (suggest 5 MB or 50k lines), drop to a CodeMirror source view with syntax highlighting only — no live preview, no WYSIWYM rendering, no link/image preview, no outline. Show a one-line banner "Large file — preview disabled" with a button to re-enable manually. This is a pure win: rare case, easy to implement, prevents the worst UX.

---

## 2. Source ↔ Preview Scroll Sync (and Token-to-DOM Mapping)

If you go split-pane (source on left, rendered on right) the scroll positions must stay aligned. The standard pattern:

1. **Build a position map at parse time.** For every top-level markdown block (heading, paragraph, list item, code fence) record `{sourceLine, previewElement}`. markdown-it exposes `token.map = [startLine, endLine]` on every block token — read those and tag the rendered DOM nodes with `data-source-line`.
2. **On scroll, find the anchor block** whose top is at the viewport top in the active pane, compute its fractional position within that block, look up the corresponding block in the other pane, scroll the other pane to the same fractional position.
3. **Cache the map**, invalidate on edit. Joplin's PR #5512 ("Sync-Scroll for Markdown Editor and Viewer") and vincentcn/markdown-scroll-sync both implement exactly this; the algorithm is well-known.

For ProseMirror specifically — since the doc IS the source of truth — `tr.mapping.map(pos)` gives you up-to-date position mapping through edits for free. The trickier part is that in pure WYSIWYM there's no separate source pane to sync to; sync only matters in the split-pane "developer mode."

**Recommendation:** Implement sync via `data-source-line` attributes emitted by the markdown-it/comrak renderer. Cache the line-to-element map; rebuild it on every render (cheap because rendering is what just produced the DOM).

---

## 3. File Management Performance (10k-file vaults)

This is where Obsidian and Logseq visibly fail. Real reports from their forums:

- Obsidian: 10k-file vault → **~20 min to fully index** on a top-end laptop; 50k notes + 40k attachments on mobile → **~3 min vault load + ~27 min reindex**.
- Logseq: "10,000 pages renders Logseq unusable"; 30k+ files in a >300 MB graph → **fails to launch**; 2k pages on HDD → **10+ minute startup**.

These numbers are surprisingly bad and almost entirely due to building too much in JavaScript at startup. MarkUp can do dramatically better.

### 3.1 File tree rendering

A flat list of 10k file rows is fine with virtual scrolling (react-window / @tanstack/virtual / Solid Virtual). For tree views, lazy-expand only the children of opened folders — never read directories you don't need to display. Cache mtime + size in memory; only stat changed paths.

### 3.2 Full-text search — concrete benchmarks

| Engine | Where it runs | Index cost | Query latency | Scale |
|---|---|---|---|---|
| **ripgrep (subprocess)** | Native binary | Zero (no index) | 0.082 s on 75k Linux kernel files; ~5–13× faster than grep. | Up to ~100k files comfortably. >1 M files: 15+ s per query. |
| **SQLite FTS5** | In-process (native or sql.js) | Linear in corpus, fast | Sub-ms to low-ms for typical queries with BM25 ranking | Hundreds of thousands of docs comfortably; battle-tested |
| **Tantivy** | Native Rust | Sub-second to "index entire corpus in a fraction of a second" | Lucene-class; sub-ms typical | Millions of docs |
| **Orama (JS)** | In-browser / JS | All in memory | Reports "sub-50 ms" with filtering+ranking; built-in `21µs`-class measurements in trivial cases | Tens of thousands; memory-bound |
| **Lunr.js** | In-browser | Slow to build, must serialize | Single-digit ms typical | <10k docs realistically |

**Recommendation for MarkUp:**
- **Tauri:** Tantivy in Rust. Best perf, sub-second initial index for 10k files, low memory, multi-language tokenization, BM25 ranking out of the box. Wire to JS via a single `search(query)` IPC call.
- **Electron:** SQLite FTS5 via `better-sqlite3`. Synchronous, no IPC overhead, BM25 built in. For "search across vault" UX the latency is identical to Tantivy in the cases users notice.
- **ripgrep as fallback** in either: shell out for "find in files with regex" power-user mode where literal matching beats indexed semantics. Don't make it the primary path — index walking beats whole-corpus regex on every query after the first.

### 3.3 Indexing strategy

- **Initial scan:** Walk the vault async, parallelized (Rust's `walkdir` + rayon, or Node's `fast-glob`). On a 10k-file vault this is <500 ms reading mtime+size only, and 2–5 s reading and indexing full content. Show progress.
- **Incremental updates:** Watch the vault root with FSEvents on macOS (chokidar uses it natively, Tauri's `notify` crate uses it natively). Reindex only changed files. Debounce 200–500 ms — editor-saves arrive in bursts.
- **Persist the index** to disk so cold starts are fast. SQLite/Tantivy both do this trivially. Re-validate by mtime on startup.

### 3.4 Metadata caching (front matter, links, headings)

Compute once at index time, store in SQLite (or alongside Tantivy) with the FTS row. Front-matter parsing with `gray-matter` (JS) or `serde_yaml` (Rust) is sub-ms per file. Link graph for backlinks: store `(from_path, to_path, link_text)` triples, indexed by both columns — backlinks query is then a single equality lookup.

### 3.5 What Obsidian and Logseq do (and where they pay)

- **Obsidian** keeps the entire metadata cache in memory (`metadataCache.json`); good for queries, but it's why the initial load is so slow on big vaults — the JS has to deserialize tens of MB of JSON on startup. The actual file-content search is fast once warm.
- **Logseq** stores blocks in DataScript (in-memory Datalog DB); it's very expressive but doesn't paginate, so the working set must fit in memory and startup means parsing every block. Hence the >300 MB graph cliff.

The lesson: **persist the index to a real disk-backed store (SQLite, Tantivy), don't try to JSON-serialize it.**

---

## 4. Editor Kernel Performance

### 4.1 ProseMirror vs Lexical — measured

The Emergence Engineering stress test is the cleanest public benchmark. Headline:

- **Lexical, large doc, single-character insert/delete latency: ~1 second.** Confirmed by Facebook/lexical issue #7422 ("Extremely slow performance in big documents"). The history plugin stores all editor states without compression — heap grows monotonically, hit ~3.9 GB after 23 minutes of testing.
- **ProseMirror, same scenario: near-instant** (single-digit ms or below). Heap stayed in 6–18 MB band with no leak.

In short: Lexical is faster cold-start and feels snappy on a 1-page note, but degrades fast under heavy use. ProseMirror is slightly heavier per-keystroke at small sizes but completely flat as document size grows. **For a power-user Markdown editor with long sessions, ProseMirror wins decisively.**

### 4.2 CodeMirror 6 vs Monaco

- **CM6** is purpose-built for low memory and large files. Viewport-only DOM, lazy parser, ~200 KB minified core. Demo handles million-line files.
- **Monaco** is the VSCode editor lifted as a library. Much heavier (~2 MB+ minified, more memory per buffer), but vastly more language-server-aware. For a Markdown editor the LSP machinery is dead weight.

**Recommendation:** CM6 for the source-mode editor and any code-fence sub-editors. Monaco brings nothing you need.

### 4.3 Input latency target

The relevant target is "keypress to next paint" ≤ 16.6 ms (60 Hz). On a Mac with ProMotion you can target 8.3 ms (120 Hz) — Tauri 2 even has a community plugin (`tauri-plugin-macos-fps`) to lift WKWebView's default 60 Hz cap. Both ProseMirror and CodeMirror 6 hit 16 ms easily on documents up to ~50k words. Above that, ProseMirror's transaction-mapping overhead can creep above 16 ms in pathological cases (deeply nested lists, hundreds of marks); use lazy block rendering before you hit that.

---

## 5. Startup Time

### 5.1 Cold vs warm

macOS keeps recently-used app pages cached; warm starts are typically 30–50% of cold. For benchmarking, always measure cold (purge first).

### 5.2 Electron — what's possible

Per multiple production case studies (Atom, Notion, Slack):

- **Default Electron app cold start: 1–2 s** on a typical Mac.
- **With V8 snapshots:** Atom team reduced startup by ~50%; the RaisinTen experiment removed 81% of `require()` time, ~36% overall startup improvement.
- **With ASAR + precompiled TypeScript + deferred non-critical imports:** another 100–300 ms.
- **Realistic best case for a well-tuned Electron app: 600–900 ms cold on a Mac.** Notion and VSCode are roughly here.

### 5.3 Tauri — what's possible

- **Tauri 2 default cold start: <500 ms on mid-range hardware**, frequently 200–300 ms on a modern Mac. Clash for Windows reportedly hit <300 ms vs Electron's "multi-second" prior.
- The win comes from skipping Chromium bundle load: WKWebView is already resident in the system, and the Rust binary is a few MB instead of ~150 MB of Chromium framework.
- Caveat: app size is small but the WKWebView process itself is Lazy-loaded by the OS; first-ever launch on a freshly-booted machine can lose 100–200 ms warming the WebKit.framework.

### 5.4 Recommendation

- **Tauri:** target 400 ms cold, 200 ms warm. Achievable.
- **Electron:** target 1.0 s cold, 500 ms warm. Hard but possible with V8 snapshots; without snapshots, expect 1.5–2 s.

---

## 6. Memory

### 6.1 The WebView itself

- **Electron (Chromium) on macOS:** the renderer process for a single window typically consumes **200–300 MB at idle**. Multiple Chromium-based comparisons report ~2× the memory of WKWebView for the same window.
- **Tauri (WKWebView) on macOS:** **30–50 MB at idle**. Confirmed by gethopp.app and dev.to/vorillaz benchmarks.
- The 10× headline ratio is real for a "hello world" but narrows as the app does real work — once you load a 5 MB doc + plugins + extensions, both stacks add similar amounts on top of their baseline.

### 6.2 Multi-tab strategy

Each open document keeps a ProseMirror EditorView and its DOM tree. Concrete numbers from the ProseMirror stress test: a stable doc consumes 6–18 MB heap. Ten open tabs ≈ 60–180 MB on top of WebView baseline.

Strategies to bound this:
- **Detach hidden tabs' DOM** (keep doc model in memory, drop the EditorView and its rendered nodes). Reattach on tab focus — restoring is fast (single re-render). Trade ~60 MB of RAM for ~20 ms of re-render on tab switch. Cheap.
- **Hard limit on open tabs** (e.g. 20). Beyond that, LRU-evict the oldest's full state, keeping just `{path, scrollPos, dirty}` so it can be reopened from disk.
- **Never** keep undo history for non-active tabs un-bounded — Lexical's bug shows where that road leads. ProseMirror's `history` plugin has `historyDepth` and `newGroupDelay` knobs; cap depth at 200–500 entries per tab.

### 6.3 Realistic resident-set targets (Mac, 1 doc open)

| Stack | RSS at idle | RSS with 10 MB doc + plugins | RSS with 10 tabs open |
|---|---|---|---|
| Tauri + ProseMirror + Rust comrak | 80–120 MB | 150–200 MB | 250–350 MB |
| Electron + ProseMirror + JS markdown-it | 250–350 MB | 350–500 MB | 600–900 MB |

These are estimates anchored on Tauri/Electron baselines + measured ProseMirror heap.

---

## 7. Concrete Performance Targets

The clearest way to make these decisions is a ranked target table with realistic verdicts. Targets are for a modern Mac (M1 or newer) running on a 10k-file, 100 MB total vault.

| # | Target | Tauri + ProseMirror + comrak | Electron + ProseMirror + markdown-it |
|---|---|---|---|
| 1 | **Cold startup < 1.5 s** | Easy. ~300–500 ms baseline. | Achievable with V8 snapshots; 1.0–1.5 s realistic, 2 s without optimization. |
| 2 | **Open 5 MB doc < 500 ms (parse + first paint)** | Yes. comrak parses 5 MB in ~25–50 ms; CM6/PM render in ~200 ms. | Borderline. markdown-it ~100–250 ms parse + render. Tight on a slow Mac. |
| 3 | **Open 10 MB doc < 1.5 s, no jank** | Yes with workers + lazy render. | Possible but requires the worker + lazy-render investment; gates dropping to source-mode above 5 MB recommended. |
| 4 | **Keystroke-to-paint < 16 ms (60 fps)** at 50k words | Yes (PM transaction model + Tauri's IPC isn't on the hot path). | Yes — same editor, same DOM. The renderer choice doesn't change keystroke latency; the editor framework does. |
| 5 | **Keystroke-to-paint < 8 ms (120 fps ProMotion)** at 50k words | Yes with `tauri-plugin-macos-fps` to unlock WKWebView's 60 Hz cap, and PM lazy rendering on long lists. | Borderline; Chromium on macOS already runs at 120 Hz where supported. The 8 ms budget is tight regardless of stack. |
| 6 | **10k-file vault initial index < 5 s** | Yes. Tantivy + parallel walk: 1–3 s realistic. | Yes with FTS5: 2–5 s. Same order of magnitude. |
| 7 | **Vault re-validate on startup < 200 ms** (mtime check, no content reread) | Yes. | Yes. Bottleneck is filesystem, not stack. |
| 8 | **Full-text query latency < 50 ms** on 10k docs | Yes. Tantivy: low single-digit ms. | Yes. FTS5: low single-digit ms. |
| 9 | **Resident memory < 300 MB** with 1 doc open | Yes comfortably (~150–200 MB). | **No.** Electron baseline alone is ~250–350 MB. Realistic floor ~400 MB. |
| 10 | **Resident memory < 300 MB** with 10 tabs open | Borderline (~250–350 MB depending on tab DOM strategy). | No. ~600–900 MB realistic. |
| 11 | **Backlinks query for 1 file < 10 ms** | Yes (single SQLite/Tantivy lookup). | Yes (same). |
| 12 | **Idle CPU < 1%** | Yes. WKWebView is well-behaved when nothing changes. | Mostly yes; Chromium has more background timers (compositor, GC) but stays low. |
| 13 | **Bundle size < 20 MB** | Easy. Tauri apps are 5–15 MB shipped. | No. Electron ships ~150 MB minimum on macOS due to Chromium framework. |

### Summary verdict

For a **performance-first** Mac-native Markdown editor where the user expects Sublime/Typora-class snappiness:

- **Tauri + ProseMirror + native Rust comrak/Tantivy** hits every target on the list, including the hard ones (RSS, bundle size). Cost: Rust is a less common skillset; cross-platform polish (Linux WebKitGTK) takes more work than Electron; some npm ecosystem pieces (Lexical, etc.) won't transparently apply.
- **Electron + ProseMirror + markdown-it + SQLite FTS5** hits almost every target *except* memory. If RSS<300 MB is a hard requirement, Electron cannot meet it — that's a structural Chromium cost, not a tuning failure. If RSS<500 MB is acceptable, well-tuned Electron is fine.

For "Mac self-use, performance-first," **Tauri is the recommended stack**. The principal risk is plugin/extensibility ecosystem (everyone writes Markdown editor plugins for Electron); if plugin compatibility with other editors is a goal, Electron is the safer choice and the memory delta is the price.

---

## Sources

- [How I Render 10MB Markdown Files in the Browser — Igor's Techno Club](https://igorstechnoclub.com/how-i-render-10mb-markdown-files-in-the-browser/)
- [Editing Huge Documents — Markdown Monster](https://markdownmonster.west-wind.com/docs/FAQ/Editing-Huge-Documents.html)
- [Improving performance of react-markdown with very large texts — remarkjs discussion](https://github.com/orgs/remarkjs/discussions/1027)
- [Comrak (CommonMark + GFM Rust parser) on GitHub](https://github.com/kivikakk/comrak)
- [pulldown-cmark on GitHub](https://github.com/pulldown-cmark/pulldown-cmark)
- [rusdown (pulldown-cmark in WASM, "3x faster than markdown-it")](https://github.com/stanNthe5/rusdown)
- [Markdown-Wasm: a Very Fast Markdown Parser in WebAssembly — InfoQ](https://www.infoq.com/news/2020/10/markdown-wasm-fast-parser/)
- [common-mark-benchmarks — fitzgen](https://github.com/fitzgen/common-mark-benchmarks)
- [Building Incremental Markdown Compiler by Moonbit — DEV](https://dev.to/mizchi/building-markdown-incremental-compiler-by-moonbit-216o)
- [Tree-sitter on GitHub](https://github.com/tree-sitter/tree-sitter)
- [Incremental Parsing with Tree-sitter — dasroot.net](https://dasroot.net/posts/2026/02/incremental-parsing-tree-sitter-code-analysis/)
- [Use web workers to run JavaScript off the main thread — web.dev](https://web.dev/articles/off-main-thread)
- [CodeMirror 6 huge doc demo](https://codemirror.net/examples/million/)
- [CodeMirror 6 noticeable lag with large files — discuss.codemirror.net](https://discuss.codemirror.net/t/noticable-lag-when-dealing-with-large-files/5928)
- [ProseMirror prosemirror-markdown](https://github.com/ProseMirror/prosemirror-markdown)
- [Lazy rendering for ProseMirror — discuss.prosemirror.net](https://discuss.prosemirror.net/t/lazy-rendering-for-prosemirror/1486)
- [Joplin Sync-Scroll PR #5512](https://github.com/laurent22/joplin/pull/5512)
- [vincentcn/markdown-scroll-sync](https://github.com/vincentcn/markdown-scroll-sync)
- [Disable more editor features for large files — VSCode #64095](https://github.com/microsoft/vscode/issues/64095)
- [Rich Text Editors in Action: Stress Test On Lexical and ProseMirror — Emergence Engineering](https://emergence-engineering.com/blog/lexical-prosemirror-comparison)
- [ProseMirror vs Lexical performance test — discuss.prosemirror.net](https://discuss.prosemirror.net/t/prosemirror-vs-lexical-performance-test/7681)
- [Bug: Extremely slow performance in big documents — facebook/lexical #7422](https://github.com/facebook/lexical/issues/7422)
- [Tauri vs. Electron: performance, bundle size, and the real trade-offs — gethopp](https://www.gethopp.app/blog/tauri-vs-electron)
- [Tauri vs. Electron: A Technical Comparison — DEV / vorillaz](https://dev.to/vorillaz/tauri-vs-electron-a-technical-comparison-5f37)
- [Tauri vs. Electron real-world application — levminer](https://www.levminer.com/blog/tauri-vs-electron)
- [Tauri 2.0 vs Electron 30.0: Why Switch in 2026 — johal.in](https://johal.in/you-use-tauri-20-electron-300-desktop-apps/)
- [tauri-plugin-macos-fps (unlock 60Hz WKWebView cap)](https://github.com/userFRM/tauri-plugin-macos-fps)
- [How to make your Electron app launch 1,000ms faster — Takuya Matsuyama](https://www.devas.life/how-to-make-your-electron-app-launch-1000ms-faster/)
- [Speeding up Electron with V8 snapshots — RaisinTen](https://github.com/RaisinTen/electron-snapshot-experiment)
- [6 Ways Slack, Notion, and VSCode Improved Electron App Performance — Palette](https://palette.dev/blog/improving-performance-of-electron-apps)
- [chokidar on GitHub](https://github.com/paulmillr/chokidar)
- [SQLite FTS5 — sqlite.ai blog](https://blog.sqlite.ai/fts5-sqlite-text-search-extension)
- [Beyond FTS5: TursoDB's Tantivy-based FTS](https://turso.tech/blog/beyond-fts5)
- [Tantivy on GitHub (referenced in Turso write-up)](https://github.com/quickwit-oss/tantivy)
- [Orama search engine on GitHub](https://github.com/oramasearch/orama)
- [ripgrep on GitHub](https://github.com/BurntSushi/ripgrep)
- [Ripgrep vs grep: 5–13× faster benchmark — codeant.ai](https://www.codeant.ai/blogs/ripgrep-vs-grep-performance)
- [Obsidian indexing time forum thread (~20 min for 10k files)](https://forum.obsidian.md/t/indexing-time/41532)
- [Reindexes entire vault every Obsidian startup — forum](https://forum.obsidian.md/t/reindexes-entire-vault-every-time-on-obsidian-startup/95724)
- [Logseq large graph >300 MB launch failure — issue #11236](https://github.com/logseq/logseq/issues/11236)
- [Logseq performance bad as graph grows — discuss.logseq.com](https://discuss.logseq.com/t/logseq-performance-very-bad-as-graph-grows/22314)
