/**
 * GitHub auth state for the desktop app: the OAuth App client id and the
 * stored access token (localStorage). The device-flow networking that obtains
 * the token is added on top of this (Rust commands + a sign-in UI).
 */

/** Markup's GitHub OAuth App Client ID (public; Device Flow uses no secret). */
export const GITHUB_CLIENT_ID = "Ov23lio36dKpIFz413gz";

const TOKEN_KEY = "github.token";

export function getGitHubToken(): string | null {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    return t && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

export function setGitHubToken(token: string | null): void {
  try {
    if (token && token.length > 0) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
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
