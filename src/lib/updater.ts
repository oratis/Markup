import { type Update, check } from "@tauri-apps/plugin-updater";
import { showToast } from "../components/Toast";
import { t } from "./i18n";

/**
 * Auto-updater entry-point. Called once at app startup.
 *
 * Behaviour
 *  - check() hits the configured endpoint (tauri.conf.json → updater.endpoints)
 *  - If a newer version is published with a matching signature, prompt-free
 *    downloads + installs it; on macOS the user must restart to apply.
 *  - On any error (offline, no signature key configured, server 404, etc.)
 *    we silently log; never block the app.
 *
 * Setup checklist (NOT done yet — required before this becomes useful):
 *  1. Generate a key pair:
 *       cargo install tauri-cli
 *       cargo tauri signer generate -w ~/.tauri/markup-update.key
 *  2. Put the public key into tauri.conf.json → plugins.updater.pubkey
 *     and flip "active" to true.
 *  3. The release workflow needs to:
 *       a. Sign the .app bundle with the *update* key (separate from
 *          codesign/notarytool). `tauri build` will produce a `.sig` file.
 *       b. Upload a `latest.json` alongside the .dmg — see the schema at
 *          https://v2.tauri.app/plugin/updater/#dynamic-update-installer
 *  4. Set TAURI_SIGNING_PRIVATE_KEY + TAURI_SIGNING_PRIVATE_KEY_PASSWORD
 *     repo secrets so the release workflow can sign during build.
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const update: Update | null = await check();
    if (!update) return;

    showToast(t("toast.updateAvailable", update.version));
    showToast(t("toast.updateInstalling"));
    await update.downloadAndInstall();
    showToast(t("toast.updateRestart"));
  } catch (err) {
    // Common cases: pubkey not configured, endpoint 404, offline.
    // Log only — never disrupt the user.
    console.warn("updater check failed:", err);
  }
}
