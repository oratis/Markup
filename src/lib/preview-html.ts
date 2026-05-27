import { openPath } from "@tauri-apps/plugin-opener";
import { tempDir, join } from "@tauri-apps/api/path";
import { mkdir, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import type { ExportTheme } from "./export";
import { renderHtml } from "./tauri";

/**
 * One-click "view this MD as HTML in the system browser".
 *
 * - Renders content via the existing Rust-side `renderHtml` command
 *   (comrak + theme CSS).
 * - Writes to `<tempDir>/markup-preview/<safeName>.html` — temp dir
 *   survives until OS cleanup, so re-clicking the same file overwrites
 *   the same path and the browser tab can be refreshed.
 * - Opens the file with the OS default handler via plugin-opener.
 *
 * The dir prefix `markup-preview/` keeps our temp files namespaced so
 * they're easy to spot / clean if anyone goes looking in /tmp.
 */
export async function previewInBrowser(
  content: string,
  baseName: string,
  theme: ExportTheme = "github",
): Promise<string> {
  const html = await renderHtml(content, baseName, theme);

  const root = await tempDir();
  const dir = await join(root, "markup-preview");
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }

  // Sanitize: keep [A-Za-z0-9._-], collapse anything else to '-'. Limit
  // length so we don't trip the filesystem's max path on absurd names.
  const safe =
    baseName
      .replace(/\.(md|markdown|mdx|mkd)$/i, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .slice(0, 80) || "untitled";
  const path = await join(dir, `${safe}.html`);
  await writeTextFile(path, html);
  await openPath(path);
  return path;
}
