/** Word count for a piece of markdown text. CJK characters count as one
 *  word each; runs of non-whitespace count as one word. Pulled out of
 *  StatusBar so it has direct tests and can be reused by other features
 *  (e.g. selection word count, reading-time estimation). */
export function countWords(text: string): number {
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length;
  const nonCjk = text.replace(/[㐀-鿿豈-﫿]/g, " ");
  const words = nonCjk.trim().length === 0 ? 0 : nonCjk.trim().split(/\s+/).length;
  return cjk + words;
}

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
