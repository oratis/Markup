import { getVersion } from "@tauri-apps/api/app";

/** GitHub release shape — only the fields we use. */
export interface LatestRelease {
  tagName: string; // e.g. "v0.4.0"
  version: string; // e.g. "0.4.0"
  htmlUrl: string; // release page URL
  publishedAt: string;
  name: string | null;
  body: string | null;
}

const REPO = "oratis/Markup";
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const DISMISS_KEY = "markup.updateDismissedVersion";

/**
 * Hit the GitHub Releases API. Returns null on any failure (offline,
 * 404, rate-limited, parse error) — never throws into the UI.
 */
export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tagName = String(data.tag_name ?? "").trim();
    if (!tagName) return null;
    return {
      tagName,
      version: tagName.replace(/^v/i, ""),
      htmlUrl: String(data.html_url ?? `https://github.com/${REPO}/releases`),
      publishedAt: String(data.published_at ?? ""),
      name: data.name ?? null,
      body: data.body ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Naive semver compare. Handles `X.Y.Z[-pre]` numerics; ignores
 * pre-release ordering (any tag with a `-` is considered "less than"
 * its base release, which matches what users expect: 0.4.0 > 0.4.0-rc1).
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const norm = (v: string) => v.replace(/^v/i, "").split("-")[0].split(".");
  const a = norm(latest).map((s) => Number.parseInt(s, 10) || 0);
  const b = norm(current).map((s) => Number.parseInt(s, 10) || 0);
  const len = Math.max(a.length, b.length, 3);
  for (let i = 0; i < len; i++) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  // exactly equal numerics — if `current` has a pre-release suffix and
  // `latest` doesn't, latest is newer.
  const aPre = latest.includes("-");
  const bPre = current.includes("-");
  if (!aPre && bPre) return true;
  return false;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  current: string;
  latest: LatestRelease | null;
  /** True iff the user has previously dismissed this exact version. */
  dismissed: boolean;
}

export async function checkUpdateAgainstGithub(): Promise<UpdateCheckResult> {
  const current = await getVersion();
  const latest = await fetchLatestRelease();
  if (!latest) {
    return { hasUpdate: false, current, latest: null, dismissed: false };
  }
  const hasUpdate = isNewerVersion(latest.version, current);
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === latest.version;
  } catch {
    /* ignore */
  }
  return { hasUpdate, current, latest, dismissed };
}

export function dismissUpdate(version: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, version);
  } catch {
    /* ignore */
  }
}

export function clearDismissed(): void {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}
