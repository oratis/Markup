# Markup — Release Plan

> Status: living document · last updated for **v0.5.2**
> Companion docs: [STATUS.md](./STATUS.md) · [design/03-roadmap.md](./design/03-roadmap.md) · [app-store/MAS-publishing-plan.md](./app-store/MAS-publishing-plan.md)

This is the plan for *shipping* Markup: where it is now, how releases are
cut, what's coming, and what gates each milestone. Feature-level design
lives in `docs/design/`; this doc is about versions, distribution, and the
path to 1.0.

---

## 1. Where we are — v0.5.2

| | |
|---|---|
| **Distribution** | Direct-download DMG on GitHub Releases, **dual-arch** (Apple Silicon + Intel), **unsigned** |
| **Updates** | In-app banner that points to the latest GitHub release (direct build); compiled out of any MAS build |
| **Mac App Store** | Technically ready (sandbox verified, security-scoped bookmarks, build script) — **not submitted** (account steps pending) |
| **Stack** | Tauri 2 (Rust) · Milkdown/ProseMirror WYSIWYG · CodeMirror 6 source · Tantivy search |

### Shipped so far
- **v0.3.0** — Obsidian-style shell (ribbon · file tree · tabs · right rail · status bar) + Read/Edit/Source tri-state, Read default.
- **v0.4.0** — Preview-as-HTML-in-browser + GitHub update banner.
- **v0.4.1** — DMG gains the Applications drop target.
- **v0.5.0** — WYSIWYG images (asset protocol), Chinese-IME line-break fix, `.md` open-with, browser preview fix; MAS groundwork.
- **v0.5.1** — Fix the v0.5.0 IME per-keystroke newline regression; reopen-last-vault on launch (security-scoped bookmarks).
- **v0.5.2** — DMG installer shows large, centered icons (dmgbuild headless layout).

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
| **Direct DMG (unsigned)** | ✅ live | Gatekeeper blocks first launch → *System Settings → Privacy & Security → Open Anyway*. |
| **Direct DMG (signed + notarized)** | ⏳ planned (v0.6.0) | Removes the Gatekeeper prompt. Needs Developer ID cert; pipeline in `scripts/sign-and-notarize.sh` + the release workflow's signing gate. |
| **Mac App Store** | ⏳ ready, not submitted | Sandbox + bookmarks done; `scripts/build-mas.sh` produces the `.pkg`. Remaining work is account-gated (see §5). |
| **Auto-update (in-place)** | 🔭 future | Today's banner is download-and-replace. Tauri's signed updater could make it one-click; needs the Ed25519 update key + `latest.json` per release. |

---

## 5. Roadmap

### v0.5.x — stabilization (now)
- [ ] Cosmetic: CJK composition phantom blank-line (WebKit-internal; best-effort CSS shipped in 0.5.2, confirm or accept).
- [ ] Triage any field reports from the 0.5 line.

### v0.6.0 — "Trustworthy install" (signing)
**Goal:** users can open Markup without the Gatekeeper scare.
**Code is done; remaining steps are account-gated — full runbook: [app-store/signing-setup.md](./app-store/signing-setup.md).**
- [ ] Provision **Developer ID Application** cert (account: wangharp@gmail.com).
- [ ] Wire the six Apple secrets into the release workflow's signing gate (already coded — see `release.yml` `HAS_APPLE_SIGNING`).
- [ ] Codesign (hardened runtime) + notarize + staple the direct DMGs.
- [ ] Update README: drop the "unsigned / Open Anyway" caveat.

### MAS launch — "On the store" (can run in parallel with v0.6)
Owner = you (account-gated); I provide scripts + exact steps. Full runbook: [app-store/MAS-publishing-plan.md](./app-store/MAS-publishing-plan.md).
- [ ] Register App ID (App Sandbox capability).
- [ ] 3 certs (Apple Distribution + Installer) + Mac App Store provisioning profile.
- [ ] App Store Connect record: Free tier, metadata, screenshots, privacy "Data Not Collected".
- [ ] `MAS_APP_IDENTITY=… MAS_INSTALLER_IDENTITY=… MAS_PROFILE=… ./scripts/build-mas.sh` → `.pkg` → Transporter upload → submit for review.
- [ ] Address review feedback; ship.

### v0.7.0 — feature batch (candidate themes, pick what matters)
- [ ] Settings: default mode (Read/Edit) toggle, prose font/width controls (the redesign plan §M5 items).
- [ ] Graph view polish (the overhaul landed in 0.3; iterate on interaction).
- [ ] Export polish (PDF/HTML themes), more `[[wikilink]]` ergonomics.
- [ ] WYSIWYG image UX (resize, alt text editing).

### v1.0.0 — criteria
Ship 1.0 when **all** hold:
- [ ] Signed + notarized direct DMG (no Gatekeeper prompt). *(v0.6.0)*
- [ ] Either: live on the Mac App Store, **or** a deliberate "direct-only" decision documented.
- [ ] No known data-loss or input-corruption bugs (IME content is correct as of 0.5.1).
- [ ] README screenshots + a real landing/marketing pass.
- [ ] Crash-free across a week of daily use on a large vault.

---

## 6. Known issues / backlog
- **CJK composition phantom blank-line** — purely visual (not serialized); WebKit contenteditable IME rendering. Best-effort CSS mitigation in 0.5.2.
- **Unsigned DMG** — Gatekeeper prompt until v0.6.0 signing.
- **Vault auto-reopen vs. sandbox** — works via security-scoped bookmarks (0.5.1); the direct build restores by path. External-disk vaults across reboots are the edge to watch.
- **Pre-existing localStorage unit-test failures** — only in some local Node setups; CI (jsdom) is green. Not a release blocker; worth a test-env fix eventually.

---

## 7. Decisions & references
- Tech stack: [decisions/ADR-001-tech-stack.md](./decisions/ADR-001-tech-stack.md)
- Distribution: [decisions/ADR-002-distribution.md](./decisions/ADR-002-distribution.md)
- Obsidian redesign: [design/04-obsidian-redesign-plan.md](./design/04-obsidian-redesign-plan.md)
- MAS: [app-store/MAS-publishing-plan.md](./app-store/MAS-publishing-plan.md)
