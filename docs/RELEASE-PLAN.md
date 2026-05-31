# Markup — Release Plan

> Status: living document · last updated for **v0.5.2**
> Companion docs: [STATUS.md](./STATUS.md) · [design/03-roadmap.md](./design/03-roadmap.md) · [app-store/MAS-publishing-plan.md](./app-store/MAS-publishing-plan.md)

This is the plan for *shipping* Markup: where it is now, how releases are
cut, what's coming, and what gates each milestone. Feature-level design
lives in `docs/design/`; this doc is about versions, distribution, and the
path to 1.0.

---

## 1. Where we are — v0.6.1

| | |
|---|---|
| **Distribution** | Direct-download DMG on GitHub Releases, **dual-arch** (Apple Silicon + Intel), **signed (Developer ID) + notarized** — opens with no Gatekeeper prompt |
| **Updates** | **In-app signed auto-update** (Tauri updater + Ed25519-signed `latest.json`, shipped v0.6.1); compiled out of any MAS build |
| **Mac App Store** | Code-ready (sandbox verified, security-scoped bookmarks, build script, privacy policy, MAS build re-verified on v0.6.1); **distribution certs' CSRs generated** — remaining steps account-gated (App ID, certs, profile, App Store Connect, Transporter upload) |
| **Stack** | Tauri 2 (Rust) · Milkdown/ProseMirror WYSIWYG · CodeMirror 6 source · Tantivy search |

### Shipped so far
- **v0.3.0** — Obsidian-style shell (ribbon · file tree · tabs · right rail · status bar) + Read/Edit/Source tri-state, Read default.
- **v0.4.0** — Preview-as-HTML-in-browser + GitHub update banner.
- **v0.4.1** — DMG gains the Applications drop target.
- **v0.5.0** — WYSIWYG images (asset protocol), Chinese-IME line-break fix, `.md` open-with, browser preview fix; MAS groundwork.
- **v0.5.1** — Fix the v0.5.0 IME per-keystroke newline regression; reopen-last-vault on launch (security-scoped bookmarks).
- **v0.5.2** — DMG installer shows large, centered icons (dmgbuild headless layout).
- **v0.5.3** — High-fidelity HTML/PDF export: syntect code highlighting, KaTeX math, Mermaid diagrams, heading anchors, theme-aware; `App.tsx` effects refactored into tested hooks + Playwright E2E.
- **v0.5.4** — Fix "Open as HTML" (scoped the opener to the preview temp dir).
- **v0.5.5** — Fix export list/task-list spacing (loose lists + inline checkboxes).
- **v0.6.0** — **Signed + notarized** dual-arch DMGs (Apple Developer ID); Gatekeeper prompt gone.
- **v0.6.1** — **Signed in-app auto-update** (updater feed `latest.json` published per release).

---

## 2. Versioning & cadence

- **SemVer**, pre-1.0: `0.MINOR.PATCH`.
  - **PATCH** (`0.5.x`) — bug fixes, packaging, cosmetic polish. No new user-facing features.
  - **MINOR** (`0.x.0`) — new features or notable behavior changes.
  - **1.0.0** — see §6 criteria.
- **Cadence**: ship when there's something worth shipping. Patch releases go out as soon as a fix lands; minors batch a coherent feature set.
- **One source of version truth must stay in sync**: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (+ `Cargo.lock` via `cargo update -p markup`).

---

## 3. Release process (how each release is cut)

This is the flow used since v0.3.0 — keep to it.

1. **Branch + PR.** Feature/fix work on a branch → PR into `main`. Branch protection requires the two CI checks (**Frontend** = lint + tsc + build + tests; **Rust** = build + test) to pass before merge. No direct pushes of feature work to `main`.
2. **Merge** (merge commit, delete branch).
3. **Bump version** in the three files (§2) + `cargo update -p markup --offline`; write `docs/release-notes-vX.Y.Z.md`.
4. **Tag** `vX.Y.Z` and push the tag → triggers `.github/workflows/release.yml`.
5. **Release CI** builds both arches, assembles each DMG with **dmgbuild** (headless icon layout), uploads `Markup_X.Y.Z_apple-silicon.dmg`, `Markup_X.Y.Z_intel.dmg`, `SHA256SUMS`, and creates the GitHub Release.
6. **Replace the auto-notes** with the hand-written `docs/release-notes-vX.Y.Z.md` (`gh release edit vX.Y.Z --notes-file ...`).
7. **Verify**: download + mount one DMG; confirm it launches and the installer layout is right.

> Asset naming is deliberate: `apple-silicon` / `intel` (not `arm64`/`x64`) so non-technical users pick the right one.

---

## 4. Distribution channels

| Channel | State | Notes |
|---|---|---|
| **Direct DMG (signed + notarized)** | ✅ live (v0.6.0+) | Opens with no Gatekeeper prompt. Developer ID cert (Team `9LH9NBX7P4`); release workflow's signing gate (`HAS_APPLE_SIGNING`). |
| **Auto-update (in-place)** | ✅ live (v0.6.1+) | Tauri signed updater; the release workflow publishes an Ed25519-signed `latest.json` + `.app.tar.gz` per release. v0.6.0-and-earlier users update manually once. |
| **Mac App Store** | ⏳ code-ready, not submitted | Sandbox + bookmarks + privacy policy done; `scripts/build-mas.sh` produces the `.pkg`; distribution-cert CSRs generated. Remaining work is account-gated (see §5). |

