# Cross-platform hardening to-do (Windows + Linux)

> Output of the GTM-SCALE-PLAN.md §3 (unlock 2) / §10 item 7 **spike**.
> The spike workflow ([`.github/workflows/cross-platform-spike.yml`](../.github/workflows/cross-platform-spike.yml))
> runs `tauri build --no-bundle` on `ubuntu-latest` + `windows-latest`.
> This file enumerates what the spike found and what's left before a real
> Win/Linux beta (GTM §5 P1).
>
> Spike run 1 (2026-06-27): **both platforms failed to compile** — 2 macOS-only
> APIs used unconditionally. Both fixed in the same branch (see below).

## ✅ Done in the spike branch — the build now compiles cross-platform

Two compile blockers, identical on Windows and Linux, both macOS-only Tauri
APIs used without `cfg`:

| Site | API | Fix |
|---|---|---|
| `src-tauri/src/commands_window.rs` | `WebviewWindowBuilder::title_bar_style` | gated `#[cfg(target_os = "macos")]`; Win/Linux use default decorations |
| `src-tauri/src/lib.rs` | `RunEvent::Opened` + `open_urls_to_paths` helper | gated `#[cfg(target_os = "macos")]` |

macOS behaviour unchanged (`cargo check` + full `cargo test` still green locally;
1008 frontend + 89 Rust tests pass).

## 🔧 Remaining hardening (before a Win/Linux beta)

Ordered by user-visible impact.

### P1 — functional gaps (a build that runs but misbehaves)

1. **✅ Open-file from the OS** — *done (compile-verified; runtime test pending a
   real machine).* Added `tauri-plugin-single-instance` (Win/Linux only) +
   first-instance argv parsing in `lib.rs`, both feeding the existing
   `PendingOpenFiles` / `"open-files"` path. Double-clicking a `.md` should focus
   the running window and open the file. **Still needs a manual runtime check on
   real Windows/Linux** (CI only proves it compiles).
2. **✅ GitHub token credential store** — *done (resolution-verified).* `keyring`
   is now declared per target: `apple-native` (macOS), `windows-native`
   (Windows Credential Manager), `sync-secret-service` + `crypto-rust` (Linux
   Secret Service via `dbus-secret-service`, pure-Rust crypto). ⚠️ Linux Secret
   Service needs a running keyring daemon — **headless/server fallback still
   undecided** (e.g. detect-and-warn, or an encrypted-file backend).

### P2 — packaging & distribution (can't ship without)

3. **✅ Packaging works (unsigned, CI-verified).** The bundle spike
   (`.github/workflows/cross-platform-bundle.yml`) produces real installers on
   both platforms with `tauri build --bundles …` (no change to `tauri.conf.json`,
   so the macOS release flow is untouched):
   - Linux → `Markup_1.0.1_amd64.deb` + `Markup_1.0.1_amd64.AppImage`
     (`libfuse2` needed on the runner for AppImage)
   - Windows → `Markup_1.0.1_x64-setup.exe` (NSIS)

   No bundler errors. **Remaining:** decide whether to bake these targets into
   `tauri.conf.json` per-OS (vs CLI `--bundles`) and wire them into a real
   release pipeline (today `release.yml` is macOS-only). `flatpak` / `msi` still
   optional/unbuilt.
4. **Code signing — owner's call.** The installers above are **unsigned**:
   Windows needs a **code-signing certificate** (EV or OV) or SmartScreen warns
   on every download; Linux AppImage/flatpak signing is lighter. Budget +
   procure the Windows cert (the real cost flagged in GTM §3).
5. **Updater per-platform.** The updater endpoint (`latest.json`) and signed
   artifacts are currently macOS-only. Extend the release pipeline
   (`.github/workflows/release.yml`) to build, sign, and publish Win/Linux
   updater artifacts, or scope the updater to macOS and document manual updates
   elsewhere.

### P3 — verify behaviour on the real webviews (manual, can't be done in headless CI)

6. **Rendering parity** on **WebView2** (Windows, Chromium) vs **WebKitGTK**
   (Linux) vs WKWebView (macOS): Mermaid, KaTeX, syntax highlighting, PDF/HTML
   export fidelity, custom CSS, scroll/zoom.
7. **Chinese IME** input in the Milkdown/CodeMirror editor on WebView2 and
   WebKitGTK (a known Tauri pain point and a core audience — GTM §4 中文).
8. **File watching & path semantics**: `notify` inotify limits on Linux (large
   vaults), Windows path separators / `\\?\` long paths / case-insensitivity,
   trash behaviour (`trash` crate) on each OS.

### P4 — CI & process

9. **Promote the spike into real CI** once green: add Win/Linux to the matrix in
   `ci.yml` (build + Rust tests), and a bundling smoke. Retire
   `cross-platform-spike.yml` or fold it in.
10. **Maintenance load**: GTM §9 risk — staff the matrix and lean on the
    contributor community so cross-platform doesn't rot.

## Already fine (no work needed)

- `src-tauri/src/bookmark.rs` — security-scoped bookmarks already have a
  `#[cfg(not(target_os = "macos"))]` no-op fallback.
- `objc2` / `objc2-foundation` deps are already `cfg(target_os = "macos")`-gated
  in `Cargo.toml`.
