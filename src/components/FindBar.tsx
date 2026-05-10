import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../lib/i18n";
import { replaceAll } from "../lib/text-replace";
import { getActiveTab, useAppStore } from "../store";

interface Props {
  /** When true, this is rendered in source mode — CM6 has its own search
   * panel; this bar is suppressed because CM6 binds ⌘F natively. */
  sourceMode: boolean;
  onClose: () => void;
}

/** Count occurrences of `query` in `text`, case-insensitive. Bounded at
 *  9999 to avoid O(n) work on pathological docs. */
function countMatches(text: string, query: string): number {
  if (!query) return 0;
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  let count = 0;
  let i = 0;
  while (true) {
    const idx = haystack.indexOf(needle, i);
    if (idx < 0) break;
    count++;
    if (count >= 9999) break;
    i = idx + needle.length;
  }
  return count;
}

/**
 * Floating in-file find bar. Uses the WebKit-supported, non-standard
 * `window.find(string, caseSensitive, backwards, wrapAround)` API to search
 * within the live document. Adequate for the WYSIWYG view; for source mode
 * we defer to CodeMirror's native search overlay (⌘F).
 */
export function FindBar({ sourceMode, onClose }: Props) {
  const t = useT();
  const tab = useAppStore(getActiveTab);
  const updateActiveContent = useAppStore((s) => s.updateActiveContent);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [missing, setMissing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const total = useMemo(
    () => (tab && query ? countMatches(tab.content, query) : 0),
    [tab?.content, query],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function findNext(backwards = false) {
    if (!query) return;
    // @ts-expect-error — window.find is non-standard but works in WebKit/Tauri
    const found: boolean = window.find(query, false, backwards, true);
    setMissing(!found);
  }

  function handleReplaceAll() {
    if (!query || !tab) return;
    const result = replaceAll(tab.content, query, replacement);
    if (result.count === 0) {
      setMissing(true);
      return;
    }
    updateActiveContent(result.text);
  }

  if (sourceMode) {
    return (
      <div className="absolute top-12 right-3 z-40 px-3 py-2 rounded shadow-lg bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 text-[12px]">
        <span className="opacity-70">{t("find.cmHint")}</span>
        <button onClick={onClose} className="ml-3 opacity-60 hover:opacity-100">
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-12 right-3 z-40 flex flex-col gap-1 px-2 py-1 rounded shadow-lg bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setMissing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "Enter") {
              e.preventDefault();
              findNext(e.shiftKey);
            }
          }}
          placeholder={t("find.placeholder")}
          className={`w-[220px] px-2 py-0.5 text-[12px] bg-transparent outline-none ${
            missing ? "text-red-500" : ""
          }`}
        />
        {query && (
          <span
            className={`text-[10px] tabular-nums opacity-70 px-1 ${
              total === 0 ? "text-red-500" : ""
            }`}
          >
            {total === 0 ? "0" : total >= 9999 ? "9999+" : total}
          </span>
        )}
        <button
          title="Previous"
          onClick={() => findNext(true)}
          className="w-5 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          ↑
        </button>
        <button
          title="Next"
          onClick={() => findNext(false)}
          className="w-5 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          ↓
        </button>
        <button
          title="Close"
          onClick={onClose}
          className="w-5 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-1">
        <input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "Enter") {
              e.preventDefault();
              handleReplaceAll();
            }
          }}
          placeholder={t("find.replacePlaceholder")}
          className="w-[220px] px-2 py-0.5 text-[12px] bg-transparent outline-none"
        />
        <button
          title={t("find.replaceAll")}
          onClick={handleReplaceAll}
          disabled={!query}
          className="text-[10px] px-2 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
        >
          {t("find.replaceAll")}
        </button>
      </div>
    </div>
  );
}
