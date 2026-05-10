/**
 * Strip the bulk of CommonMark markdown syntax from `md` and return the
 * plain-text fall-through. This is intentionally lossy — it's meant for
 * "Copy as Plain Text" / clipboard paste use cases, not for rendering.
 *
 * Handled markers:
 *   - ATX headings (`# Foo` → `Foo`)
 *   - Setext headings (`Foo\n===` → `Foo`)
 *   - List markers (`-`, `*`, `+`, `1.`, `1)`, `- [ ] `)
 *   - Blockquote prefix (`> `)
 *   - Bold `**x**` / `__x__`, italic `*x*` / `_x_`, strike `~~x~~`,
 *     inline code `` `x` ``
 *   - Links `[text](url)` → `text`; image `![alt](url)` → `alt`
 *   - HR lines (`---`, `***`, `___`) → blank
 *   - Fenced code blocks: keep their inner text, drop the fences
 */
export function stripMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inFence = false;
  let fenceMarker = "";
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trimStart();

    // Fenced code blocks: drop the fence lines, preserve interior verbatim.
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
    if (inFence) {
      out.push(raw);
      continue;
    }

    // Setext underline → eat the underline, the previous line stays.
    if (i > 0 && /^=+\s*$/.test(raw.trim()) && lines[i - 1].trim()) continue;
    if (i > 0 && /^-+\s*$/.test(raw.trim()) && lines[i - 1].trim()) continue;

    // Horizontal rules → blank line. Three or more of `-`, `*`, or `_`,
    // optionally separated by spaces (CommonMark thematic break).
    if (/^\s*(?:-[\s-]{2,}|\*[\s*]{2,}|_[\s_]{2,})\s*$/.test(raw)) {
      out.push("");
      continue;
    }

    // Strip line-leading markers in order (heading > task > list > quote).
    let line = raw.replace(/^(\s*)#{1,6}\s+/, "$1");
    line = line.replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/, "$1");
    line = line.replace(/^(\s*)(?:[-*+]|\d+[.)])\s+/, "$1");
    line = line.replace(/^(\s*)>\s?/, "$1");

    // Inline markers — operate on the body, not the leading whitespace.
    const lead = line.match(/^[\t ]*/)?.[0] ?? "";
    let body = line.slice(lead.length);

    // Image / link replacements run before bold so the `**` doesn't trip
    // on text inside the brackets.
    body = body.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
    body = body.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    body = body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b ?? a);
    body = body.replace(/\*\*([^*]+)\*\*/g, "$1");
    body = body.replace(/__([^_]+)__/g, "$1");
    body = body.replace(/\*([^*\n]+)\*/g, "$1");
    body = body.replace(/(?<![A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])/g, "$1");
    body = body.replace(/~~([^~]+)~~/g, "$1");
    body = body.replace(/`([^`]+)`/g, "$1");

    out.push(lead + body);
  }
  return out.join("\n");
}
