import { useState } from "react";
import { contentsApiUrl, fileName, parseGitHubLink } from "../lib/github-link";

interface Props {
  onClose: () => void;
  /** Called with (name, content) when a file is fetched. */
  onOpen: (name: string, content: string) => void;
}

/**
 * Paste a GitHub file link and open its contents as a new unsaved buffer.
 * Public repos need no sign-in; uses the REST contents API (raw Accept).
 */
export function GitHubOpenDialog({ onClose, onOpen }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    const link = parseGitHubLink(url);
    if (!link) {
      setError("Not a valid GitHub link");
      return;
    }
    if (link.isDirectory) {
      setError("That link points to a folder, not a file.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(contentsApiUrl(link), {
        headers: {
          Accept: "application/vnd.github.raw+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!res.ok) {
        setError(
          res.status === 404
            ? "File not found (or the repo is private)."
            : res.status === 403
              ? "GitHub rate limit reached."
              : `GitHub request failed (HTTP ${res.status}).`,
        );
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

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-[92vw] rounded-lg shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 p-5"
      >
        <div className="text-base font-semibold mb-3">Open from GitHub</div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) open();
          }}
          placeholder="github.com/owner/repo/blob/main/README.md"
          className="w-full px-2 py-1.5 rounded border border-black/10 dark:border-white/20 bg-transparent outline-none focus:border-blue-500 text-[13px]"
        />
        {error && <div className="mt-2 text-[12px] text-red-500">{error}</div>}
        <div className="mt-4 flex items-center justify-end gap-2 text-[12px]">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={open}
            disabled={loading || url.trim() === ""}
            className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Opening…" : "Open"}
          </button>
        </div>
      </div>
    </div>
  );
}
