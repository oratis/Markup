/**
 * Render a Markdown snippet to HTML for static display inside a canvas
 * text node. Trimmed feature set vs the full Milkdown pipeline — canvas
 * cards are short, so we accept some divergence in exchange for cheap
 * synchronous rendering (no async invoke into Rust's comrak).
 *
 * Safety: marked's `breaks: true` + GFM defaults, no raw HTML allowed.
 * The output goes through stripDangerousAttrs to drop anything that
 * could execute (event handlers, javascript: URLs). Canvas content is
 * authored locally so the trust boundary is loose; this is still the
 * minimum hardening we'd want.
 */

import { Marked } from "marked";

const marked = new Marked({
  gfm: true,
  breaks: true,
});

const DANGEROUS_PROTOCOL = /^(?:javascript|vbscript|data):/i;

/** Convert markdown source to HTML. Returns an empty string for empty
 *  input. Sync — marked's renderer is synchronous when no async extensions
 *  are registered. */
export function renderCanvasMarkdown(source: string): string {
  if (!source || source.trim() === "") return "";
  const html = marked.parse(source, { async: false }) as string;
  return stripDangerousAttrs(html);
}

/** Strip event handler attributes (`onclick="..."`) and dangerous
 *  protocol URLs from a string of HTML. Best-effort regex pass — for
 *  truly hostile content, route through DOMPurify later. */
export function stripDangerousAttrs(html: string): string {
  return (
    html
      // drop on* event handler attributes
      .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      // neutralise javascript:/vbscript:/data: URLs
      .replace(
        /(\s(?:href|src|xlink:href)\s*=\s*)(["'])\s*((?:javascript|vbscript|data):[^"']*)\2/gi,
        "$1$2#blocked$2",
      )
  );
}

/** Sniff `href`-like URLs and decide whether they should be opened. */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (DANGEROUS_PROTOCOL.test(url)) return false;
  return /^(?:https?:|mailto:)/i.test(url);
}
