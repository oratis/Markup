# Markup → Mac App Store: publishing plan

> Target account: **wangharp@gmail.com**
> Pricing: **Free** (no price tier, no in-app purchases)
> Status: planning · this doc is the single source of truth for the MAS effort

---

## 0. The one thing you must know first

> **"Completely free" is only true for your users, not for you.**

| Cost | Free? |
|---|---|
| Users downloading Markup from the Mac App Store | ✅ $0 — we set the price tier to Free |
| **Apple Developer Program** (required to publish *anything* to any Apple store) | ❌ **$99 USD / year**, non-negotiable |

A *free* Apple ID can only do local development + sideloading to your own Mac. It **cannot** create App Store listings, distribution certificates, or submit for review. There is no free path to the Mac App Store. If $99/yr is a blocker, the alternative is what we already ship: a **notarized direct-download DMG** (also requires the $99 program for notarization, but distributes outside the store with no review). A *fully* $0 path means staying on **unsigned DMGs** (current v0.4.x) — which is what we have today.

The rest of this plan assumes the $99 Developer Program is (or will be) active on wangharp@gmail.com.

---

## 1. The hard constraint: App Sandbox

Every Mac App Store app **must** run under the **App Sandbox**. This is the single biggest piece of engineering work, because Markup is a vault tool that reads/writes/watches arbitrary folders the user picks.

### What the sandbox allows
- The app's own container: `~/Library/Containers/com.<id>.markup/Data/…`
- Files/folders the user **explicitly selects** via the system open/save panel (`NSOpenPanel`) — access granted for that *session*.
- Persistent access across launches **only** via **security-scoped bookmarks**.

### What breaks today, and the fix
| Feature | Current behaviour | Sandbox status | Fix |
|---|---|---|---|
| Tantivy search index | writes to `app_data_dir()` | ✅ already container-safe (auto-redirects to `…/Containers/…/Data/Library/Application Support`) | none |
| Open Vault | `NSOpenPanel` via dialog plugin → scan folder | ✅ session access granted on pick | none for the session |
| **Re-open vault on next launch** | reads stored path directly | ❌ **denied** — no bookmark | add `tauri-plugin-persisted-scope` (saves + restores the FS scope as security-scoped bookmarks) |
| File watcher (`notify`/FSEvents) | watches vault root | ✅ works *within* granted scope | none, once scope persists |
| Image paste → `vault/assets/` | writes into vault | ✅ within granted scope | none |
| **Auto-update / "new version" banner** | links to GitHub release `.dmg` | ❌ **App Review will reject** (Guideline 2.4.5 / 3.2.2: apps may not download executables or steer users to outside distribution) | **compile it out of the MAS build** |
| "Preview as HTML in browser" | temp file + `openPath` | ✅ container temp + `NSWorkspace` open is allowed | none |

### Entitlements diff
The current `Entitlements.plist` is the **hardened-runtime** set for the direct-DMG/notarization path. MAS needs a **separate** entitlements file:

```xml
<!-- src-tauri/Entitlements.mas.plist (NEW) -->
<key>com.apple.security.app-sandbox</key><true/>
<key>com.apple.security.files.user-selected.read-write</key><true/>
<key>com.apple.security.files.bookmarks.app-scope</key><true/>
<key>com.apple.security.network.client</key><true/>  <!-- WKWebView + any net -->
```

Notably **absent** (forbidden / unnecessary under MAS sandbox):
`com.apple.security.cs.disable-library-validation`, `…allow-jit`,
`…allow-unsigned-executable-memory`, `…allow-dyld-environment-variables`.
These are the hardened-runtime exceptions Tauri uses for the WKWebView in the
*direct* build; under MAS the app is sandboxed instead. (If the WKWebView fails
to start under strict library validation, we add back only
`com.apple.security.cs.allow-jit` — it *is* permitted alongside the sandbox.)

---

## 2. Identifiers, certs, profiles (account-gated — you do these)

I cannot log into the developer account, generate certificates, or touch App
Store Connect. Below is the exact runbook; I've scripted everything that runs
locally.

### 2.1 Bundle identifier
**Decision: keep `com.appkon.markup`.** The iOS app already ships under
`com.appkon.markup.ios` on the same Apple Team (`9LH9NBX7P4`), so the `com.appkon.*`
prefix is already in use by this account — keeping the Mac id as `com.appkon.markup`
is consistent and needs no code change (`src-tauri/tauri.conf.json` already uses it).
A bundle ID does not require owning the matching domain; it only has to be unique
and registered under your team. (The earlier `com.wangharp.markup` alternative is
unnecessary now that `com.appkon.*` is confirmed under this team.)

