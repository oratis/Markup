import { useEffect, useMemo, useState } from "react";
import { getActiveSourceView } from "../lib/active-source-view";
import { useT } from "../lib/i18n";
import { parseHeadingsAsync } from "../lib/outline-client";
import { getActiveTab, useAppStore } from "../store";

interface Heading {
  level: number;
  text: string;
  /** 0-based line index in source markdown */
  line: number;
}

/** Above this size we delegate parsing to the worker. Below it the inline
 *  scanner is faster than the postMessage round-trip. */
const WORKER_THRESHOLD = 50_000;

/**
 * Cheap heading parser: scans the markdown line-by-line. Treats `# ` through
 * `###### ` and `Setext` style (text + ===/---). Skips heading-like lines
 * inside fenced code blocks.
 */
function parseHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  const lines = md.split("\n");
  let inFence = false;
  let fenceMarker = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // toggle fenced code blocks (``` or ~~~)
    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1];
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    // ATX style: # … through ######
    const atx = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (atx) {
      out.push({ level: atx[1].length, text: atx[2], line: i });
      continue;
    }

    // Setext style: text on previous line, === / --- on this one
    if (i > 0 && /^=+\s*$/.test(line.trim())) {
      const prev = lines[i - 1].trim();
      if (prev) out.push({ level: 1, text: prev, line: i - 1 });
      continue;
    }
    if (i > 0 && /^-+\s*$/.test(line.trim()) && lines[i - 1].trim()) {
      // Avoid confusing horizontal rule with setext H2 — setext requires
      // immediately-preceding non-blank line, which we just checked.
      out.push({ level: 2, text: lines[i - 1].trim(), line: i - 1 });
    }
  }

  return out;
}

/** Walk the heading list to find the entry that owns `cursorLine`. */
function activeHeadingIndex(headings: Heading[], cursorLine: number): number {
  let idx = -1;
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].line <= cursorLine) idx = i;
    else break;
  }
  return idx;
}

export function Outline() {
  const t = useT();
  const tab = useAppStore(getActiveTab);

  // Inline path for small docs (no async cost), worker for big ones to
  // keep input latency under 16ms even on 1MB+ files.
  const inlineHeadings = useMemo(() => {
    if (!tab) return [];
    return tab.content.length <= WORKER_THRESHOLD ? parseHeadings(tab.content) : [];
  }, [tab?.content]);

  const [workerHeadings, setWorkerHeadings] = useState<Heading[]>([]);
  useEffect(() => {
    if (!tab) {
      setWorkerHeadings([]);
      return;
    }
    if (tab.content.length <= WORKER_THRESHOLD) {
      setWorkerHeadings([]);
      return;
    }
    let cancelled = false;
    parseHeadingsAsync(tab.content).then((h) => {
      if (!cancelled) setWorkerHeadings(h);
    });
    return () => {
      cancelled = true;
    };
  }, [tab?.content]);

  const allHeadings =
    tab && tab.content.length > WORKER_THRESHOLD ? workerHeadings : inlineHeadings;

  const [filter, setFilter] = useState("");
  const headings = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allHeadings;
    return allHeadings.filter((h) => h.text.toLowerCase().includes(q));
  }, [allHeadings, filter]);

  // Track the active heading via cursor position. selectionchange fires
  // whenever the user clicks / arrows / types in either editor.
  const sourceMode = useAppStore((s) => s.sourceMode);
  const [activeIdx, setActiveIdx] = useState(-1);
  useEffect(() => {
    if (!tab || headings.length === 0) {
      setActiveIdx(-1);
      return;
    }
    const recompute = () => {
      let line = 0;
      if (sourceMode) {
        const view = getActiveSourceView();
        if (view) {
          const head = view.state.selection.main.head;
          line = view.state.doc.lineAt(head).number - 1;
        }
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const block = (sel.getRangeAt(0).startContainer as Element).closest?.(
            "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre",
          );
          const blockText = block?.textContent ?? "";
          const idx = blockText ? tab.content.indexOf(blockText) : -1;
          if (idx >= 0) line = tab.content.slice(0, idx).split("\n").length - 1;
        }
      }
      setActiveIdx(activeHeadingIndex(headings, line));
    };
    recompute();
    document.addEventListener("selectionchange", recompute);
    return () => document.removeEventListener("selectionchange", recompute);
  }, [tab?.content, headings, sourceMode]);

  if (!tab) return null;
  if (allHeadings.length === 0) {
    return <div className="text-xs opacity-50 px-3 py-3">{t("outline.empty")}</div>;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider opacity-50">
        {t("outline.title")}
      </div>
      <div className="px-3 pb-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("outline.filter")}
          className="w-full text-[12px] px-2 py-1 rounded border border-black/10 dark:border-white/15 bg-transparent outline-none focus:border-blue-500"
        />
      </div>
      <nav className="flex-1 min-h-0 overflow-auto no-scrollbar pb-2">
        {headings.length === 0 && (
          <div className="text-[11px] opacity-50 px-3 py-2">
            {t("outline.noFilterMatch")}
          </div>
        )}
        {headings.map((h, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={`${h.line}-${i}`}
              onClick={() => scrollToHeading(h.text, h.level, h.line)}
              title={h.text}
              className={`w-full text-left text-[12px] py-0.5 truncate block ${
                isActive
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                  : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              style={{
                paddingLeft: `${0.75 + (h.level - 1) * 0.85}rem`,
                paddingRight: "0.5rem",
              }}
            >
              <span className="truncate">{h.text}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Scroll the rendered editor to the heading whose text + level match.
 *
 * Strategy:
 *  - WYSIWYG: Milkdown renders real `<h1>` … `<h6>`; query by tag + text.
 *  - Source mode: CM6 only renders flat `.cm-line` spans, so we need its
 *    own dispatch + scrollIntoView API. We use the `line` index parsed
 *    earlier to compute a doc position and dispatch a selection there.
 */
function scrollToHeading(text: string, level: number, line: number) {
  // Source-mode path
  const view = getActiveSourceView();
  if (view) {
    const lineIdx = Math.max(1, line + 1); // CM6 lines are 1-based
    const doc = view.state.doc;
    if (lineIdx <= doc.lines) {
      const lineObj = doc.line(lineIdx);
      view.dispatch({
        selection: { anchor: lineObj.from, head: lineObj.from },
        effects: view.scrollSnapshot(),
      });
      view.dispatch({
        effects: [],
        scrollIntoView: true,
        selection: { anchor: lineObj.from, head: lineObj.from },
      } as Parameters<typeof view.dispatch>[0]);
      view.focus();
      return;
    }
  }
  // WYSIWYG / fallback path
  const tag = `H${level}`;
  const candidates = document.querySelectorAll(`.milkdown ${tag}`);
  for (const node of Array.from(candidates)) {
    if ((node.textContent ?? "").trim() === text) {
      (node as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
  }
}
