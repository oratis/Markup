import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { type UnlistenFn, listen } from "@tauri-apps/api/event";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import type { LoadedFile, SearchHit, VaultFile, VaultOpened } from "./types";

export { getVersion };

/** Grant the Rust write-scope guard access to `paths` (used after the user
 * picks a destination through an OS dialog — an explicit authorization). */
export async function authorizePaths(paths: string[]): Promise<void> {
  await invoke("authorize_paths", { paths });
}

export async function pickSavePath(defaultName: string): Promise<string | null> {
  const path = await saveDialog({
    title: "Save Markdown File",
    defaultPath: defaultName,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
  });
  // The user explicitly chose this destination → authorize writing it before
  // the caller's write_file call hits the backend scope guard.
  if (path) await authorizePaths([path]);
  return path ?? null;
}

export async function openFileDialog(): Promise<LoadedFile | null> {
  return await invoke<LoadedFile | null>("open_file");
}

export async function readFile(path: string): Promise<LoadedFile> {
  return await invoke<LoadedFile>("read_file", { path });
}

export async function writeFile(
  path: string,
  content: string,
  expectedMtimeMs: number | null,
): Promise<number> {
  return await invoke<number>("write_file", {
    path,
    content,
    expectedMtimeMs,
  });
}

export async function renameFile(from: string, to: string): Promise<void> {
  await invoke("rename_file", { from, to });
}

export async function trashFile(path: string): Promise<void> {
  await invoke("trash_file", { path });
}

export async function writeImage(
  vaultRoot: string,
  dirRelative: string,
  bytes: Uint8Array,
  ext: string,
): Promise<string> {
  return await invoke<string>("write_image", {
    vaultRoot,
    dirRelative,
    bytes: Array.from(bytes),
    ext,
  });
}

export async function renderHtml(
  content: string,
  title: string | null,
  theme: "github" | "plain" | "tufte" = "github",
): Promise<string> {
  return await invoke<string>("render_html", { content, title, theme });
}

/** Write rendered preview HTML to a temp file (Rust-side, bypasses the
 * JS fs scope) and return its absolute path. */
export async function writePreviewHtml(html: string, baseName: string): Promise<string> {
  return await invoke<string>("write_preview_html", { html, baseName });
}

export async function pickVault(): Promise<string | null> {
  return await invoke<string | null>("pick_vault");
}

export async function openVault(path: string): Promise<VaultOpened> {
  return await invoke<VaultOpened>("open_vault", { path });
}

export async function closeVault(): Promise<void> {
  await invoke("close_vault");
}

/** Resolve the last vault for launch-time restore. On sandbox builds this
 * re-acquires folder access via a security-scoped bookmark. Returns the
 * path to open, or null if there's nothing to restore. */
export async function restoreVault(): Promise<string | null> {
  return await invoke<string | null>("restore_vault");
}

export async function listVaultFiles(): Promise<VaultFile[]> {
  return await invoke<VaultFile[]>("list_vault_files");
}

export async function currentVault(): Promise<string | null> {
  return await invoke<string | null>("current_vault");
}

export async function searchVault(query: string, limit = 50): Promise<SearchHit[]> {
  return await invoke<SearchHit[]>("search_vault", { query, limit });
}

export async function listenMenu(cb: (id: string) => void): Promise<UnlistenFn> {
  return await listen<string>("menu-event", (e) => cb(e.payload));
}

export async function setNativeLocale(locale: "auto" | "en" | "zh"): Promise<void> {
  await invoke("set_locale", { locale });
}

export async function openNewWindow(): Promise<void> {
  await invoke("new_window");
}

export async function listRecentFilesNative(): Promise<string[]> {
  return await invoke<string[]>("list_recent_files");
}
export async function pushRecentFileNative(path: string): Promise<void> {
  await invoke("push_recent_file", { path });
}
export async function clearRecentFilesNative(): Promise<void> {
  await invoke("clear_recent_files");
}

export async function listenVaultChanged(cb: () => void): Promise<UnlistenFn> {
  return await listen<void>("vault-changed", () => cb());
}

export interface IndexProgress {
  done: number;
  total: number;
}

/** Progress while a vault is being (re)indexed on open. The frontend shows a
 * transient indicator; a final tick with done === total clears it. */
export async function listenVaultIndexProgress(
  cb: (p: IndexProgress) => void,
): Promise<UnlistenFn> {
  return await listen<IndexProgress>("vault-index-progress", (e) => cb(e.payload));
}

/** Download a GitHub repo and materialize it as a local vault working copy
 * (B301). Returns the local directory path to then `openVault()`. Public
 * repos need no token; pass one to raise rate limits / reach private repos. */
export async function openGitHubRepoVault(
  owner: string,
  repo: string,
  refName?: string,
  token?: string,
): Promise<string> {
  return await invoke<string>("github_open_repo_vault", {
    owner,
    repo,
    refName: refName ?? null,
    token: token ?? null,
  });
}

export interface GitHubVaultProgress {
  /** "download" | "extract" | "manifest". */
  phase: string;
  done: number;
  total: number;
}

/** Progress while a GitHub repo is being downloaded / extracted into a local
 * vault. Fires before the vault is indexed (which then emits its own
 * `vault-index-progress`). */
export async function listenGitHubVaultProgress(
  cb: (p: GitHubVaultProgress) => void,
): Promise<UnlistenFn> {
  return await listen<GitHubVaultProgress>("github-vault-progress", (e) => cb(e.payload));
}

/** Live "open these files" events from macOS (Finder double-click /
 * Open With) while the app is already running. */
export async function listenOpenFiles(
  cb: (paths: string[]) => void,
): Promise<UnlistenFn> {
  return await listen<string[]>("open-files", (e) => cb(e.payload));
}

/** Drain files macOS asked us to open before the listener was ready
 * (cold start via double-click). Returns [] on a normal launch. */
export async function takePendingFiles(): Promise<string[]> {
  return await invoke<string[]>("take_pending_files");
}
