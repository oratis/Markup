/**
 * Slugify a heading-ish string for use as a filesystem name. Strips
 * leading "#"s, trims, caps at `max` chars, replaces filesystem-unsafe
 * characters with `-`. Returns an empty string when the input is blank.
 */
export function slugifyForFilename(input: string, max = 80): string {
  return input
    .replace(/^#+\s+/, "")
    .trim()
    .slice(0, max)
    .replace(/[/\\:*?"<>|]/g, "-");
}

/** Extract the text of the first H1 (`# Foo`) from a markdown string,
 * or null when none is present in the first 200 lines. */
export function firstHeadingText(md: string): string | null {
  const lines = md.split("\n").slice(0, 200);
  for (const l of lines) {
    if (/^#\s+\S/.test(l)) return l.replace(/^#\s+/, "");
  }
  return null;
}
