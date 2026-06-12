/**
 * GitHub auth state for the desktop app: the OAuth App client id and the
 * access token.
 *
 * The token lives in the macOS Keychain (via the Rust `github_token_*`
 * commands), not localStorage — a token in localStorage is readable by any
 * script that runs in the webview. To keep the call sites synchronous, the
 * value is mirrored in a module-level cache: `loadGitHubToken()` hydrates it
 * once (migrating any pre-existing localStorage token into the Keychain), and
 * `setGitHubToken` updates the cache immediately while persisting to the
 * Keychain in the background.
 */
import { invoke } from "@tauri-apps/api/core";

/** Markup's GitHub OAuth App Client ID (public; Device Flow uses no secret). */
export const GITHUB_CLIENT_ID = "Ov23lio36dKpIFz413gz";

/** Legacy localStorage key — read once for migration, then cleared. */
const LEGACY_TOKEN_KEY = "github.token";

let cachedToken: string | null = null;
let hydrated = false;

/**
 * Hydrate the in-memory token cache from the Keychain. Idempotent; call before
 * any GitHub UI reads the signed-in state. Migrates a token left in
 * localStorage by an older build into the Keychain, then removes it.
 */
export async function loadGitHubToken(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const stored = await invoke<string | null>("github_token_load");
    if (stored && stored.length > 0) {
      cachedToken = stored;
      return;
    }
  } catch {
    // Keychain unreachable — fall through to the legacy localStorage path.
  }
  // Migrate a token persisted by a pre-Keychain build.
  try {
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy && legacy.length > 0) {
      cachedToken = legacy;
      try {
        await invoke("github_token_save", { token: legacy });
        localStorage.removeItem(LEGACY_TOKEN_KEY);
      } catch {
        // Couldn't reach the Keychain; keep the cache for this session and
        // leave the localStorage copy in place for a later attempt.
      }
    }
  } catch {
    /* localStorage inaccessible */
  }
}

export function getGitHubToken(): string | null {
  return cachedToken;
}

export function setGitHubToken(token: string | null): void {
  const next = token && token.length > 0 ? token : null;
  cachedToken = next;
  try {
    if (next) void invoke("github_token_save", { token: next }).catch(() => {});
    else void invoke("github_token_delete").catch(() => {});
  } catch {
    /* non-Tauri env (e.g. unit tests) — the cache update is enough */
  }
}

export function isGitHubSignedIn(): boolean {
  return getGitHubToken() !== null;
}

/** Authorization header for GitHub API calls, or {} when signed out. */
export function githubAuthHeaders(): Record<string, string> {
  const token = getGitHubToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
