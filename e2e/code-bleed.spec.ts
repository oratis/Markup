import { expect, type Page, test } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

/**
 * Code-block layout — see docs/design/08-wide-tables.md §4.9.
 *
 * A code block reuses the table bleed system: `pre` is a transparent box
 * that may bleed symmetrically past the prose column, `pre > code` carries
 * the skin and is sized to its widest line — floored at the prose column so
 * short snippets look exactly as they did, capped at the bleed width.
 *
 * Lines wrap (`white-space: pre-wrap`), so the win is a wider WRAP MEASURE,
 * not a scrollbar: assertions here measure box width and wrapped height,
 * never scrollWidth.
 */

const SHORT_CODE = ["```bash", "pnpm dev", "```", ""].join("\n");

/** One line far wider than the prose column, unbroken by spaces. */
const LONG_LINE = `const result = await fetchSomething({ endpoint: "/api/v1/collections/items", retries: 3, timeoutMs: 15000, onProgress: (n) => console.log(n) });`;
const LONG_CODE = ["```ts", LONG_LINE, "```", ""].join("\n");

/** Geometry of the first code block on the page, in CSS pixels. */
async function codeMetrics(page: Page) {
  return page.evaluate(() => {
    const pre = document.querySelector<HTMLElement>(".milkdown .editor pre");
    if (!pre) throw new Error("no code block rendered");
    const code = pre.querySelector<HTMLElement>("code");
    if (!code) throw new Error("no code element");
    const editor = document.querySelector<HTMLElement>(".milkdown .editor");
    if (!editor) throw new Error("no editor");
    const ecs = getComputedStyle(editor);
    const para = editor.querySelector<HTMLElement>("p");
    return {
      column:
        editor.clientWidth - parseFloat(ecs.paddingLeft) - parseFloat(ecs.paddingRight),
      paraLeft: para ? para.getBoundingClientRect().left : null,
      preLeft: pre.getBoundingClientRect().left,
      preRight: pre.getBoundingClientRect().right,
      codeWidth: code.getBoundingClientRect().width,
      codeLeft: code.getBoundingClientRect().left,
      codeRight: code.getBoundingClientRect().right,
      codeHeight: code.getBoundingClientRect().height,
      codeBg: getComputedStyle(code).backgroundColor,
      editorLeft: editor.getBoundingClientRect().left,
      editorRight: editor.getBoundingClientRect().right,
      pageScrollWidth: document.documentElement.scrollWidth,
      pageClientWidth: document.documentElement.clientWidth,
    };
  });
}

