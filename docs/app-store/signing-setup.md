# v0.6.0 signing & notarization — setup runbook

> **Goal:** users open Markup without the Gatekeeper "can't be opened" wall.
> **Status of the code:** ✅ done. The release workflow ([`.github/workflows/release.yml`](../../.github/workflows/release.yml)) already signs the `.app` with hardened runtime + [`Entitlements.plist`](../../src-tauri/Entitlements.plist), assembles the DMG, and notarizes + staples it — **gated on the six Apple secrets being present.** When they're missing it falls through to an unsigned DMG (today's behavior).
> **What's left:** the account-gated steps below. They only need to be done **once**; after that, every tagged release is signed automatically.

This is for the **direct-download DMG** (Developer ID). The Mac App Store path is separate — see [MAS-publishing-plan.md](./MAS-publishing-plan.md).

---

## One-time setup (account: wangharp@gmail.com)

### 1. Create the Developer ID Application certificate
1. https://developer.apple.com/account/resources/certificates/list → **+**
2. Choose **Developer ID Application** → Continue.
3. Create a CSR with Keychain Access (*Certificate Assistant → Request a Certificate from a Certificate Authority*, "Saved to disk"), upload it, download the `.cer`.
4. Double-click the `.cer` to import into the **login** keychain.

### 2. Export the `.p12` (cert + private key)
1. Keychain Access → **login** → My Certificates → find **Developer ID Application: … (TEAMID)**.
2. Expand it, select **both** the certificate and its private key → right-click → **Export 2 items…** → `.p12`.
3. Set an export passphrase — remember it (this becomes `APPLE_CERTIFICATE_PASSWORD`).

### 3. Base64-encode the `.p12`
```bash
base64 -i Markup-DeveloperID.p12 | pbcopy   # now on your clipboard → APPLE_CERTIFICATE_BASE64
```

### 4. App-specific password (for notarization)
1. https://appleid.apple.com → **Sign-In and Security → App-Specific Passwords → +**
2. Name it `markup-notarize`. Copy the `xxxx-xxxx-xxxx-xxxx` value → `APPLE_PASSWORD`.

### 5. Collect the remaining values
- **`APPLE_TEAM_ID`** — 10 chars, top-right at https://developer.apple.com/account (Membership).
- **`APPLE_SIGNING_IDENTITY`** — the exact identity string. Find it locally:
  ```bash
  security find-identity -v -p codesigning | grep "Developer ID Application"
  # → "Developer ID Application: Your Name (TEAMID)"  ← use the quoted string
  ```
- **`APPLE_ID`** — `wangharp@gmail.com`.

---

## Wire the secrets into GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add all six (names must match exactly):

| Secret | Value |
|---|---|
| `APPLE_CERTIFICATE_BASE64` | base64 of the `.p12` (step 3) |
| `APPLE_CERTIFICATE_PASSWORD` | the `.p12` export passphrase (step 2) |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: … (TEAMID)` (step 5) |
| `APPLE_ID` | `wangharp@gmail.com` |
| `APPLE_PASSWORD` | app-specific password (step 4) |
| `APPLE_TEAM_ID` | 10-char team id (step 5) |

> The workflow gate is `HAS_APPLE_SIGNING = (APPLE_TEAM_ID != '')`. **Add `APPLE_TEAM_ID` last** — once it's present, the next tagged build signs + notarizes.

---

## Cut v0.6.0

1. Bump the version in the three files (keep them in sync):
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml` → then `cargo update -p markup --offline`
2. Write `docs/release-notes-v0.6.0.md` (headline: "Signed & notarized — opens without the Gatekeeper prompt").
3. Tag and push:
   ```bash
   git tag v0.6.0 && git push origin v0.6.0
   ```
4. CI builds both arches, signs, notarizes (`--wait`, ~5–15 min each), staples, and publishes the release.
5. Replace the auto-notes:
   ```bash
   gh release edit v0.6.0 --notes-file docs/release-notes-v0.6.0.md
   ```

## Verify the signed build

```bash
# download the DMG from the release, then:
spctl --assess --type open --context context:primary-signature -v Markup_0.6.0_apple-silicon.dmg   # → accepted
# mount, drag to /Applications, and confirm it opens with NO "can't be opened" dialog
codesign --verify --deep --strict --verbose=2 /Applications/Markup.app                              # → valid on disk
xcrun stapler validate /Applications/Markup.app                                                     # → The validate action worked
```

## After v0.6.0 ships
- Edit [`README.md`](../../README.md): remove the "unsigned / Open Anyway" note in **Install** and update the "Status" line.
- Update [`docs/LAUNCH-POSTS.md`](../LAUNCH-POSTS.md): delete the "DMG is currently unsigned / Open Anyway" sentence from every post.
- This unblocks the GTM **Phase B** push (Show HN / Product Hunt / 少数派) — see [GTM-LAUNCH-PLAN.md](../GTM-LAUNCH-PLAN.md).

---

## Local fallback (sign on your own Mac, no CI)

If you'd rather sign locally for a one-off, [`scripts/sign-and-notarize.sh`](../../scripts/sign-and-notarize.sh) does the same flow (build → sign → notarize → staple). It needs the cert in your keychain and a stored notary profile:

```bash
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "wangharp@gmail.com" --team-id "<TEAM_ID>" --password "<APP_SPECIFIC_PASSWORD>"
./scripts/sign-and-notarize.sh
```
