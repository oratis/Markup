import { useEffect, useRef, useState } from "react";
import { useT } from "../lib/i18n";
import { parseQuery, pathMatches } from "../lib/search-operators";
import { filesForTag } from "../lib/tag-index-store";
import { readFile, searchVault } from "../lib/tauri";
import type { SearchHit } from "../lib/types";
import { useAppStore } from "../store";

interface SearchPanelProps {
  onClose: () => void;
  /** Optional pre-filled query — runs the search immediately on mount. */
  initialQuery?: string;
}

export function SearchPanel({ onClose, initialQuery = "" }: SearchPanelProps) {
  const t = useT();
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const parsed = parseQuery(query);
        // If only operators (no free text), evaluate locally via indices.
        if (!parsed.text && (parsed.tags.length > 0 || parsed.paths.length > 0)) {
          let paths: string[] = [];
          if (parsed.tags.length > 0) {
            const sets = parsed.tags.map((t) => new Set(filesForTag(t)));
            // Intersection (AND) of all tag buckets.
            const [first, ...rest] = sets;
            paths = [...(first ?? new Set())].filter((p) => rest.every((s) => s.has(p)));
          } else {
            // Path-only — fall back to vault files list.
            paths = useAppStore.getState().vaultFiles.map((f) => f.path);
          }
          paths = paths.filter((p) => pathMatches(p, parsed.paths));
          const out: SearchHit[] = paths.slice(0, 200).map((p) => ({
            path: p,
            title: p.slice(p.lastIndexOf("/") + 1),
            mtime_ms: 0,
            score: 0,
          }));
          if (!cancelled) setHits(out);
          return;
        }
        // Free-text (with optional path filter) goes through Rust.
        const r = await searchVault(parsed.text || query, 50);
        const filtered =
          parsed.paths.length > 0
            ? r.filter((h) => pathMatches(h.path, parsed.paths))
            : r;
        if (!cancelled) setHits(filtered);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  async function open(path: string) {
    try {
      const loaded = await readFile(path);
      openLoadedFile(loaded);
      onClose();
    } catch (e) {
      console.error("readFile failed", e);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-start justify-center pt-[10vh] z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] max-w-[92vw] rounded-md shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 overflow-hidden"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          placeholder={t("search.placeholder")}
          className="w-full px-4 py-3 text-[14px] bg-transparent outline-none border-b border-black/5 dark:border-white/10"
        />
        <div className="max-h-[60vh] overflow-auto no-scrollbar">
          {busy && <div className="px-4 py-2 text-xs opacity-50">{t("search.busy")}</div>}
          {error && <div className="px-4 py-2 text-xs text-red-500">{error}</div>}
          {!busy && !error && hits.length === 0 && query.trim() && (
            <div className="px-4 py-2 text-xs opacity-50">{t("search.empty")}</div>
          )}
          {hits.map((h) => (
            <button
              key={h.path}
              onClick={() => open(h.path)}
              className="w-full text-left px-4 py-2 text-[12px] hover:bg-black/5 dark:hover:bg-white/10 border-b border-black/5 dark:border-white/5"
            >
              <div className="font-medium truncate">{h.title || h.path}</div>
              <div className="text-[10px] opacity-50 truncate">{h.path}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