---

## 5. Roadmap

### v0.6.0 — "Trustworthy install" (signing) ✅ DONE
- [x] Provision **Developer ID Application** cert (Team `9LH9NBX7P4`).
- [x] Wire the six Apple secrets into the release workflow's signing gate.
- [x] Codesign (hardened runtime) + notarize + staple the direct DMGs.
- [x] Update README: drop the "unsigned / Open Anyway" caveat.

### v0.6.1 — "Auto-update" ✅ DONE
- [x] Generate Ed25519 update key; wire `TAURI_SIGNING_*` secrets.
- [x] `updater.active = true` + pubkey in `tauri.conf.json`.
- [x] Release workflow signs an `.app.tar.gz` per arch and publishes `latest.json`.

### MAS launch — "On the store" (in progress; account-gated)
Owner = you (account-gated); scripts + exact steps provided. Full runbook: [app-store/MAS-publishing-plan.md](./app-store/MAS-publishing-plan.md).
- [x] Sandbox build re-verified on v0.6.1; entitlements embed correctly.
- [x] Privacy policy published ([PRIVACY.md](../PRIVACY.md)); MAS build disables the updater.
- [x] Distribution-cert CSRs generated (`~/markup-signing/mas/`).
- [ ] Create the two MAS certs from the CSRs (Apple Distribution + Mac Installer Distribution).
- [ ] Register App ID `com.appkon.markup` (App Sandbox) + Mac App Store provisioning profile.
- [ ] App Store Connect record: Free tier, metadata, screenshots (1280×800+), privacy "Data Not Collected".
- [ ] `MAS_APP_IDENTITY=… MAS_INSTALLER_IDENTITY=… MAS_PROFILE=… ./scripts/build-mas.sh` → `.pkg` → Transporter upload → submit for review.
- [ ] Address review feedback; ship.

### v0.5.x — stabilization ✅ DONE
- [x] CJK composition phantom blank-line — best-effort CSS mitigation (cosmetic; not serialized).
- [x] High-fidelity export + export fixes (v0.5.3–v0.5.5).

### v0.7.0 — feature batch (candidate themes, pick what matters)
- [ ] Settings: default mode (Read/Edit) toggle, prose font/width controls (the redesign plan §M5 items).
- [ ] Graph view polish (the overhaul landed in 0.3; iterate on interaction).
- [ ] Export polish (PDF/HTML themes), more `[[wikilink]]` ergonomics.
- [ ] WYSIWYG image UX (resize, alt text editing).

### v1.0.0 — criteria
Ship 1.0 when **all** hold:
- [x] Signed + notarized direct DMG (no Gatekeeper prompt). *(v0.6.0)*
- [ ] **DECISION NEEDED:** either live on the Mac App Store, **or** a deliberate "direct-only" decision documented here. (Code is MAS-ready; the rest is account-gated. Direct distribution already gives signed + notarized + auto-update, so "direct-only" is a legitimate 1.0 choice.)
- [x] No known data-loss or input-corruption bugs (IME content correct since 0.5.1).
- [x] README screenshots + a real landing/marketing pass (hero GIF, screenshots, launch video, social card).
- [ ] Crash-free across a week of daily use on a large vault (ongoing observation).

> **The only hard blocker left for 1.0 is the MAS-vs-direct-only decision.** Everything else is done or is passive observation.

---

## 6. Known issues / backlog
- **CJK composition phantom blank-line** — purely visual (not serialized); WebKit contenteditable IME rendering. Best-effort CSS mitigation in 0.5.2.
- **Vault auto-reopen vs. sandbox** — works via security-scoped bookmarks (0.5.1); the direct build restores by path. External-disk vaults across reboots are the edge to watch.
- **localStorage in local unit tests** — fixed: `src/test/setup.ts` installs an in-memory Storage polyfill when the host (e.g. Node 26 + jsdom) doesn't provide one. CI was already green.

### Deferred features (post-1.0 candidates; none block 1.0)
- Spell check (native NSSpellChecker bridge — the WebView `spellcheck` attribute is already wired).
- Custom CSS theme import; `docx` export (pandoc); PDF inline preview; multi-window.
- iOS companion M5 (TestFlight) / M6 (public) — separate track.

---

## 7. Decisions & references
- Tech stack: [decisions/ADR-001-tech-stack.md](./decisions/ADR-001-tech-stack.md)
- Distribution: [decisions/ADR-002-distribution.md](./decisions/ADR-002-distribution.md)
- Obsidian redesign: [design/04-obsidian-redesign-plan.md](./design/04-obsidian-redesign-plan.md)
- MAS: [app-store/MAS-publishing-plan.md](./app-store/MAS-publishing-plan.md)