/** Replace the whole document by typing into source mode, then come back. */
async function setSourceMarkdown(page: Page, markdown: string) {
  await page.keyboard.press("ControlOrMeta+/");
  const cm = page.locator(".cm-content");
  await expect(cm).toBeVisible();
  await cm.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(markdown);
  await page.keyboard.press("ControlOrMeta+/");
  await expect(page.locator(".milkdown .editor pre")).toBeVisible();
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

test("a short snippet keeps the prose column and the prose left edge", async ({
  page,
}) => {
  await setSourceMarkdown(page, `Some prose above.\n\n${SHORT_CODE}`);
  const m = await codeMetrics(page);

  // Tier 1 of the bleed system: content narrower than the column does not
  // bleed at all — same box, same left edge as the paragraphs around it.
  expect(Math.round(m.codeWidth)).toBe(Math.round(m.column));
  expect(Math.round(m.codeLeft)).toBe(Math.round(m.paraLeft as number));
  expect(m.pageScrollWidth).toBeLessThanOrEqual(m.pageClientWidth);
});

test("the code skin still paints after moving from pre to code", async ({ page }) => {
  await setSourceMarkdown(page, SHORT_CODE);
  const m = await codeMetrics(page);

  // The old rule stripped `code`'s background with !important. If it ever
  // comes back, the block renders as bare text on the page background —
  // low-contrast enough on the light theme to survive a glance.
  expect(m.codeBg).not.toBe("rgba(0, 0, 0, 0)");
  expect(m.codeBg).not.toBe("transparent");
});

test("a long line bleeds past the prose column, centred, and wraps less", async ({
  page,
}) => {
  await setSourceMarkdown(page, LONG_CODE);
  const wide = await codeMetrics(page);

  expect(wide.codeWidth).toBeGreaterThan(wide.column * 1.2);
  // Symmetric: the bleed is centred on the pane, not anchored to one side.
  const leftGap = wide.codeLeft - wide.editorLeft;
  const rightGap = wide.editorRight - wide.codeRight;
  expect(Math.abs(leftGap - rightGap)).toBeLessThan(2);
  // Never past the pane, and the page itself never scrolls sideways.
  expect(wide.codeLeft).toBeGreaterThanOrEqual(wide.editorLeft);
  expect(wide.pageScrollWidth).toBeLessThanOrEqual(wide.pageClientWidth);

  // The point of the exercise: the same line occupies fewer wrapped rows
  // than it would inside the prose column.
  const confined = await page.evaluate(() => {
    const code = document.querySelector<HTMLElement>(".milkdown .editor pre > code");
    if (!code) throw new Error("no code element");
    const before = code.getBoundingClientRect().height;
    code.style.maxWidth = "720px";
    const after = code.getBoundingClientRect().height;
    code.style.maxWidth = "";
    return { before, after };
  });
  expect(confined.after).toBeGreaterThan(confined.before);
});

test("a code block inside a blockquote stays inside it and does not scroll", async ({
  page,
}) => {
  await setSourceMarkdown(
    page,
    ["> Quoted:", ">", "> ```ts", `> ${LONG_LINE}`, "> ```", ""].join("\n"),
  );
  const m = await page.evaluate(() => {
    const quote = document.querySelector<HTMLElement>(".milkdown .editor blockquote");
    const pre = document.querySelector<HTMLElement>(".milkdown .editor pre");
    if (!quote || !pre) throw new Error("no quoted code block rendered");
    return {
      inQuote: quote.contains(pre),
      quoteLeft: quote.getBoundingClientRect().left,
      quoteRight: quote.getBoundingClientRect().right,
      preLeft: pre.getBoundingClientRect().left,
      preRight: pre.getBoundingClientRect().right,
      // The nested case is where an absolute `--mk-column` floor forced a
      // spurious scrollbar on tables; guard the code block against it too.
      preScrollWidth: pre.scrollWidth,
      preClientWidth: pre.clientWidth,
    };
  });

  expect(m.inQuote).toBe(true);
  expect(m.preLeft).toBeGreaterThanOrEqual(m.quoteLeft - 1);
  expect(m.preRight).toBeLessThanOrEqual(m.quoteRight + 1);
  expect(m.preScrollWidth).toBeLessThanOrEqual(m.preClientWidth);
});

test("read mode renders the code block with the same geometry as edit mode", async ({
  page,
}) => {
  await setSourceMarkdown(page, LONG_CODE);
  const edit = await codeMetrics(page);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page.locator(".ProseMirror").first()).toHaveAttribute(
    "contenteditable",
    "false",
  );
  const read = await codeMetrics(page);

  expect(Math.round(read.codeWidth)).toBe(Math.round(edit.codeWidth));
  expect(Math.round(read.codeLeft)).toBe(Math.round(edit.codeLeft));
});

test("without container-query units the code block keeps today's geometry", async ({
  page,
}) => {
  // macOS 10.15's WebView has no `cqw`, so the @supports block never applies
  // and the editor keeps its declared defaults. Chromium always supports
  // cqw, so reproduce that state directly.
  await setSourceMarkdown(page, LONG_CODE);
  await page.evaluate(() => {
    const editor = document.querySelector<HTMLElement>(".milkdown .editor");
    if (!editor) throw new Error("no editor");
    editor.style.setProperty("--mk-bleed", "0px");
    editor.style.setProperty("--mk-column", "100%");
  });
  const m = await codeMetrics(page);

  expect(Math.round(m.codeWidth)).toBe(Math.round(m.column));
  expect(m.pageScrollWidth).toBeLessThanOrEqual(m.pageClientWidth);
});

test("a narrow pane leaves the code block in the prose column", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await setSourceMarkdown(page, LONG_CODE);
  const m = await codeMetrics(page);

  // No room to bleed once the 32px gutter allowance is taken.
  expect(Math.round(m.codeWidth)).toBeLessThanOrEqual(Math.round(m.column) + 1);
  expect(m.pageScrollWidth).toBeLessThanOrEqual(m.pageClientWidth);
});
