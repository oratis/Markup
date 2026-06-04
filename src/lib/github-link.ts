/**
 * Parse GitHub web / raw URLs into a structured reference, and build the raw /
 * REST-contents URLs for fetching. Mirrors the Swift `GitHubLinkParser` in
 * MarkupKit so both platforms behave identically.
 */
export interface GitHubLink {
  owner: string;
  repo: string;
  /** Branch / tag / commit SHA, or null for the default branch. */
  ref: string | null;
  /** Path within the repo ("" for the repo root). */
  path: string;
  isDirectory: boolean;
}

export function fileName(link: GitHubLink): string {
  if (!link.path) return link.repo;
  const parts = link.path.split("/");
  return parts[parts.length - 1] || link.repo;
}

const stripGit = (s: string) => (s.endsWith(".git") ? s.slice(0, -4) : s);
const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** One entry in a GitHub directory listing (REST contents API). */
export interface GitHubEntry {
  name: string;
  path: string;
  isDir: boolean;
}

/** Parse a contents-API directory listing; folders first, then files,
 *  each alphabetical. Returns [] for a non-array (e.g. a file) or bad input. */
export function parseContents(json: unknown): GitHubEntry[] {
  if (!Array.isArray(json)) return [];
  const entries: GitHubEntry[] = json
    .filter(
      (e): e is { name: string; path: string; type: string } =>
        !!e && typeof e.name === "string" && typeof e.path === "string",
    )
    .map((e) => ({ name: e.name, path: e.path, isDir: e.type === "dir" }));
  return entries.sort((a, b) =>
    a.isDir !== b.isDir
      ? a.isDir
        ? -1
        : 1
      : a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** A child directory/file link for navigating into `entry` from `parent`. */
export function childLink(parent: GitHubLink, entry: GitHubEntry): GitHubLink {
  return {
    owner: parent.owner,
    repo: parent.repo,
    ref: parent.ref,
    path: entry.path,
    isDirectory: entry.isDir,
  };
}

export function parseGitHubLink(input: string): GitHubLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Bare "owner/repo" (no scheme/host) → repo root.
  if (!trimmed.includes("://") && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    const [owner, repo] = trimmed.split("/");
    return { owner, repo: stripGit(repo), ref: null, path: "", isDirectory: true };
  }
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const segs = url.pathname.split("/").filter(Boolean);

  if (host === "github.com" || host === "www.github.com") {
    if (segs.length < 2) return null;
    const owner = segs[0];
    const repo = stripGit(segs[1]);
    if (segs.length >= 4 && (segs[2] === "blob" || segs[2] === "tree")) {
      const isDir = segs[2] === "tree";
      const ref = segs[3];
      const path = decode(segs.slice(4).join("/"));
      return { owner, repo, ref, path, isDirectory: isDir || path === "" };
    }
    return { owner, repo, ref: null, path: "", isDirectory: true };
  }

  if (host === "raw.githubusercontent.com" || host === "raw.github.com") {
    if (segs.length < 3) return null;
    const path = decode(segs.slice(3).join("/"));
    return {
      owner: segs[0],
      repo: stripGit(segs[1]),
      ref: segs[2],
      path,
      isDirectory: path === "",
    };
  }

  return null;
}

/** The GitHub REST contents API URL for a file/folder. */
export function contentsApiUrl(link: GitHubLink): string {
  const base = `https://api.github.com/repos/${link.owner}/${link.repo}/contents/${link.path}`;
  return link.ref ? `${base}?ref=${encodeURIComponent(link.ref)}` : base;
}

/** The raw.githubusercontent.com URL for a file (needs a ref); null otherwise. */
export function rawUrl(link: GitHubLink): string | null {
  if (link.isDirectory || !link.path || !link.ref) return null;
  const encPath = link.path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${link.owner}/${link.repo}/${link.ref}/${encPath}`;
}
