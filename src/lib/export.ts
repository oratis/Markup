import { renderHtml } from "./tauri";

export type ExportTheme = "github" | "plain" | "tufte";

/**
 * Open a print dialog with rendered HTML. The user can save as PDF from the
 * dialog (macOS standard "Save as PDF" in the print sheet's PDF popover).
 */
export async function exportPdfViaPrint(
  content: string,
  title: string,
  theme: ExportTheme = "github",
) {
  const html = await renderHtml(content, title, theme);
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) {
    console.error("export: popup blocked");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Wait for the document's resources to load — this matters when the export
  // pulls KaTeX / Mermaid from a CDN, which only happens for docs that use
  // math or diagrams. Cap the wait so a slow/offline CDN can't hang the print.
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    if (win.document.readyState === "complete") finish();
    else win.addEventListener("load", finish, { once: true });
    setTimeout(finish, 4000);
  });
  // A short extra settle for asynchronous diagram rendering (mermaid renders
  // to SVG in a microtask after load) and font layout.
  await new Promise((r) => setTimeout(r, 400));
  win.focus();
  win.print();
}

/** Trigger a download of a string as `filename` with given mime. */
function downloadString(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportHtml(
  content: string,
  baseName: string,
  theme: ExportTheme = "github",
) {
  const html = await renderHtml(content, baseName, theme);
  downloadString(html, `${baseName}.html`, "text/html");
}
