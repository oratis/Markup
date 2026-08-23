import { expect, type Page, test } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

/**
 * In-app Mermaid rendering — see docs/design/09-mermaid-in-app.md.
 *
 * @milkdown/plugin-diagram ships the schema but no view, so a mermaid block
 * used to render as its own source text. The diagram-view NodeView renders it
 * to SVG inside a wrapper that reuses the bleed system, so a wide diagram can
 * use the pane width instead of being capped at the prose column.
 */

/** A chain wide enough to exceed the 720px prose column. */
const WIDE_DIAGRAM = [
  "```mermaid",
  "graph LR",
  "  A[Open a file] --> B[Read mode]",
  "  B --> C[Press E to edit]",
  "  C --> D[Autosave to disk]",
  "  D --> E[Export as HTML]",
  "  E --> F[Share the page]",
  "```",
  "",
].join("\n");

const SMALL_DIAGRAM = ["```mermaid", "graph LR", "  A --> B", "```", ""].join("\n");

const BROKEN_DIAGRAM = [
  "```mermaid",
  "graph LR",
  "  A --> ((((( totally not valid",
  "```",
  "",
].join("\n");

/** Replace the whole document via source mode, then come back to WYSIWYG. */
async function setSourceMarkdown(page: Page, markdown: string) {
  await page.keyboard.press("ControlOrMeta+/");
  const cm = page.locator(".cm-content");
  await expect(cm).toBeVisible();
  await cm.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(markdown);
  await page.keyboard.press("ControlOrMeta+/");
  await expect(page.locator(".milkdown .editor .mk-diagram-wrap")).toBeVisible();
}

async function diagramMetrics(page: Page) {
  return page.evaluate(() => {
    const wrap = document.querySelector<HTMLElement>(".milkdown .editor .mk-diagram-wrap");
    if (!wrap) throw new Error("no diagram wrapper");
    const svg = wrap.querySelector("svg");
    const editor = document.querySelector<HTMLElement>(".milkdown .editor");
    if (!editor) throw new Error("no editor");
    const ecs = getComputedStyle(editor);
    return {
      hasSvg: !!svg,
      svgWidth: svg ? svg.getBoundingClientRect().width : 0,
      wrapWidth: wrap.getBoundingClientRect().width,
      wrapLeft: wrap.getBoundingClientRect().left,
      wrapRight: wrap.getBoundingClientRect().right,
      column:
        editor.clientWidth - parseFloat(ecs.paddingLeft) - parseFloat(ecs.paddingRight),
      editorLeft: editor.getBoundingClientRect().left,
      editorRight: editor.getBoundingClientRect().right,
      pageScrollWidth: document.documentElement.scrollWidth,
      pageClientWidth: document.documentElement.clientWidth,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await installTauriMock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.isVisible()) await skip.click();
  await page.keyboard.press("e");
  await expect(page.locator(".ProseMirror").first()).toHaveAttribute(
    "contenteditable",
    "true",
  );
});

test("a mermaid block renders as an SVG, not as its own source", async ({ page }) => {
  await setSourceMarkdown(page, SMALL_DIAGRAM);
  const svg = page.locator(".milkdown .editor .mk-diagram-wrap svg");
  await expect(svg).toBeVisible();

  // The regression this feature fixes: the node used to render the mermaid
  // source as plain text, with no <svg> anywhere in the editor.
  const m = await diagramMetrics(page);
  expect(m.hasSvg).toBe(true);
  expect(m.svgWidth).toBeGreaterThan(0);
});

test("the welcome document's diagram renders in read mode", async ({ page }) => {
  // Boots in read mode; the shipped welcome doc contains a mermaid block.
  await page.keyboard.press("Escape");
  await expect(page.locator(".milkdown .editor .mk-diagram-wrap svg")).toBeVisible();
});

test("a wide diagram uses more than the prose column and stays in the pane", async ({
  page,
}) => {
  await setSourceMarkdown(page, WIDE_DIAGRAM);
  await expect(page.locator(".mk-diagram-wrap svg")).toBeVisible();
  const m = await diagramMetrics(page);

  // The wrapper bleeds symmetrically past the prose column…
  expect(m.wrapWidth).toBeGreaterThan(m.column);
  const leftGap = m.wrapLeft - m.editorLeft;
  const rightGap = m.editorRight - m.wrapRight;
  expect(Math.abs(leftGap - rightGap)).toBeLessThan(2);
  // …without ever pushing the page sideways.
  expect(m.wrapLeft).toBeGreaterThanOrEqual(m.editorLeft - 1);
  expect(m.pageScrollWidth).toBeLessThanOrEqual(m.pageClientWidth);
  // The diagram itself is drawn wider than the column would have allowed.
  expect(m.svgWidth).toBeGreaterThan(m.column);
});

test("a small diagram is not stretched to fill the bleed width", async ({ page }) => {
  await setSourceMarkdown(page, SMALL_DIAGRAM);
  await expect(page.locator(".mk-diagram-wrap svg")).toBeVisible();
  const m = await diagramMetrics(page);

  // mermaid's inline `max-width: <natural>px` is deliberately kept: the
  // diagram draws at its natural size, centred, rather than ballooning.
  expect(m.svgWidth).toBeLessThan(m.column);
});

test("a malformed diagram never white-screens the app", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.keyboard.press("ControlOrMeta+/");
  const cm = page.locator(".cm-content");
  await expect(cm).toBeVisible();
  await cm.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(BROKEN_DIAGRAM);
  await page.keyboard.press("ControlOrMeta+/");

  // The editor is still alive and shows the source it could not draw…
  await expect(page.locator(".milkdown .editor")).toBeVisible();
  await expect(page.locator(".mk-diagram-source")).toBeVisible();
  await expect(page.locator(".mk-diagram-error-note")).toBeVisible();
  // …and mermaid's own error graphic never escapes into <body>.
  const strays = await page.evaluate(
    () => document.querySelectorAll("body > svg, body > div[id^='dmermaid']").length,
  );
  expect(strays).toBe(0);
  expect(errors).toEqual([]);
});

test("the corner toggle swaps between the diagram and its source", async ({ page }) => {
  await setSourceMarkdown(page, SMALL_DIAGRAM);
  await expect(page.locator(".mk-diagram-wrap svg")).toBeVisible();

  const toggle = page.locator(".mk-diagram-source-toggle");
  await toggle.click();
  await expect(page.locator(".mk-diagram-source")).toBeVisible();
  await expect(page.locator(".mk-diagram-wrap svg")).toHaveCount(0);

  await toggle.click();
  await expect(page.locator(".mk-diagram-wrap svg")).toBeVisible();
  await expect(page.locator(".mk-diagram-source")).toHaveCount(0);
});

test("switching to the dark theme re-renders the diagram", async ({ page }) => {
  await setSourceMarkdown(page, SMALL_DIAGRAM);
  await expect(page.locator(".mk-diagram-wrap svg")).toBeVisible();
  const before = await page.locator(".mk-diagram-wrap svg").getAttribute("id");

  // mermaid.initialize() is global and an already-drawn SVG keeps its
  // palette, so the view has to redraw on a theme flip.
  await page.evaluate(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-sepia");
    root.classList.add("theme-dark");
  });

  await expect
    .poll(() => page.locator(".mk-diagram-wrap svg").getAttribute("id"))
    .not.toBe(before);
  await expect(page.locator(".mk-diagram-wrap svg")).toBeVisible();
});
