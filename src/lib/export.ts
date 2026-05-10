import { renderHtml } from "./tauri";

/**
 * Open a print dialog with rendered HTML. The user can save as PDF from the
 * dialog (macOS standard "Save as PDF" in the print sheet's PDF popover).
 */
export async function exportPdfViaPrint(content: string, title: string) {
  const html = await renderHtml(content, title);
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) {
    console.error("export: popup blocked");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Wait briefly for content + fonts to lay out before triggering print.
  await new Promise((r) => setTimeout(r, 250));
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

export async function exportHtml(content: string, baseName: string) {
  const html = await renderHtml(content, baseName);
  downloadString(html, `${baseName}.html`, "text/html");
}
