/**
 * Title-bar breadcrumb: the intermediate folders between the vault root and
 * the open file, so reading a nested doc shows where it sits in the "site"
 * (e.g. `docs / guides / setup.md` instead of just `setup.md`).
 */

export interface Crumb {
  /** Folder name shown in the breadcrumb. */
  name: string;
  /** Cumulative vault-relative path of this folder (e.g. "docs/guides"). */
  path: string;
}

/**
 * Intermediate folder segments of `filePath` relative to `vaultRoot`, each
 * carrying its cumulative vault-relative path. Empty when the file is at the
 * vault root or outside the vault (a directly-opened file). The filename
 * itself is not included — the toolbar renders it separately.
 */
export function breadcrumbDirs(
  filePath: string | null | undefined,
  vaultRoot: string | null | undefined,
): Crumb[] {
  if (!filePath || !vaultRoot) return [];
  const root = vaultRoot.replace(/\/+$/, "");
  const prefix = `${root}/`;
  if (!filePath.startsWith(prefix)) return [];
  const rel = filePath.slice(prefix.length);
  const parts = rel.split("/").filter(Boolean);
  parts.pop(); // drop the filename
  const crumbs: Crumb[] = [];
  let acc = "";
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : p;
    crumbs.push({ name: p, path: acc });
  }
  return crumbs;
}
