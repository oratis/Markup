/**
 * Tiny helpers for telling `.canvas` paths apart from Markdown paths.
 * Kept separate from the larger canvas-format module so other layers
 * (file tree, tab routing, save handlers) can check the extension
 * without pulling in the parser.
 */

/** Lowercase the last extension on a path. Returns the empty string
 *  when the path has no extension, or when the path is null. Matches
 *  Rust's `Path::extension` semantics — leading-dot files (".canvas",
 *  "/dir/.bashrc") are treated as having no extension. */
function extOf(path: string | null | undefined): string {
  if (!path) return "";
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const basenameStart = slash + 1;
  const dot = path.lastIndexOf(".");
  if (dot <= basenameStart) return ""; // no extension OR leading-dot hidden file
  return path.slice(dot + 1).toLowerCase();
}

/** True when the path looks like an Obsidian Canvas file (`.canvas`). */
export function isCanvasPath(path: string | null | undefined): boolean {
  return extOf(path) === "canvas";
}

/** True when the path is a standalone HTML document (`.html` / `.htm`). */
export function isHtmlPath(path: string | null | undefined): boolean {
  const ext = extOf(path);
  return ext === "html" || ext === "htm";
}

/** Markdown extensions Markup treats as text editor content. Matches
 *  the Rust-side gate in src-tauri/src/commands.rs::looks_like_markdown. */
const MARKDOWN_EXTS: ReadonlySet<string> = new Set(["md", "markdown", "mdx", "mkd"]);

export function isMarkdownPath(path: string | null | undefined): boolean {
  return MARKDOWN_EXTS.has(extOf(path));
}
