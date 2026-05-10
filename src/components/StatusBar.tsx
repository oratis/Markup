import { useEffect, useMemo, useState } from "react";
import { getActiveSourceView } from "../lib/active-source-view";
import { type Heading, headingBreadcrumb, parseHeadings } from "../lib/headings";
import { useT } from "../lib/i18n";
import { getActiveTab, useAppStore } from "../store";

export function countWords(text: string): number {
  // CJK characters each count as a word; runs of non-whitespace as one word.
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length;
  const nonCjk = text.replace(/[㐀-鿿豈-﫿]/g, " ");
  const words = nonCjk.trim().length === 0 ? 0 : nonCjk.trim().split(/\s+/).length;
  return cjk + words;
}

function readSelection(sourceMode: boolean): string {
  if (sourceMode) {
    const v = getActiveSourceView();
    if (!v) return "";
    const { from, to } = v.state.selection.main;
    return from === to ? "" : v.state.sliceDoc(from, to);
  }
  return window.getSelection()?.toString() ?? "";
}

function readCaret(): { line: number; col: number } | null {
  const v = getActiveSourceView();
  if (!v) return null;
  const head = v.state.selection.main.head;
  const line = v.state.doc.lineAt(head);
  return { line: line.number, col: head - line.from + 1 };
}

/** Approximate the cursor's 0-based source line in WYSIWYG by finding the
 * nearest enclosing block element and locating its text in the source. */
function readWysiwygCursorLine(content: string): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const block = (sel.getRangeAt(0).startContainer as Element).closest?.(
    "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre",
  );
  const blockText = block?.textContent ?? "";
  if (!blockText) return 0;
  const idx = content.indexOf(blockText);
  if (idx < 0) return 0;
  return content.slice(0, idx).split("\n").length - 1;
}

interface Stats {
  words: number;
  chars: number;
  lines: number;
  bytes: number;
}

const ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

