/**
 * Lightweight YAML-frontmatter parse + serialise. The Properties UI
 * (next batch) round-trips through these — read the doc, present typed
 * key/value rows, edit, write back.
 *
 * Subset of YAML supported:
 *   - Scalars: bare strings, single/double-quoted strings, numbers
 *     (int + float), booleans (`true`/`false`/`yes`/`no`), nulls
 *     (`null`, `~`, empty)
 *   - Inline arrays: `key: [a, b, "c d"]`
 *   - Block arrays:
 *       key:
 *         - a
 *         - "b"
 *   - Comments (`# …`) and blank lines preserved on serialise only
 *     when round-tripping a key the user didn't touch (we don't try
 *     to be 100% lossless — beyond MVP)
 *
 * Out of scope (intentionally):
 *   - Nested objects (mapping in mapping)
 *   - Multi-line strings (`|` / `>`)
 *   - Anchors / aliases
 *   - Tags / explicit types (`!!int`, etc.)
 *
 *   For docs with frontmatter features we don't understand, callers
 *   should treat the affected keys as opaque strings and leave them
 *   alone — never silently rewrite.
 */

export type FrontmatterScalar = string | number | boolean | null;
export type FrontmatterValue = FrontmatterScalar | FrontmatterScalar[];

export interface ParsedFrontmatter {
  /** Decoded key/value pairs. Order matches first appearance in the doc. */
  properties: Record<string, FrontmatterValue>;
  /** Document body AFTER the closing `---` (and the newline following it). */
  body: string;
  /** True when the doc had a real frontmatter block at offset 0. */
  hadFrontmatter: boolean;
}

/** Try to convert a raw YAML scalar string into a typed value. Heuristic;
 *  preserves the original string when we can't be sure. */
function decodeScalar(raw: string): FrontmatterScalar {
  const s = raw.trim();
  if (s === "" || s === "~" || s === "null") return null;
  // Quoted strings — preserve as-is between the quotes.
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === "true" || s === "yes") return true;
  if (s === "false" || s === "no") return false;
  // Numbers (int / float).  Reject things like "12abc" — Number() is too loose.
  if (/^-?\d+$/.test(s)) return Number.parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return Number.parseFloat(s);
  return s;
}

/** Parse an inline-array value: `[a, b, "c d"]` → ["a", "b", "c d"] */
function decodeInlineArray(raw: string): FrontmatterScalar[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  const inner = trimmed.slice(1, -1);
  if (!inner.trim()) return [];
  const out: FrontmatterScalar[] = [];
  // Naive comma split with quote awareness — sufficient for the values
  // we support (no nested arrays / objects).
  let depth = 0;
  let buf = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      buf += ch;
      if (ch === quote && inner[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      buf += ch;
      quote = ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      out.push(decodeScalar(buf));
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(decodeScalar(buf));
  return out;
}

/** Locate the closing `---` of a frontmatter block. Returns the index
 *  of the `\n` that follows it, or -1 when no closer was found. */
function findFrontmatterEnd(content: string): number {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) return -1;
  // Search for "\n---" possibly followed by newline or EOF.
  let i = 3;
  while (i < content.length) {
    const next = content.indexOf("\n---", i);
    if (next < 0) return -1;
    const after = content[next + 4];
    if (after === undefined || after === "\n" || after === "\r") {
      // Skip past the `\n---` and its trailing newline if any.
      const lineEnd = content.indexOf("\n", next + 4);
      return lineEnd < 0 ? content.length : lineEnd + 1;
    }
    i = next + 4;
  }
  return -1;
}

/** Parse the leading frontmatter (if any) of a Markdown document. */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const fmEnd = findFrontmatterEnd(content);
  if (fmEnd < 0) {
    return { properties: {}, body: content, hadFrontmatter: false };
  }
  const block = content.slice(4, fmEnd - 4).replace(/\r/g, ""); // strip the leading "---\n" and trailing "---\n"
  const properties: Record<string, FrontmatterValue> = {};
  const lines = block.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    // Key: value  OR  Key: (block continues)
    const m = line.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1];
    const rest = m[2];
    // Inline array?
    if (rest.trim().startsWith("[") && rest.trim().endsWith("]")) {
      properties[key] = decodeInlineArray(rest);
      i++;
      continue;
    }
    // Block array?  (Next non-empty lines must look like "  - …")
    if (rest.trim() === "") {
      const items: FrontmatterScalar[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const itemMatch = lines[j].match(/^[ \t]+-[ \t]+(.+)$/);
        if (!itemMatch) break;
        items.push(decodeScalar(itemMatch[1]));
        j++;
      }
      if (items.length > 0) {
        properties[key] = items;
        i = j;
        continue;
      }
      properties[key] = null;
      i++;
      continue;
    }
    // Plain scalar
    properties[key] = decodeScalar(rest);
    i++;
  }

  const body = content.slice(fmEnd);
  return { properties, body, hadFrontmatter: true };
}

/** Encode one scalar back to YAML. Quotes when needed to disambiguate
 *  (presence of `: ` or `#`, leading/trailing whitespace, otherwise
 *  ambiguous boolean/number lexemes). */
function encodeScalar(value: FrontmatterScalar): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const s = String(value);
  // Decide if quoting is necessary.
  const needsQuote =
    s !== s.trim() ||
    s.includes("#") ||
    s.includes(": ") ||
    s.startsWith("[") ||
    s.startsWith("{") ||
    s.startsWith("&") ||
    s.startsWith("*") ||
    s.startsWith("!") ||
    s.startsWith("|") ||
    s.startsWith(">") ||
    s === "true" ||
    s === "false" ||
    s === "yes" ||
    s === "no" ||
    s === "null" ||
    s === "~" ||
    /^-?\d+$/.test(s) ||
    /^-?\d+\.\d+$/.test(s);
  if (!needsQuote) return s;
  // Double-quote and escape backslash + double-quote.
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Serialise the properties back into a string with the same body
 *  appended. Block-form arrays are written as multi-line `-` lists for
 *  readability; inline arrays for short empty ones. */
export function serializeFrontmatter(
  properties: Record<string, FrontmatterValue>,
  body: string,
): string {
  const keys = Object.keys(properties);
  if (keys.length === 0) return body;
  const out: string[] = ["---"];
  for (const key of keys) {
    const value = properties[key];
    if (Array.isArray(value)) {
      if (value.length === 0) {
        out.push(`${key}: []`);
        continue;
      }
      out.push(`${key}:`);
      for (const item of value) out.push(`  - ${encodeScalar(item)}`);
    } else {
      const encoded = encodeScalar(value);
      out.push(encoded === "" ? `${key}:` : `${key}: ${encoded}`);
    }
  }
  out.push("---");
  // Preserve a single blank line between FM and body when the body
  // doesn't already start with a newline.
  const sep = body.startsWith("\n") ? "" : "\n";
  return `${out.join("\n")}\n${sep}${body}`;
}
