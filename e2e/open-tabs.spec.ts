import { expect, test, type Page } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

async function openSession(page: Page, count = 70) {
  await installTauriMock(page);
  await page.addInitScript((count) => {
    localStorage.setItem("markup.onboarded", "true");
    localStorage.setItem("markup.locale", "en");
    localStorage.setItem("markup.settings", JSON.stringify({ autosaveMs: 0 }));
    const paths = Array.from(
      { length: count },
      (_, i) => `/notes/topic-${String(i).padStart(2, "0")}.md`,
    );
    paths.push("/work/README.md", "/personal/README.md", "/笔记/中文 空格.md");
    localStorage.setItem(
      "markup.session",
      JSON.stringify({ open: paths, active: paths[0] }),
    );
    // biome-ignore lint/suspicious/noExplicitAny: browser-side native filesystem shim
    const native = (window as any).__TAURI_INTERNALS__;
    const invoke = native.invoke;
    native.invoke = (command: string, args: { path?: string } = {}) => {
      if (command === "read_file")
        return Promise.resolve({
          path: args.path,
          content: `# ${args.path}\n\nDocument content.\n`,
          mtime_ms: 1,
        });
      if (command === "write_file") return Promise.resolve(2);
      return invoke(command, args);
    };
  }, count);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: `Search open tabs (${count + 3})`, exact: true }),
  ).toBeVisible();
}

test("finds tabs across a long strip and reveals the selected tab", async ({
  page,
}, info) => {
  await openSession(page);
  const trigger = page.getByRole("button", {
    name: "Search open tabs (73)",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: /^Open Tabs/ });
  await expect(dialog.getByRole("option")).toHaveCount(73);
  await page.screenshot({ path: info.outputPath("open-tabs-light.png") });
  const search = dialog.getByRole("combobox");
  await search.fill("personal/readme");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await search.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "/personal/README.md", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-tab-id="/personal/README.md"]')).toBeInViewport();
  await expect(trigger).toBeInViewport();
  await page.keyboard.press("ControlOrMeta+Shift+L");
  await search.fill("中文 空格");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await search.press("Enter");
  await expect(
    page.getByRole("heading", { name: "/笔记/中文 空格.md", exact: true }),
  ).toBeVisible();
});

test("bulk actions ignore the filter and can include pinned tabs", async ({
  page,
}, info) => {
  // A newly mounted editor may still be saving its normalized Markdown.
  // Confirm the intentional discard here; the next test verifies cancellation.
  page.on("dialog", (prompt) => prompt.accept());
  await openSession(page, 2);
  await page.locator('[data-tab-id="/notes/topic-00.md"]').click({ button: "right" });
  await page.getByRole("button", { name: "Pin", exact: true }).click();
  await page.getByRole("button", { name: "Search open tabs (5)", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /^Open Tabs/ });
  await dialog.getByRole("combobox").fill("personal/readme");
  await dialog.getByRole("combobox").press("Enter");
  await page.getByRole("button", { name: "Search open tabs (5)", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Keep current & pinned", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 640, height: 650 });
  await page.evaluate(() => document.documentElement.classList.add("theme-dark"));
  await page.screenshot({ path: info.outputPath("open-tabs-dark-narrow.png") });
  await dialog.getByRole("checkbox", { name: "Also close pinned tabs (1)" }).check();
  await dialog.getByRole("combobox").fill("中文");
  await dialog.getByRole("button", { name: "Keep only current", exact: true }).click();
  await expect(page.locator("[data-tab-id]")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "/personal/README.md", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Search open tabs (1)", exact: true }).click();
  await dialog.getByRole("button", { name: "Close all (1)", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to Markup", exact: true }),
  ).toBeVisible();
});

test("cancelled bulk close preserves unsaved editor content", async ({ page }) => {
  await openSession(page, 2);
  await page.keyboard.press("ControlOrMeta+,");
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.locator('input[type="range"][max="2000"]').focus();
  await page.locator('input[type="range"][max="2000"]').press("Home");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.keyboard.press("e");
  const editor = page.locator(".ProseMirror");
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await editor.fill("Work that must survive cancellation");
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Search open tabs (5)", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /^Open Tabs/ });
  page.once("dialog", async (prompt) => {
    expect(prompt.message()).toContain("topic-00.md");
    await prompt.dismiss();
  });
  await dialog.getByRole("button", { name: "Close all (5)", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(page.locator("[data-tab-id]")).toHaveCount(5);
  await dialog.getByRole("combobox").press("Escape");
  await expect(editor).toContainText("Work that must survive cancellation");
});

test("search remains reachable with the tab strip hidden", async ({ page }) => {
  await openSession(page, 2);
  await page.keyboard.press("ControlOrMeta+Shift+P");
  await page.getByPlaceholder("Run a command…").fill("Toggle Tab Bar");
  await page.getByPlaceholder("Run a command…").press("Enter");
  await expect(page.getByTestId("tab-strip")).not.toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+L");
  const dialog = page.getByRole("dialog", { name: /^Open Tabs/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("personal");
  await dialog.getByRole("combobox").press("Enter");
  await expect(
    page.getByRole("heading", { name: "/personal/README.md", exact: true }),
  ).toBeVisible();
});
