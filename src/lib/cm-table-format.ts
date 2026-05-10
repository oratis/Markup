import { getActiveSourceView } from "./active-source-view";

const TABLE_LINE_RE = /^\s*\|.*\|\s*$/;
const SEP_LINE_RE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/;

interface TableBlock {
  startLine: number;
  endLine: number;
  rows: string[][];
  /** Per-column alignment: 'left' | 'center' | 'right' | undefined. */
  align: Array<"left" | "center" | "right" | undefined>;
  /** Whether the original block had a separator row after the header. */
  hasSeparator: boolean;
}

/** Split a markdown table row body (without leading/trailing `|`) into
 * cells, trimming each. Escaped `\|` is preserved as a single character.
 */
function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.replace(/^\||\|$/g, "");
  const cells: string[] = [];
  let buf = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "\\" && inner[i + 1] === "|") {
      buf += "\\|";
      i++;
      continue;
    }
    if (ch === "|") {
      cells.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  cells.push(buf.trim());
  return cells;
}

function parseAlignmentRow(line: string): Array<"left" | "center" | "right" | undefined> {
  return splitRow(line).map((c) => {
    const t = c.trim();
    const left = t.startsWith(":");
    const right = t.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return undefined;
  });
}

/** Inspect the doc and return the table block enclosing `cursorLine`,
 * or null when the cursor isn't on one. Walks up + down from the cursor
 * collecting consecutive table-shaped lines. */
function detectTableAt(lines: string[], cursorLine: number): TableBlock | null {
  if (cursorLine < 0 || cursorLine >= lines.length) return null;
  if (!TABLE_LINE_RE.test(lines[cursorLine])) return null;
  let start = cursorLine;
  while (start > 0 && TABLE_LINE_RE.test(lines[start - 1])) start--;
  let end = cursorLine;
  while (end < lines.length - 1 && TABLE_LINE_RE.test(lines[end + 1])) end++;
  const block = lines.slice(start, end + 1);
  const sepIdx = block.findIndex((l) => SEP_LINE_RE.test(l));
  const hasSeparator = sepIdx === 1; // GFM: row 0 is header, row 1 is separator
  const align = hasSeparator ? parseAlignmentRow(block[1]) : [];
  const dataRows = hasSeparator ? [block[0], ...block.slice(2)] : block;
  const rows = dataRows.map(splitRow);
  return { startLine: start, endLine: end, rows, align, hasSeparator };
}

/** Build an aligned, padded GFM table from parsed rows + alignment hints. */
function renderTable(
  rows: string[][],
  align: Array<"left" | "center" | "right" | undefined>,
  hasSeparator: boolean,
): string {
  const cols = Math.max(...rows.map((r) => r.length));
  // Normalise row widths.
  const padded = rows.map((r) => {
    const copy = [...r];
    while (copy.length < cols) copy.push("");
    return copy;
  });
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    let w = 3; // separator needs at least `---` width
    for (const r of padded) {
      const cell = r[c] ?? "";
      if (cell.length > w) w = cell.length;
    }
    widths.push(w);
  }
  const renderRow = (cells: string[]) => {
    const inner = cells.map((cell, c) => {
      const w = widths[c];
      const a = align[c];
      const padded = a === "right" ? cell.padStart(w) : cell.padEnd(w);
      return ` ${padded} `;
    });
    return `|${inner.join("|")}|`;
  };
  const renderSep = () => {
    const inner = widths.map((w, c) => {
      const a = align[c];
      if (a === "left") return ` :${"-".repeat(w - 1)} `;
      if (a === "right") return ` ${"-".repeat(w - 1)}: `;
      if (a === "center") return ` :${"-".repeat(w - 2)}: `;
      return ` ${"-".repeat(w)} `;
    });
    return `|${inner.join("|")}|`;
  };
  if (hasSeparator) {
    return [renderRow(padded[0]), renderSep(), ...padded.slice(1).map(renderRow)].join(
      "\n",
    );
  }
  return padded.map(renderRow).join("\n");
}

/** Format the markdown table containing the cursor. Returns true on
 * success, false if the cursor isn't on a table or no source view is
 * mounted. */
export function formatTable(): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const lines = view.state.doc.toString().split("\n");
  const block = detectTableAt(lines, cursorLine);
  if (!block) return false;
  const next = renderTable(block.rows, block.align, block.hasSeparator);
  const startPos = view.state.doc.line(block.startLine + 1).from;
  const endPos = view.state.doc.line(block.endLine + 1).to;
  view.dispatch({
    changes: { from: startPos, to: endPos, insert: next },
    userEvent: "input.format.table",
  });
  return true;
}

/** Flip the GFM task checkbox on the cursor's line (`- [ ] …` ↔
 * `- [x] …`). Returns true when something changed. */
export function toggleTaskCheckboxOnLine(): boolean {
  const view = getActiveSourceView();
  if (!view) return false;
  const lineObj = view.state.doc.lineAt(view.state.selection.main.head);
  const text = lineObj.text;
  const m = text.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s)/);
  if (!m) return false;
  const inside = m[2];
  const next = inside.trim() === "" ? "x" : " ";
  const replaced = `${m[1]}${next}${m[3]}${text.slice(m[0].length)}`;
  view.dispatch({
    changes: { from: lineObj.from, to: lineObj.to, insert: replaced },
    userEvent: "input.task.toggle",
  });
  return true;
}
