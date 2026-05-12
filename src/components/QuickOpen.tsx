import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { scoreSubsequence } from "../lib/fuzzy";
import {
  type HeadingEntry,
  getAllHeadings,
  subscribe as subscribeHeadings,
} from "../lib/heading-index-store";
import { useT } from "../lib/i18n";
import { readFile } from "../lib/tauri";
import { useAppStore } from "../store";

interface QuickOpenProps {
  onClose: () => void;
}

const EMPTY_HEADINGS: HeadingEntry[] = [];

function useAllHeadings(): HeadingEntry[] {
  return useSyncExternalStore(subscribeHeadings, getAllHeadings, () => EMPTY_HEADINGS);
}

function basename(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}

export function QuickOpen({ onClose }: QuickOpenProps) {
  const t = useT();
  const files = useAppStore((s) => s.vaultFiles);
  const openLoadedFile = useAppStore((s) => s.openLoadedFile);
  const headings = useAllHeadings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mode switch on `#` prefix.
  const isHeadingMode = query.startsWith("#");
  const headingQuery = isHeadingMode ? query.slice(1).trim().toLowerCase() : "";

  const fileMatches = useMemo(() => {
    if (isHeadingMode) return [];
    if (!query.trim()) return files.slice(0, 50);
    const q = query.toLowerCase();
    return files
      .map((f) => {
        const score = scoreSubsequence(f.relPath.toLowerCase(), q);
        return { f, score };
      })
      .filter((x) => x.score > Number.NEGATIVE_INFINITY)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((x) => x.f);
  }, [files, query, isHeadingMode]);

  const headingMatches = useMemo(() => {
    if (!isHeadingMode) return [];
    if (!headingQuery) return headings.slice(0, 50);
    return headings
      .map((h) => {
        const score = scoreSubsequence(h.text.toLowerCase(), headingQuery);
        return { h, score };
      })
      .filter((x) => x.score > Number.NEGATIVE_INFINITY)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((x) => x.h);
  }, [headings, headingQuery, isHeadingMode]);

  const totalCount = isHeadingMode ? headingMatches.length : fileMatches.length;

  useEffect(() => {
    setSelected(0);
  }, [query]);

  async function pickFile(idx: number) {
    const file = fileMatches[idx];
    if (!file) return;
    try {
      const loaded = await readFile(file.path);
      openLoadedFile(loaded);
      onClose();
    } catch (e) {
      console.error("readFile failed", e);
    }
  }

  async function pickHeading(idx: number) {
    const h = headingMatches[idx];
    if (!h) return;
    try {
      const loaded = await readFile(h.path);
      openLoadedFile(loaded);
      onClose();
      window.requestAnimationFrame(() => {
        window.dispatchEvent(
          new CustomEvent("markup:jump-to-line", { detail: { line: h.line } }),
        );
      });
    } catch (e) {
      console.error("readFile failed", e);
    }
  }

  function pick(idx: number) {
    if (isHeadingMode) pickHeading(idx);
    else pickFile(idx);
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
              setSelected((s) => Math.min(totalCount - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(selected);
            }
          }}
          placeholder={
            isHeadingMode ? t("quickOpen.headingPlaceholder") : t("quickOpen.placeholder")
          }
          className="w-full px-4 py-3 text-[14px] bg-transparent outline-none border-b border-black/5 dark:border-white/10"
        />
        <div className="max-h-[40vh] overflow-auto no-scrollbar">
          {!isHeadingMode &&
            fileMatches.map((f, i) => (
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
          {isHeadingMode &&
            headingMatches.map((h, i) => (
              <button
                key={`${h.path}:${h.line}`}
                onClick={() => pick(i)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full text-left px-4 py-1.5 text-[12px] flex items-center gap-2 ${
                  i === selected ? "bg-black/10 dark:bg-white/15" : ""
                }`}
              >
                <span className="opacity-40 text-[10px] w-5 shrink-0">H{h.level}</span>
                <span className="truncate flex-1">{h.text}</span>
                <span className="opacity-40 text-[10px]">{basename(h.path)}</span>
              </button>
            ))}
          {totalCount === 0 && (
            <div className="px-4 py-3 text-xs opacity-50">{t("quickOpen.empty")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
