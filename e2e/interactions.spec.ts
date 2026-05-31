import { expect, test } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

// Keyboard-driven UI surfaces that don't need the Rust backend — exercised
// against the Vite dev build with the Tauri IPC stubbed (see tauri-mock.ts).
// Each test gets a fresh page (Playwright isolates per test), so focus starts
// on <body> and the bindings in App.tsx's keydown handler fire as intended.

test.beforeEach(async ({ page }) => {
  await installTauriMock(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();
});

test("command palette opens with Mod+Shift+P and closes with Esc", async ({ page }) => {
  const palette = page.getByPlaceholder("Run a command…");
  await expect(palette).toHaveCount(0);

  await page.keyboard.press("Control+Shift+P");
  await expect(palette).toBeVisible();
  await expect(palette).toBeFocused();

  // Filtering narrows the command list (the welcome doc has a "Toggle Source
  // Mode" command, among many).
  await palette.fill("source");
  await expect(page.getByText(/source/i).first()).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);
});

test("find bar opens with Mod+F and closes with Esc", async ({ page }) => {
  const find = page.getByPlaceholder("Find…");
  await expect(find).toHaveCount(0);

  // Boots in read (WYSIWYG) mode, not source — so Mod+F is the in-file find,
  // not CodeMirror's native search.
  await page.keyboard.press("Control+f");
  await expect(find).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(find).toHaveCount(0);
});

test("E enters edit mode and Esc returns to read mode", async ({ page }) => {
  const pm = page.locator(".ProseMirror").first();
  await expect(pm).toBeVisible();
  // Read mode is the default → the editor surface is not editable.
  await expect(pm).toHaveAttribute("contenteditable", "false");

  await page.keyboard.press("e");
  await expect(pm).toHaveAttribute("contenteditable", "true");

  await page.keyboard.press("Escape");
  await expect(pm).toHaveAttribute("contenteditable", "false");
});
