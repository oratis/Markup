import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../lib/i18n";
import { useAppStore } from "../store";

interface Props {
  /** Insert the wikilink string at the editor's current selection. */
  onInsert: (text: string) => void;
  onClose: () => void;
  /**
   * "full" — insert `[[name]]` (default, manual command path).
   * "completion" — insert `name]]` only, assuming the user typed `[[`
   * which is already in the document.
   */
  mode?: "full" | "completion";
}

/**
 * Inline picker for "Insert Wikilink…" — shows vault files, fuzzy-filtered
 * by typed query, and inserts `[[name]]` (without extension) at the
 * editor's current selection. Reuses the same scoring as QuickOpen.
 */
export function WikilinkPicker({ onInsert, onClose, mode = "full" }: Props) {
  const t = useT();
  const files = useAppStore((s) => s.vaultFiles);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = useMemo(() => {
    if (!query.trim()) return files.slice(0, 50);
    const q = query.toLowerCase();
    return files
      .map((f) => ({ f, score: scoreSubsequence(f.relPath.toLowerCase(), q) }))
      .filter((x) => x.score > Number.NEGATIVE_INFINITY)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((x) => x.f);
  }, [files, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  function pick(idx: number) {
    const f = matches[idx];
    if (!f) return;
    const base = f.name.replace(/\.(md|markdown|mdx|mkd)$/i, "");
    onInsert(mode === "completion" ? `${base}]]` : `[[${base}]]`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-start justify-center pt-[14vh] z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] max-w-[90vw] rounded-md shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 overflow-hidden"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(matches.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(selected);
            }
          }}
          placeholder={t("wikilinkPicker.placeholder")}
          className="w-full px-4 py-3 text-[14px] bg-transparent outline-none border-b border-black/5 dark:border-white/10"
        />
        <div className="max-h-[40vh] overflow-auto no-scrollbar">
          {matches.map((f, i) => {
            const base = f.name.replace(/\.(md|markdown|mdx|mkd)$/i, "");
            return (
              <button
                key={f.path}
                onClick={() => pick(i)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full text-left px-4 py-1.5 text-[12px] flex items-center gap-2 ${
                  i === selected ? "bg-black/10 dark:bg-white/15" : ""
                }`}
              >
                <span className="font-mono opacity-70">[[{base}]]</span>
                <span className="opacity-40 text-[11px] truncate">{f.relPath}</span>
              </button>
            );
          })}
          {matches.length === 0 && (
            <div className="px-4 py-3 text-xs opacity-50">{t("quickOpen.empty")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function scoreSubsequence(haystack: string, needle: string): number {
  let score = 0;
  let h = 0;
  let lastMatchH = -1;
  for (let n = 0; n < needle.length; n++) {
    while (h < haystack.length && haystack[h] !== needle[n]) h++;
    if (h >= haystack.length) return Number.NEGATIVE_INFINITY;
    if (lastMatchH === h - 1) score += 3;
    else score += 1;
    if (h === 0 || /[/_\-. ]/.test(haystack[h - 1])) score += 2;
    lastMatchH = h;
    h++;
  }
  score -= haystack.length * 0.01;
  return score;
}
