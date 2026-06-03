/** Word count for a piece of markdown text. CJK characters count as one
 *  word each; runs of non-whitespace count as one word. Pulled out of
 *  StatusBar so it has direct tests and can be reused by other features
 *  (e.g. selection word count, reading-time estimation). */
export function countWords(text: string): number {
  // CJK ideographs (Ext-A + Unified + Compatibility) PLUS Japanese kana and
  // Korean Hangul — these scripts have no inter-word spaces, so without them a
  // whole kana/Hangul sentence would count as a single word.
  const cjk = (text.match(CJK_RE) ?? []).length;
  const nonCjk = text.replace(CJK_RE, " ");
  const words = nonCjk.trim().length === 0 ? 0 : nonCjk.trim().split(/\s+/).length;
  return cjk + words;
}

const CJK_RE = /[㐀-鿿豈-﫿぀-ヿ가-힯]/g;

const ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

/** UTF-8 byte length of a string. Falls back to character count when
 *  TextEncoder isn't available (older jsdom). */
export function byteSize(text: string): number {
  if (!text) return 0;
  if (ENCODER) return ENCODER.encode(text).length;
  return text.length;
}

/** Render a byte count as a short human-readable string ("999 B",
 *  "12.3 KB", "4.5 MB"). Single-decimal precision above the byte tier. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
