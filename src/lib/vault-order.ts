/**
 * The canonical vault file order — shared by the FileTree and the reader's
 * prev/next pager so "next document" always matches what you see in the tree.
 */
import type { VaultFile } from "../store";

const MARKDOWN = /\.(md|markdown|mdx|mkd)$/i;

/** Sort a copy of `files` the way the FileTree displays them. */
export function sortVaultFiles(
  files: VaultFile[],
  vaultSort: "name" | "mtime",
): VaultFile[] {
  const copy = [...files];
  if (vaultSort === "mtime") {
    copy.sort((a, b) => b.mtimeMs - a.mtimeMs);
  } else {
    copy.sort((a, b) => a.relPath.localeCompare(b.relPath));
  }
  return copy;
}

/** Parent-directory path of `path` (everything before the last "/"). */
export function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? "" : path.slice(0, i);
}

/**
 * Markdown documents in the same folder as `activePath`, in file-tree order —
 * the "this section" list. Empty when there's no active vault file.
 */
export function siblingDocs(
  files: VaultFile[],
  vaultSort: "name" | "mtime",
  activePath: string | null | undefined,
): VaultFile[] {
  if (!activePath) return [];
  const dir = parentDir(activePath);
  return sortVaultFiles(files, vaultSort).filter(
    (f) => MARKDOWN.test(f.name) && parentDir(f.path) === dir,
  );
}

export interface Adjacent {
  prev: VaultFile | null;
  next: VaultFile | null;
}

/**
 * The Markdown documents immediately before/after `activePath` in the
 * file-tree order — the reader pager's targets. Canvas/HTML are skipped (they
 * open in their own views); a file outside the vault yields no neighbours.
 */
export function adjacentDocs(
  files: VaultFile[],
  vaultSort: "name" | "mtime",
  activePath: string | null | undefined,
): Adjacent {
  if (!activePath) return { prev: null, next: null };
  const docs = sortVaultFiles(files, vaultSort).filter((f) => MARKDOWN.test(f.name));
  const i = docs.findIndex((f) => f.path === activePath);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? docs[i - 1] : null,
    next: i < docs.length - 1 ? docs[i + 1] : null,
  };
}
