import type { Page } from "@playwright/test";

/**
 * Installs a minimal `window.__TAURI_INTERNALS__` before any app script runs,
 * so the frontend's `invoke()` / event `listen()` calls resolve instead of
 * throwing in a plain browser. We return inert defaults for every command the
 * app touches on boot — the goal is a booted, interactive UI, not a faithful
 * backend. Tests that need real file/vault behaviour belong in the Rust
 * integration suite.
 */
export async function installTauriMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const responses: Record<string, unknown> = {
      // event plugin — listen returns a numeric handler id; unlisten is void.
      "plugin:event|listen": 1,
      "plugin:event|unlisten": null,
      "plugin:app|version": "0.0.0-e2e",
      list_recent_files: [],
      restore_vault: null,
      current_vault: null,
      take_pending_files: [],
    };
    let cbId = 0;
    const callbacks: Record<number, (payload: unknown) => void> = {};
    // biome-ignore lint/suspicious/noExplicitAny: browser-side test shim
    (window as any).__TAURI_INTERNALS__ = {
      invoke: (cmd: string) =>
        Promise.resolve(cmd in responses ? responses[cmd] : null),
      transformCallback: (cb: (payload: unknown) => void) => {
        cbId += 1;
        callbacks[cbId] = cb;
        return cbId;
      },
      unregisterCallback: (id: number) => {
        delete callbacks[id];
      },
      convertFileSrc: (path: string) => path,
    };
  });
}
