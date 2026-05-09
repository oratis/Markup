import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../store";
import { readFile } from "../lib/tauri";

interface QuickOpenProps {
  onClose: () => void;
}

export function QuickOpen({ onClose }: QuickOpenProps) {
  const files = useAppStore((s) => s.vaultFiles);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
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
      .map((f) => {
        const score = scoreSubsequence(f.relPath.toLowerCase(), q);
        return { f, score };
      })
      .filter((x) => x.score > -Infinity)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((x) => x.f);
  }, [files, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  async function pick(idx: number) {
    const file = matches[idx];
    if (!file) return;
    try {
      const loaded = await readFile(file.path);
      openLoadedFile(loaded);
      onClose();
    } catch (e) {
      console.error("readFile failed", e);
    }
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
          placeholder="Open file in vault…"
          className="w-full px-4 py-3 text-[14px] bg-transparent outline-none border-b border-black/5 dark:border-white/10"
        />
        <div className="max-h-[40vh] overflow-auto no-scrollbar">
          {matches.map((f, i) => (
            <button
              key={f.path}
              onClick={() => pick(i)}
              onMouseEnter={() => setSelected(i)}
              className={`w-full text-left px-4 py-1.5 text-[12px] flex items-center gap-2 ${
                i === selected ? "bg-black/10 dark:bg-white/15" : ""
              }`}
            >
              <span className="truncate flex-1">{f.relPath}</span>
              <span className="opacity-40 text-[10px]">{f.name}</span>
            </button>
          ))}
          {matches.length === 0 && (
            <div className="px-4 py-3 text-xs opacity-50">No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Greedy subsequence match. Returns score, -Infinity if no match. */
function scoreSubsequence(haystack: string, needle: string): number {
  let score = 0;
  let h = 0;
  let lastMatchH = -1;
  for (let n = 0; n < needle.length; n++) {
    while (h < haystack.length && haystack[h] !== needle[n]) h++;
    if (h >= haystack.length) return -Infinity;
    // bonuses: consecutive runs, after a separator
    if (lastMatchH === h - 1) score += 3;
    else score += 1;
    if (h === 0 || /[\/_\-. ]/.test(haystack[h - 1])) score += 2;
    lastMatchH = h;
    h++;
  }
  // shorter haystack wins ties
  score -= haystack.length * 0.01;
  return score;
}
