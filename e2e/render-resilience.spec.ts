import { expect, test } from "@playwright/test";

// Regression guard: a document whose `$…$` math span captures prose with an
// undefined control sequence (e.g. `\*`) used to throw an uncaught KaTeX
// parse error during ProseMirror render and blank the entire app. KaTeX is
// now configured with throwOnError:false, and a top-level ErrorBoundary backs
// it up — so a bad equation degrades to an inline error, never a white screen.
test("a malformed $…$ math span never white-screens the app", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.addInitScript(() => {
    const body =
      "# Resilience\n\nProse with a bad inline equation $保守按 \\*\\* x$ and text after.\n";
    const responses: Record<string, unknown> = {
      "plugin:event|listen": 1,
      "plugin:event|unlisten": null,
      "plugin:app|version": "0.0.0-e2e",
      list_recent_files: [],
      restore_vault: null,
      current_vault: null,
      list_vault_files: [],
      take_pending_files: ["/v/bad-math.md"],
      read_file: { path: "/v/bad-math.md", content: body, mtime_ms: 1 },
      search_vault: [],
    };
    // biome-ignore lint/suspicious/noExplicitAny: browser-side test shim
    (window as any).__TAURI_INTERNALS__ = {
      invoke: (cmd: string) => Promise.resolve(cmd in responses ? responses[cmd] : null),
      transformCallback: () => 1,
      unregisterCallback: () => {},
      convertFileSrc: (p: string) => p,
    };
  });

  await page.goto("/", { waitUntil: "load" });

  // The editor surface mounts and shows the document — not a blank page.
  const editor = page.locator(".ProseMirror, .milkdown").first();
  await expect(editor).toBeVisible();
  await expect(editor).toContainText("Prose with a bad inline equation");
  await expect(editor).toContainText("text after");

  // The bad equation degraded to an inline KaTeX error, and nothing threw.
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
});
