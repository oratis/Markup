import { isTauri } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";

/** Tauri's window.confirm shim returns a Promise, unlike the browser API.
 * Use the supported message-backed API (covered by dialog:allow-message). */
export function confirmDiscardMessage(message: string): boolean | Promise<boolean> {
  if (isTauri()) return confirm(message, { title: "Markup", kind: "warning" });
  return window.confirm(message);
}
