import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { getGitHubToken } from "../lib/github-auth";
import {
  githubProposeChanges,
  githubVaultStatus,
  type VaultFileStatus,
} from "../lib/tauri";

interface Props {
  /** The open GitHub vault's local working-copy root. */
  vaultDir: string;
  /** owner/repo@ref, for the header. */
  label: string;
  onClose: () => void;
}

const STATE_STYLE: Record<string, string> = {
  added: "text-green-600 dark:text-green-400",
  modified: "text-blue-600 dark:text-blue-400",
  deleted: "text-red-500",
};

/**
 * Review local edits to a GitHub vault and open a pull request: pick the files
 * to include, write a title + message, and Markup commits them to a new branch
 * and opens the PR. Requires push access to the repo.
 */
export function ProposeChangesDialog({ vaultDir, label, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<VaultFileStatus[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  useEffect(() => {
    githubVaultStatus(vaultDir)
      .then((s) => {
        setStatus(s);
        setSelected(new Set(s.map((f) => f.path)));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [vaultDir]);

  function toggle(path: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function submit() {
    const paths = status.map((f) => f.path).filter((p) => selected.has(p));
    if (paths.length === 0 || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await githubProposeChanges({
        vaultDir,
        paths,
        message: message.trim() || title.trim(),
        prTitle: title.trim(),
        prBody: body.trim(),
        token: getGitHubToken() ?? undefined,
      });
      setPrUrl(res.prUrl);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting && selected.size > 0 && title.trim().length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[92vw] rounded-lg shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 p-5"
      >
        <div className="text-base font-semibold mb-1">Propose changes to GitHub</div>
        <div className="text-[12px] opacity-60 mb-3">{label}</div>

        {loading && (
          <div className="text-[13px] opacity-70 py-6 text-center">
            Checking for changes…
          </div>
        )}

        {!loading && prUrl !== null && (
          <div className="py-4 text-[13px]">
            <div className="mb-3">Pull request opened.</div>
            <button
              type="button"
              onClick={() => openUrl(prUrl)}
              className="text-blue-500 hover:text-blue-600 underline break-all"
            >
              {prUrl}
            </button>
          </div>
        )}

        {!loading && prUrl === null && status.length === 0 && (
          <div className="text-[13px] opacity-70 py-6 text-center">No local changes.</div>
        )}

        {!loading && prUrl === null && status.length > 0 && (
          <>
            <div className="max-h-[180px] overflow-y-auto no-scrollbar rounded border border-black/10 dark:border-white/15 mb-3">
              {status.map((f) => (
                <label
                  key={f.path}
                  className="flex items-center gap-2 px-2 py-1 text-[12px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(f.path)}
                    onChange={() => toggle(f.path)}
                  />
                  <span className={`w-[58px] shrink-0 ${STATE_STYLE[f.state] ?? ""}`}>
                    {f.state}
                  </span>
                  <span className="truncate" title={f.path}>
                    {f.path}
                  </span>
                </label>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pull request title"
              className="w-full mb-2 px-2 py-1 text-[13px] rounded bg-transparent border border-black/10 dark:border-white/15 outline-none focus:border-blue-500"
            />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Commit message (defaults to the title)"
              className="w-full mb-2 px-2 py-1 text-[13px] rounded bg-transparent border border-black/10 dark:border-white/15 outline-none focus:border-blue-500"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full px-2 py-1 text-[13px] rounded bg-transparent border border-black/10 dark:border-white/15 outline-none focus:border-blue-500 resize-none"
            />
          </>
        )}

        {error && <div className="mt-2 text-[12px] text-red-500">{error}</div>}

        <div className="mt-4 flex items-center justify-end gap-2 text-[12px]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 h-7 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            {prUrl !== null ? "Done" : "Cancel"}
          </button>
          {prUrl === null && status.length > 0 && (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="px-3 h-7 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
            >
              {submitting ? "Opening PR…" : "Create pull request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
