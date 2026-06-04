import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getGitHubToken,
  githubAuthHeaders,
  isGitHubSignedIn,
  setGitHubToken,
} from "../lib/github-auth";
import { awaitDeviceToken, startDeviceFlow } from "../lib/github-device-client";
import type { GitHubDeviceCode } from "../lib/github-device-flow";
import {
  childLink,
  contentsApiUrl,
  fileName,
  type GitHubEntry,
  type GitHubLink,
  type GitHubRepo,
  parseContents,
  parseGitHubLink,
  parseRepos,
  repoLink,
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
  if (status === 401) return "Sign-in expired — please sign in again.";
  if (status === 403) return "GitHub rate limit reached.";
  return `GitHub request failed (HTTP ${status}).`;
}

/**
 * Open a file from GitHub, or browse a repo/folder and pick one. Public repos
 * need no sign-in; signing in (OAuth device flow) raises rate limits, unlocks
 * private repos, and lists your repositories. The fetched file opens as a new
 * unsaved buffer.
 */
export function GitHubOpenDialog({ onClose, onOpen }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Browse stack: empty = the URL input; non-empty = browsing the last dir.
  const [stack, setStack] = useState<GitHubLink[]>([]);
  const [entries, setEntries] = useState<GitHubEntry[]>([]);

  // Auth + repos list.
  const [signedIn, setSignedIn] = useState(isGitHubSignedIn());
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [signInCode, setSignInCode] = useState<GitHubDeviceCode | null>(null);
  const signInAbort = useRef<AbortController | null>(null);

  const browsing = stack.length > 0;
  const current = stack[stack.length - 1];

  const loadRepos = useCallback(async () => {
    if (!isGitHubSignedIn()) return;
    setReposLoading(true);
    try {
      const res = await fetch(
        "https://api.github.com/user/repos?per_page=100&sort=updated",
        {
          headers: { ...JSON_HEADERS, ...githubAuthHeaders() },
        },
      );
      if (res.ok) setRepos(parseRepos(await res.json()));
    } catch {
      /* leave repos empty; URL entry still works */
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) loadRepos();
  }, [signedIn, loadRepos]);

  // Stop any in-flight poll when the dialog unmounts.
  useEffect(() => () => signInAbort.current?.abort(), []);

  async function signIn() {
    setError(null);
    try {
      const code = await startDeviceFlow();
      setSignInCode(code);
      const controller = new AbortController();
      signInAbort.current = controller;
      const outcome = await awaitDeviceToken(code, controller.signal);
      setSignInCode(null);
      if (outcome.kind === "authorized") {
        setSignedIn(true);
      } else if (outcome.kind === "denied") {
        setError("Authorization was denied.");
      } else if (outcome.kind === "expired") {
        setError("The code expired — please try again.");
      } else if (outcome.kind === "failed") {
        setError(outcome.message);
      }
    } catch (e) {
      setSignInCode(null);
      setError(String(e));
    }
  }

  function signOut() {
    setGitHubToken(null);
    setSignedIn(false);
    setRepos([]);
  }

  async function openFile(link: GitHubLink) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(contentsApiUrl(link), {
        headers: { ...RAW_HEADERS, ...githubAuthHeaders() },
      });
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
      const res = await fetch(contentsApiUrl(link), {
        headers: { ...JSON_HEADERS, ...githubAuthHeaders() },
      });
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

  const haveToken = getGitHubToken() !== null;

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
          <span className="flex-1">
            {browsing ? `${current.repo}/${current.path}` : "Open from GitHub"}
          </span>
          {!browsing &&
            (haveToken ? (
              <button
                onClick={signOut}
                className="text-[12px] font-normal opacity-70 hover:opacity-100 hover:text-red-500"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={signIn}
                disabled={signInCode !== null}
                className="text-[12px] font-normal text-blue-500 hover:text-blue-600 disabled:opacity-50"
              >
                Sign in
              </button>
            ))}
        </div>

        {/* Device-flow sign-in panel */}
        {!browsing && signInCode && (
          <div className="mb-3 rounded border border-blue-500/40 bg-blue-500/5 p-3 text-[13px]">
            <div className="opacity-80 mb-2">Enter this code at GitHub:</div>
            <div className="flex items-center gap-3 mb-2">
              <code className="text-lg font-mono tracking-widest select-all">
                {signInCode.userCode}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(signInCode.userCode)}
                className="text-[12px] px-2 py-0.5 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => openUrl(signInCode.verificationUri)}
              className="text-[12px] text-blue-500 hover:text-blue-600 underline"
            >
              Open {signInCode.verificationUri}
            </button>
            <div className="mt-2 text-[12px] opacity-60">Waiting for authorization…</div>
          </div>
        )}

        {!browsing && !signInCode && (
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

        {/* Your repositories (signed in, not browsing, not mid-sign-in) */}
        {!browsing && !signInCode && haveToken && (
          <div className="mt-3">
            <div className="text-[12px] uppercase tracking-wide opacity-50 mb-1">
              Your repositories
            </div>
            <div className="max-h-[260px] overflow-auto rounded border border-black/10 dark:border-white/15">
              {reposLoading && (
                <div className="px-3 py-4 text-[12px] opacity-60">Loading…</div>
              )}
              {!reposLoading && repos.length === 0 && (
                <div className="px-3 py-4 text-[12px] opacity-60">No repositories.</div>
              )}
              {repos.map((r) => (
                <button
                  key={r.fullName}
                  onClick={() => enterDir(repoLink(r), true)}
                  className="w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 border-b border-black/5 dark:border-white/10 last:border-0"
                >
                  <span className="opacity-60">{r.isPrivate ? "🔒" : "📦"}</span>
                  <span className="flex-1 truncate">{r.fullName}</span>
                </button>
              ))}
            </div>
          </div>
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
          {!browsing && !signInCode && (
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
