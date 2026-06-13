import { useMemo } from "react";
import { readFile } from "../lib/tauri";
import { adjacentDocs } from "../lib/vault-order";
import { getActiveTab, useAppStore } from "../store";

function stem(name: string): string {
  return name.replace(/\.(md|markdown|mdx|mkd)$/i, "");
}

/**
 * Prev/next pager at the foot of the reader — walk a folder of docs in the
 * same order the file tree shows. Renders nothing when the active doc has no
 * Markdown neighbours (no vault, a lone file, or a directly-opened file).
 */
export function DocPager() {
  const vaultFiles = useAppStore((s) => s.vaultFiles);
  const vaultSort = useAppStore((s) => s.vaultSort);
  const tab = useAppStore(getActiveTab);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);

  const { prev, next } = useMemo(
    () => adjacentDocs(vaultFiles, vaultSort, tab?.path ?? null),
    [vaultFiles, vaultSort, tab?.path],
  );

  if (!prev && !next) return null;

  const open = async (path: string) => {
    try {
      openLoadedFile(await readFile(path));
    } catch (e) {
      console.error("pager open failed", e);
    }
  };

  return (
    <nav className="mk-doc-pager" aria-label="Document navigation">
      {prev ? (
        <button
          type="button"
          className="mk-pager-btn mk-pager-prev"
          onClick={() => open(prev.path)}
        >
          <span className="mk-pager-arrow" aria-hidden>
            ←
          </span>
          <span className="truncate">{stem(prev.name)}</span>
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button
          type="button"
          className="mk-pager-btn mk-pager-next"
          onClick={() => open(next.path)}
        >
          <span className="truncate">{stem(next.name)}</span>
          <span className="mk-pager-arrow" aria-hidden>
            →
          </span>
        </button>
      ) : (
        <span />
      )}
    </nav>
  );
}