function byteSize(text: string): number {
  if (!text) return 0;
  if (ENCODER) return ENCODER.encode(text).length;
  // jsdom historically lacked TextEncoder; fall back to a rough char count.
  return text.length;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const HEAVY_THRESHOLD = 100_000;
const DEBOUNCE_MS = 250;

export function StatusBar() {
  const t = useT();
  const tab = useAppStore(getActiveTab);
  const sourceMode = useAppStore((s) => s.sourceMode);
  const vaultRoot = useAppStore((s) => s.vaultRoot);
  const vaultFileCount = useAppStore((s) => s.vaultFiles.length);
  const dirtyCount = useAppStore(
    (s) => s.tabs.filter((tx) => tx.path && tx.status === "dirty").length,
  );
  const wordCountGoal = useAppStore((s) => s.wordCountGoal);
  const toggleSourceMode = useAppStore((s) => s.toggleSourceMode);

  const [stats, setStats] = useState<Stats>({ words: 0, chars: 0, lines: 0, bytes: 0 });
  const [selStats, setSelStats] = useState<{ words: number; chars: number } | null>(null);
  const [caret, setCaret] = useState<{ line: number; col: number } | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Heading[]>([]);

  // Heading list is derived from current tab content. Memoised so the
  // selection-tracking effect below doesn't reparse on every keystroke.
  const headings = useMemo(() => {
    if (!tab) return [];
    return parseHeadings(tab.content);
  }, [tab?.content]);

  // Recompute synchronously for small docs, debounced for big ones to keep
  // input latency tight (countWords scans the full string + a couple of
  // regex passes; ~5ms at 100k chars on M1, much worse on Intel).
  useEffect(() => {
    if (!tab) {
      setStats({ words: 0, chars: 0, lines: 0, bytes: 0 });
      return;
    }
    const compute = () => {
      setStats({
        words: countWords(tab.content),
        chars: tab.content.length,
        lines: tab.content.split("\n").length,
        bytes: byteSize(tab.content),
      });
    };
    if (tab.content.length < HEAVY_THRESHOLD) {
      compute();
      return;
    }
    const id = window.setTimeout(compute, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [tab?.content]);

  // Selection counter: refresh on every DOM `selectionchange`. Milkdown
  // (ProseMirror) and CodeMirror both surface their selection through the
  // DOM Selection API, so a single global listener covers both modes. We
  // run on the next animation frame so the read happens after the editor
  // has applied the new selection. The same listener also feeds the
  // caret position display in source mode.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const text = readSelection(sourceMode);
      setSelStats(text ? { words: countWords(text), chars: text.length } : null);
      setCaret(sourceMode ? readCaret() : null);
      // Heading breadcrumb: cheap unless there are no headings.
      if (headings.length === 0) {
        setBreadcrumb([]);
      } else {
        let cursorLine = 0;
        if (sourceMode) {
          const v = getActiveSourceView();
          if (v) cursorLine = v.state.doc.lineAt(v.state.selection.main.head).number - 1;
        } else if (tab) {
          cursorLine = readWysiwygCursorLine(tab.content);
        }
        setBreadcrumb(headingBreadcrumb(headings, cursorLine));
      }
    };
    update();
    const onChange = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      document.removeEventListener("selectionchange", onChange);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [sourceMode, headings, tab?.content]);

  const status = tab?.status ?? "saved";
  const statusLabel =
    status === "saved"
      ? t("status.saved")
      : status === "dirty"
        ? t("status.dirty")
        : status === "saving"
          ? t("status.saving")
          : t("status.error", tab?.errorMessage ?? "unknown");

  return (
    <div className="statusbar flex items-center gap-3 h-6 px-3 text-[11px] opacity-70 border-t border-black/5 dark:border-white/10 select-none">
      <button
        type="button"
        onClick={toggleSourceMode}
        title={t("status.modeToggleTitle")}
        className="hover:opacity-100 opacity-90 cursor-pointer"
      >
        {sourceMode ? t("status.mode.source") : t("status.mode.wysiwyg")}
      </button>
      <span className="opacity-30">|</span>
      <span>
        {t("status.words", stats.words)}
        {wordCountGoal > 0 && (
          <span className="opacity-60 ml-0.5">
            {" / "}
            {wordCountGoal} (
            {Math.min(100, Math.round((stats.words / wordCountGoal) * 100))}%)
          </span>
        )}
      </span>
      <span>{t("status.chars", stats.chars)}</span>
      <span>{t("status.lines", stats.lines)}</span>
      {stats.bytes >= 1024 && (
        <span className="opacity-60" title={t("status.sizeTitle")}>
          {humanSize(stats.bytes)}
        </span>
      )}
      {stats.words > 0 && (
        <span className="opacity-60" title={t("status.readingTimeTitle")}>
          {t("status.readingTime", Math.max(1, Math.round(stats.words / 200)))}
        </span>
      )}
      {caret && (
        <>
          <span className="opacity-30">|</span>
          <span aria-live="polite">{t("status.caret", caret.line, caret.col)}</span>
        </>
      )}
      {selStats && (
        <>
          <span className="opacity-30">|</span>
          <span aria-live="polite">
            {t("status.selection", selStats.words, selStats.chars)}
          </span>
        </>
      )}
      {breadcrumb.length > 0 && (
        <>
          <span className="opacity-30">|</span>
          <span
            className="truncate max-w-[40ch]"
            title={breadcrumb.map((h) => h.text).join(" › ")}
          >
            {breadcrumb.map((h) => h.text).join(" › ")}
          </span>
        </>
      )}
      <span className="flex-1" />
      {dirtyCount > 0 && (
        <>
          <span aria-live="polite">{t("status.dirtyCount", dirtyCount)}</span>
          <span className="opacity-30">|</span>
        </>
      )}
      {vaultRoot && (
        <span className="truncate max-w-[260px]" title={vaultRoot}>
          {vaultRoot}
          {vaultFileCount > 0 && (
            <span className="opacity-60 ml-1">
              ({t("status.vaultFiles", vaultFileCount)})
            </span>
          )}
        </span>
      )}
      <span className="opacity-30">|</span>
      <span aria-live="polite">{statusLabel}</span>
    </div>
  );
}