→ **App Store Connect → Certificates, IDs & Profiles → Identifiers → App IDs → +**
Register `com.appkon.markup`. Enable capability: **App Sandbox** (no others needed).

> Note: iOS `com.appkon.markup.ios` and Mac `com.appkon.markup` are **separate**
> App Store products (a Tauri Mac app and a native iOS app can't share one
> universal binary). That's expected; they share branding + this account, not a
> single listing.

### 2.2 Certificates (3 needed for MAS)
Generate a CSR on *this* Mac (Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority → save to disk), then in the portal create:
1. **Apple Distribution** — signs the `.app` and nested binaries.
2. **Mac App Distribution** (aka "3rd Party Mac Developer Application") — *legacy name*; Apple Distribution now covers this for MAS.
3. **Mac Installer Distribution** (aka "3rd Party Mac Developer Installer") — signs the `.pkg`.

Download all, double-click to install into the login keychain.

### 2.3 Provisioning profile
**Profiles → + → Mac App Store → ** pick the App ID + the Apple Distribution cert → download → it must be embedded as `embedded.provisionprofile` inside the `.app`.

### 2.4 App Store Connect record
**Apps → + → New App** → macOS → name "Markup" → bundle ID → SKU (any string) → set **Price: Free**. Fill: category (Productivity), description, keywords, support URL, privacy policy URL (required even for free apps), screenshots (1280×800 or 2560×1600), and a **Privacy "Nutrition Label"** — Markup collects nothing, so it's "Data Not Collected".

---

## 3. The MAS build flavor (I build this)

We keep the existing direct-DMG pipeline untouched and add a parallel MAS flavor.

### 3.1 Config override
`src-tauri/tauri.mas.conf.json` — merged over `tauri.conf.json` for MAS builds:
- `bundle.macOS.entitlements` → `Entitlements.mas.plist`
- `bundle.macOS.provider` / signing identity wiring
- updater plugin `active: false` (already false)
- a build-time define `MARKUP_MAS=1` so the frontend compiles out the update banner.

### 3.2 Frontend feature flag
`UpdateBanner` and any "download newer DMG" affordance are gated behind
`import.meta.env.VITE_MARKUP_MAS !== "1"`. In the MAS build they render nothing —
the App Store handles updates.

### 3.3 Sandbox folder persistence
Add `tauri-plugin-persisted-scope` (JS + Rust + capability grant). It transparently
saves the user-selected vault folder as a security-scoped bookmark and re-grants it
on launch, so "reopen last vault" survives a relaunch under sandbox.

### 3.4 Signing + packaging script
`scripts/build-mas.sh` (I write it; you run it once certs are installed):
```
1. VITE_MARKUP_MAS=1 pnpm build
2. tauri build --bundles app  (with MAS entitlements + Apple Distribution identity)
3. copy embedded.provisionprofile into Markup.app/Contents/
4. codesign --deep --options runtime? NO — MAS uses sandbox, sign with
   "Apple Distribution: … (TEAMID)" + entitlements, sign nested helpers
5. productbuild --component Markup.app /Applications \
     --sign "3rd Party Mac Developer Installer: … (TEAMID)" Markup.pkg
6. xcrun altool / Transporter upload  (or `xcrun notarytool` is NOT for MAS —
   MAS uses Transporter / altool --upload-app)
```

---

## 4. App Review gotchas specific to Markup

1. **No external update mechanism** — handled by §3.2 (banner compiled out).
2. **No "download from our website" / donate / Patreon links** in-app (2.3.10 / 3.2.2). Markup has none; keep it that way in the MAS build.
3. **Privacy policy URL is mandatory** even for a no-data app. A one-paragraph "Markup stores everything locally and collects no data" page on the repo's GitHub Pages suffices.
4. **Sandbox must actually be enforced** — reviewers test that the app works without disabling SIP/sandbox. The persisted-scope + user-selected entitlements cover the vault case.
5. **WKWebView + library validation** — if the webview crashes under MAS, add `com.apple.security.cs.allow-jit` (permitted) and re-test. Do *not* add `disable-library-validation` (auto-reject under sandbox).
6. **Minimum macOS** — currently 10.15; fine.

---

## 5. Phased execution

