import { expect, test } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

test("reading and switching formatted documents never rewrites their source", async ({
  page,
}) => {
  await installTauriMock(page);
  await page.addInitScript(() => {
    const files: Record<string, string> = {
      "/notes/one.md": "# First document\n\n---\n\n- first\n- second\n\nPrice: $0.02\n",
      "/notes/two.md":
        "# Second document\n\n1. item\n   - nested\n\n| a | b |\n| --- | --- |\n| x | y |\n",
    };
    localStorage.setItem("markup.onboarded", "true");
    localStorage.setItem(
      "markup.session",
      JSON.stringify({ open: Object.keys(files), active: "/notes/one.md" }),
    );
    localStorage.setItem("markup.settings", JSON.stringify({ autosaveMs: 100 }));
    // biome-ignore lint/suspicious/noExplicitAny: native filesystem fixture
    const native = (window as any).__TAURI_INTERNALS__;
    const originalInvoke = native.invoke;
    const writes: unknown[] = [];
    // biome-ignore lint/suspicious/noExplicitAny: fixture observations
    (window as any).__readModeWrites = writes;
    native.invoke = async (command: string, args: { path: string; content: string }) => {
      if (command === "read_file")
        return { path: args.path, content: files[args.path], mtime_ms: 1 };
      if (command === "write_file") {
        writes.push(args);
        return 2;
      }
      return originalInvoke(command, args);
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "First document", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ProseMirror")).toHaveAttribute("contenteditable", "false");
  for (const path of ["/notes/two.md", "/notes/one.md", "/notes/two.md"]) {
    await page.locator(`[data-tab-id="${path}"]`).click();
    await expect(
      page.getByRole("heading", {
        name: path.endsWith("one.md") ? "First document" : "Second document",
        exact: true,
      }),
    ).toBeVisible();
  }
  // Let Milkdown's debounced serialization and the autosave deadline elapse.
  await page.waitForTimeout(1200);
  // biome-ignore lint/suspicious/noExplicitAny: fixture observations
  expect(await page.evaluate(() => (window as any).__readModeWrites)).toEqual([]);
  await page.keyboard.press("ControlOrMeta+/");
  await expect(page.locator(".cm-content")).toContainText("1. item");
  await expect(page.locator(".cm-content")).toContainText("   - nested");
  // Actual source edits must still save normally.
  await page.locator(".cm-content").fill("# Explicit user edit");
  await expect
    .poll(async () => {
      // biome-ignore lint/suspicious/noExplicitAny: fixture observations
      return page.evaluate(() => (window as any).__readModeWrites.length);
    })
    .toBeGreaterThan(0);
});
