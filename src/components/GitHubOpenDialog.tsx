import { useState } from "react";
import {
  childLink,
  contentsApiUrl,
  fileName,
  type GitHubEntry,
  type GitHubLink,
  parseContents,
  parseGitHubLink,
} from "../lib/github-link";

interface Props {
  onClose: () => void;
  /** Called with (name, content) when a file is fetched. */
  onOpen: (name: string, content: string) => void;
}

const JSON_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};
const RAW_HEADERS = {
  Accept: "application/vnd.github.raw+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

function httpError(status: number): string {
  if (status === 404) return "Not found (or the repo is private).";
  if (status === 403) return "GitHub rate limit reached.";
  return `GitHub request failed (HTTP ${status}).`;
}

/**
 * Open a file from GitHub, or browse a repo/folder and pick one. Public repos
 * need no sign-in; uses the REST contents API. The fetched file opens as a new
 * unsaved buffer.
 */
export function GitHubOpenDialog({ onClose, onOpen }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Browse stack: empty = the URL input; non-empty = browsing the last dir.
  const [stack, setStack] = useState<GitHubLink[]>([]);
  const [entries, setEntries] = useState<GitHubEntry[]>([]);

  const browsing = stack.length > 0;
  const current = stack[stack.length - 1];

  async function openFile(link: GitHubLink) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(contentsApiUrl(link), { headers: RAW_HEADERS });
      if (!res.ok) {
        setError(httpError(res.status));
        return;
      }
      onOpen(fileName(link), await res.text());
      onClose();
    } catch {
      setError("Network error reaching GitHub.");
    } finally {
      setLoading(false);
    }
  }

  async function enterDir(link: GitHubLink, push: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(contentsApiUrl(link), { headers: JSON_HEADERS });
      if (!res.ok) {
        setError(httpError(res.status));
        return;
      }
      setEntries(parseContents(await res.json()));
      setStack((s) => (push ? [...s, link] : s));
    } catch {
      setError("Network error reaching GitHub.");
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    const link = parseGitHubLink(url);
    if (!link) {
      setError("Not a valid GitHub link");
      return;
    }
    if (link.isDirectory) enterDir(link, true);
    else openFile(link);
  }

  function back() {
    const next = stack.slice(0, -1);
    setStack(next);
    if (next.length > 0) enterDir(next[next.length - 1], false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-[92vw] rounded-lg shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 p-5"
      >
        <div className="text-base font-semibold mb-3 flex items-center gap-2">
          {browsing && (
            <button
              onClick={back}
              className="opacity-70 hover:opacity-100"
              aria-label="Back"
            >
              ‹
            </button>
          )}
          {browsing ? `${current.repo}/${current.path}` : "Open from GitHub"}
        </div>

        {!browsing && (
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) submit();
            }}
            placeholder="owner/repo  or  github.com/owner/repo/blob/main/README.md"
            className="w-full px-2 py-1.5 rounded border border-black/10 dark:border-white/20 bg-transparent outline-none focus:border-blue-500 text-[13px]"
          />
        )}

        {browsing && (
          <div className="max-h-[320px] overflow-auto rounded border border-black/10 dark:border-white/15">
            {entries.length === 0 && !loading && (
              <div className="px-3 py-4 text-[12px] opacity-60">Empty folder</div>
            )}
            {entries.map((e) => (
              <button
                key={e.path}
                onClick={() =>
                  e.isDir
                    ? enterDir(childLink(current, e), true)
                    : openFile(childLink(current, e))
                }
                className="w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 border-b border-black/5 dark:border-white/10 last:border-0"
              >
                <span className="opacity-60">{e.isDir ? "📁" : "📄"}</span>
                {e.name}
              </button>
            ))}
          </div>
        )}

        {error && <div className="mt-2 text-[12px] text-red-500">{error}</div>}

        <div className="mt-4 flex items-center justify-end gap-2 text-[12px]">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {browsing ? "Done" : "Cancel"}
          </button>
          {!browsing && (
            <button
              onClick={submit}
              disabled={loading || url.trim() === ""}
              className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Opening…" : "Open"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
