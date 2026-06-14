/**
 * Resolve standard Markdown links clicked in the reader. Real-world docs (and
 * GitHub repos) cross-link with relative links — `[text](./other.md)`,
 * `[x](../api/y.md#section)` — not wikilinks. These helpers let the reader
 * open such links in-app and route external links to the browser.
 */

const DOC_EXT = /\.(md|markdown|mdx|mkd|html?|canvas)$/i;

/** True for links that should open in the system browser, not in-app. */
export function isExternalHref(href: string): boolean {
  return /^(?:https?:|mailto:)/i.test(href.trim());
}

export interface ResolvedDocLink {
  /** Absolute filesystem path of the linked doc. */
  path: string;
  /** `#heading` fragment, decoded, or null. */
  heading: string | null;
}

/**
 * Resolve a relative anchor href against the current document's absolute path
 * to an absolute vault path + optional heading, or null when it isn't an
 * in-vault relative doc link (external/scheme URL, bare `#anchor`,
 * protocol-relative, or a non-doc extension like `.png`).
 */
export function resolveDocHref(
  href: string,
  currentAbsPath: string,
): ResolvedDocLink | null {
  const raw = href.trim();
  if (!raw) return null;
  if (raw.startsWith("#")) return null; // in-page anchor — leave to the reader
  if (raw.startsWith("//")) return null; // protocol-relative → external-ish
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null; // has a scheme (http:, mailto:, file:)

  const hashIdx = raw.indexOf("#");
  const rawPath = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const heading = hashIdx >= 0 ? safeDecode(raw.slice(hashIdx + 1)) : null;
  if (!rawPath) return null;
  const relPath = safeDecode(rawPath);
  if (!DOC_EXT.test(relPath)) return null; // only docs navigate in-app

  const fromDir = currentAbsPath.slice(0, currentAbsPath.lastIndexOf("/"));
  return { path: resolveRelative(fromDir, relPath), heading };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Normalize `rel` (with `./` and `../`) against an absolute `fromDir`. */
function resolveRelative(fromDir: string, rel: string): string {
  const parts = rel.startsWith("/") ? [] : fromDir.split("/").filter(Boolean);
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return `/${parts.join("/")}`;
}