| Phase | Owner | What |
|---|---|---|
| **P0 — Decide** | you | Confirm $99 program active, sandbox refactor OK, MAS-only vs dual-track |
| **P1 — Sandbox refactor** | me | `Entitlements.mas.plist`, `tauri-plugin-persisted-scope`, update-banner feature flag, `tauri.mas.conf.json` |
| **P2 — Local sandbox test** | me + you | Build sandboxed app locally (ad-hoc sign), verify open-vault / reopen / search / watch all work under sandbox |
| **P3 — Account setup** | you | Bundle ID, 3 certs, provisioning profile, App Store Connect record (§2) |
| **P4 — Signed MAS build** | me (script) + you (run) | `scripts/build-mas.sh` → signed `.pkg` |
| **P5 — Upload + metadata** | you | Transporter upload, fill listing, screenshots, privacy label, submit |
| **P6 — Review** | Apple | ~24–48h; address feedback |

I can fully own **P1, P2 (build side), P4 (the script)**. P3/P5/P6 are account-gated and I'll hand you exact steps.

---

## 6. Honest recommendation

Markup's whole identity is "point me at any folder of Markdown." The sandbox
makes that *workable* (via persisted-scope) but never as frictionless as the
direct build — every brand-new vault still needs an explicit user pick, and
some power-user flows (following a `[[wikilink]]` into a file *outside* the
granted vault scope, opening files via CLI/Finder "Open With") get more
constrained.

If reach matters most → **MAS** (discoverability, trust, auto-update). 
If power + zero friction matters most → **notarized direct DMG** (needs the same
$99, no review, no sandbox). 
Many tools ship **both**. The architecture here supports a dual track cleanly,
and P1's feature-flagging is what makes that possible.

---

## Appendix A — files this plan adds/changes
- `src-tauri/Entitlements.mas.plist` (new)
- `src-tauri/tauri.mas.conf.json` (new)
- `scripts/build-mas.sh` (new)
- `src/components/UpdateBanner.tsx` + mount site (feature-flagged)
- `package.json` + `Cargo.toml` + `capabilities/default.json` (persisted-scope plugin)
- `.github/workflows/` — optional MAS build job (needs the 3 cert secrets)

---

## Appendix B — Sandbox spike results (run 2026-05-28)

Built an app-only bundle, ad-hoc re-signed with `Entitlements.mas.plist`
(no $99 certs needed for local sandbox testing), launched it.

**Automated checks — all green:**
- ✅ App launches and stays alive (process stable across 16s poll).
- ✅ **App Sandbox is enforced** — `~/Library/Containers/com.appkon.markup/Data`
  container created with `containermanagerd` metadata.
- ✅ **WKWebView runs under sandbox** — 2 `com.apple.WebKit.WebContent`
  helpers alive, *without* any hardened-runtime exception
  (`disable-library-validation` / `allow-jit` / etc.). This was the #1 risk
  and it's cleared.
- ✅ No `Sandbox`/`deny` violations in the unified log.
- ✅ No crash reports.
- ✅ Tantivy index path (`app_data_dir`) resolves inside the container
  (`…/Containers/com.appkon.markup/Data/Library/Application Support`).

**Could NOT auto-verify (need you to drive the GUI once):** the spike build
can't be click-tested headlessly. Please run this checklist on the
ad-hoc-signed spike build and report any ✗:

> Manual sandbox test checklist
> 1. [ ] Window renders content (not blank/white) — the Welcome doc shows.
> 2. [ ] `⌘⇧O` → pick a folder of `.md` files → file tree populates.
> 3. [ ] Click a file → it opens and renders (Read mode).
> 4. [ ] `⌘⇧F` → search a word → hits come back (Tantivy index works in container).
> 5. [ ] Edit a file in another app → Markup shows the external-change reload prompt (FSEvents watch works within scope).
> 6. [ ] Paste an image → lands in `vault/assets/` (write within scope).
> 7. [ ] **Quit + relaunch** → the last vault re-opens *without* a permission
>        prompt (this is the `persisted-scope` security-scoped bookmark — the
>        make-or-break for MAS).
> 8. [ ] "Preview as HTML" → opens in browser (temp write + NSWorkspace open).

If #7 fails (vault doesn't reopen / asks permission again), persisted-scope
isn't capturing the bookmark and we adjust before any submission. Everything
else passing means the sandbox model is viable and we proceed to P3 (certs).

**Spike build location (ad-hoc signed, sandboxed):**
`src-tauri/target/release/bundle/macos/Markup.app`
(Re-sign command used: `codesign --force --deep --sign - --entitlements src-tauri/Entitlements.mas.plist <app>`)
