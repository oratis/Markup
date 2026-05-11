import { useEffect, useMemo, useRef, useState } from "react";
import { countMatches } from "../lib/count-matches";
import { useT } from "../lib/i18n";
import { replaceAll, replaceOnce } from "../lib/text-replace";
import { getActiveTab, useAppStore } from "../store";

interface Props {
  /** When true, this is rendered in source mode — CM6 has its own search
   * panel; this bar is suppressed because CM6 binds ⌘F natively. */
  sourceMode: boolean;
  onClose: () => void;
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
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const total = useMemo(
    () => (tab && query ? countMatches(tab.content, query, caseSensitive, useRegex) : 0),
    [tab?.content, query, caseSensitive, useRegex],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function findNext(backwards = false) {
    if (!query) return;
    // window.find supports caseSensitive natively but not regex. For
    // regex mode we synthesise a search by jumping to the first match
    // beyond the current selection's offset in tab.content.
    if (useRegex && tab) {
      try {
        const re = new RegExp(query, caseSensitive ? "g" : "gi");
        // Best-effort: find any match. window selection -> position is
        // unreliable across editors, so we just home in on the first one.
        const m = re.exec(tab.content);
        setMissing(m === null);
        return;
      } catch {
        setMissing(true);
        return;
      }
    }
    // @ts-expect-error — window.find is non-standard but works in WebKit/Tauri
    const found: boolean = window.find(query, caseSensitive, backwards, true);
    setMissing(!found);
  }

  function handleReplaceOnce() {
    if (!query || !tab) return;
    if (useRegex) {
      try {
        const re = new RegExp(query, caseSensitive ? "" : "i");
        const m = re.exec(tab.content);
        if (!m) {
          setMissing(true);
          return;
        }
        const next =
          tab.content.slice(0, m.index) +
          replacement +
          tab.content.slice(m.index + m[0].length);
        updateActiveContent(next);
      } catch {
        setMissing(true);
      }
      return;
    }
    const r = replaceOnce(tab.content, query, replacement, { caseSensitive });
    if (r.index < 0) {
      setMissing(true);
      return;
    }
    updateActiveContent(r.text);
  }

  function handleReplaceAll() {
    if (!query || !tab) return;
    if (useRegex) {
      try {
        const re = new RegExp(query, caseSensitive ? "g" : "gi");
        let count = 0;
        const next = tab.content.replace(re, () => {
          count++;
          return replacement;
        });
        if (count === 0) {
          setMissing(true);
          return;
        }
        updateActiveContent(next);
      } catch {
        setMissing(true);
      }
      return;
    }
    const result = replaceAll(tab.content, query, replacement, { caseSensitive });
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
          title={t("find.caseSensitive")}
          aria-label={t("find.caseSensitive")}
          aria-pressed={caseSensitive}
          onClick={() => setCaseSensitive((v) => !v)}
          className={`text-[10px] font-mono w-5 h-5 leading-none rounded ${
            caseSensitive
              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "hover:bg-black/5 dark:hover:bg-white/10 opacity-60"
          }`}
        >
          Aa
        </button>
        <button
          title={t("find.regex")}
          aria-label={t("find.regex")}
          aria-pressed={useRegex}
          onClick={() => setUseRegex((v) => !v)}
          className={`text-[10px] font-mono w-5 h-5 leading-none rounded ${
            useRegex
              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "hover:bg-black/5 dark:hover:bg-white/10 opacity-60"
          }`}
        >
          .*
        </button>
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
          title={t("find.replace")}
          onClick={handleReplaceOnce}
          disabled={!query}
          className="text-[10px] px-2 h-5 leading-none rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
        >
          {t("find.replace")}
        </button>
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
