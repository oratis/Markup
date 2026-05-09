# Status — Autonomous run completed 2026-05-10

This is the wake-up brief. Read this first.

## TL;DR

`main` branch has two commits:
- `4116ec4` initial scaffold (Tauri 2 + React + Milkdown)
- `1b5eff0` M1 features + Spike 0.3 modules + Spike 0.4 signing script

The app **compiles, type-checks, runs in dev mode**. M1 P0 features are
in place. Spike 0.2 instrumentation is wired but final numbers require
you to manually open the 5MB fixture (autonomous run can't drive the GUI).
Spike 0.3 bench is ready to run with one `cargo test` command. Spike 0.4
signing must be run by you (needs your Apple ID app-specific password).

## What's done (✅)

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
