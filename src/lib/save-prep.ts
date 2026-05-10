/**
 * Strip trailing whitespace from every line in `content`.
 *
 * Preserves the document's terminating newline (if any) and treats `\r\n`
 * as a normal trailing-whitespace candidate — which it is from the
 * editor's perspective: CM6 / Milkdown both emit `\n`-only.
 */
export function trimTrailingWhitespace(content: string): string {
  const hadTrailingNewline = content.endsWith("\n");
  const lines = content.split("\n");
  const trimmed = lines.map((l) => l.replace(/[\t ]+$/, ""));
  const out = trimmed.join("\n");
  // `split + join` already preserves a trailing empty element when the
  // input ended with "\n", so out's trailing newline is correct. The
  // explicit check is here to document intent / catch future regressions.
  if (hadTrailingNewline && !out.endsWith("\n")) return `${out}\n`;
  return out;
}
