/**
 * SearchPanel query operators. Parses `tag:`, `path:`, and the
 * free-text remainder out of a search query. The plain-text part is
 * forwarded to the existing Rust `searchVault` command; the operators
 * are evaluated client-side against the tag/link/vault indices.
 *
 * Syntax:
 *   `tag:#foo`            — files carrying the #foo tag (literal `#` optional)
 *   `tag:projects/markup` — nested tag
 *   `path:journal/`       — paths whose vault-relative form contains the substring
 *   anything else         — added to the free-text query
 *
 * Operators are case-insensitive on their values for `path:`; tag
 * values are exact (case preserved per Obsidian convention).
 */

export interface ParsedQuery {
  /** Tag values (without leading `#`). Empty when no tag operator. */
  tags: string[];
  /** Path substrings. Empty when no path operator. */
  paths: string[];
  /** Free-text remainder; everything outside operators. May be empty. */
  text: string;
}

const OPERATOR_RE = /\b(tag|path):(\S+)/gi;

export function parseQuery(raw: string): ParsedQuery {
  if (!raw) return { tags: [], paths: [], text: "" };
  const tags: string[] = [];
  const paths: string[] = [];
  let text = raw;
  text = text.replace(OPERATOR_RE, (_m, kind, value) => {
    const k = kind.toLowerCase();
    if (k === "tag") {
      tags.push(value.replace(/^#/, ""));
    } else if (k === "path") {
      paths.push(value);
    }
    return ""; // strip the operator token from the free-text part
  });
  return { tags, paths, text: text.replace(/\s+/g, " ").trim() };
}

/** True when `path` matches every path-operator substring (case-
 *  insensitive). Returns true when there are no path operators. */
export function pathMatches(path: string, pathOps: string[]): boolean {
  if (pathOps.length === 0) return true;
  const lower = path.toLowerCase();
  return pathOps.every((p) => lower.includes(p.toLowerCase()));
}
