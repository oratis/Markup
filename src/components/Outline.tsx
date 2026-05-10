import { useMemo } from "react";
import { getActiveTab, useAppStore } from "../store";

interface Heading {
  level: number;
  text: string;
  /** 0-based line index in source markdown */
  line: number;
}

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

export function Outline() {
  const tab = useAppStore(getActiveTab);
  const headings = useMemo(() => (tab ? parseHeadings(tab.content) : []), [tab?.content]);

  if (!tab) return null;
  if (headings.length === 0) {
    return <div className="text-xs opacity-50 px-3 py-3">No headings.</div>;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider opacity-50">
        Outline
      </div>
      <nav className="flex-1 min-h-0 overflow-auto no-scrollbar pb-2">
        {headings.map((h, i) => (
          <button
            key={`${h.line}-${i}`}
            onClick={() => scrollToHeading(h.text, h.level)}
            title={h.text}
            className="w-full text-left text-[12px] py-0.5 hover:bg-black/5 dark:hover:bg-white/10 truncate block"
            style={{
              paddingLeft: `${0.75 + (h.level - 1) * 0.85}rem`,
              paddingRight: "0.5rem",
            }}
          >
            <span className="truncate">{h.text}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/**
 * Scroll the rendered editor to the heading whose text matches.
 *
 * We don't have direct access to ProseMirror nodes from outside the editor,
 * so we just look up by text content in the live DOM. Good enough for a
 * unique-text outline; ambiguous on duplicate headings (jumps to the first).
 */
function scrollToHeading(text: string, level: number) {
  const tag = `H${level}`;
  const candidates = document.querySelectorAll(`.milkdown ${tag}, .cm-content ${tag}`);
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
