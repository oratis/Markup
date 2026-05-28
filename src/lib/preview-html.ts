import { openPath } from "@tauri-apps/plugin-opener";
import type { ExportTheme } from "./export";
import { renderHtml, writePreviewHtml } from "./tauri";

/**
 * One-click "view this MD as HTML in the system browser".
 *
 * 1. Render content via the Rust `render_html` command (comrak + theme).
 * 2. Write it to `<tempDir>/markup-preview/<name>.html` via the Rust
 *    `write_preview_html` command. We do the write in Rust on purpose:
 *    the JS `fs` plugin enforces a path allow-list and rejects the temp
 *    dir ("forbidden path"), and under the App Sandbox the temp dir is
 *    the app's own container — native writes there are always allowed.
 * 3. Open the file with the OS default handler via plugin-opener.
 *
 * Re-running overwrites the same path so an open browser tab can refresh.
 */
export async function previewInBrowser(
  content: string,
  baseName: string,
  theme: ExportTheme = "github",
): Promise<string> {
  const html = await renderHtml(content, baseName, theme);
  const path = await writePreviewHtml(html, baseName);
  await openPath(path);
  return path;
}
