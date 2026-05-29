import { expect, test } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await installTauriMock(page);
});

test("boots and renders the welcome document", async ({ page }) => {
  await page.goto("/");

  // The whole React tree + Zustand store + Milkdown render pipeline has to
  // come up for the seeded welcome doc's heading to appear.
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();

  // No uncaught page errors during boot (the Tauri mock should absorb every
  // IPC call the startup path makes).
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
});

test("toggles between WYSIWYG and source mode with Mod+/", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();

  // Default view is the rendered WYSIWYG surface (Milkdown / ProseMirror),
  // not the CodeMirror source editor.
  const sourceEditor = page.locator(".cm-editor");
  await expect(sourceEditor).toHaveCount(0);

  // Mod+/ switches to source mode → CodeMirror mounts and the raw markdown
  // (the literal "# Welcome to Markup" line) becomes visible.
  await page.keyboard.press("Control+/");
  await expect(sourceEditor).toBeVisible();
  await expect(sourceEditor).toContainText("# Welcome to Markup");

  // Toggling again returns to WYSIWYG — CodeMirror unmounts.
  await page.keyboard.press("Control+/");
  await expect(sourceEditor).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();
});
