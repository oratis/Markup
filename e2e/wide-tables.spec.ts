import { expect, type Page, test } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

/**
 * Wide-table layout — see docs/design/08-wide-tables.md.
 *
 * A table may bleed symmetrically past the prose column up to 32px from the
 * pane edge, columns are sized by content (not equally), no column is
 * squeezed below ~6.5em, and anything still too wide scrolls inside its
 * wrapper rather than pushing the page sideways.
 */

const WIDE_TABLE = [
  "| 产品 | 赛道 | 0→1 起量方式 | 1→100 规模化引擎 | 主要流量来源 | 变现模式 | 当前量级 | 关键教训 |",
  "|---|---|---|---|---|---|---|---|",
  "| Character.AI | AI 角色 | 名人角色自带新闻性，加上先于产品建起来的社区和对话截图的病毒传播 | 品牌记忆大于 UGC 角色，再大于社区分发；付费转化仅 0.75% | Direct 71.45%，社交流量里 YouTube 占 61.5% | 订阅加对话内广告加代币 | 月访问 1.659 亿，MAU 约两千万 | 合规与变现同时改动核心循环才会掉量 |",
  "| Talkie | AI 角色加卡牌 | 海外先行，短视频投放 | 卡牌收集与抽卡循环把留存拉长 | 短视频与应用商店 | 内购抽卡加订阅 | 美区一度冲进总榜前十 | 玩法层比对话层更能撑留存 |",
  "",
].join("\n");

const SMALL_TABLE = [
  "| 项目 | 价格 | 开源 |",
  "|---|---|---|",
  "| Markup | 免费 | 是 |",
  "| Typora | $15 | 否 |",
  "",
].join("\n");

/** 20 columns of short values — past the point where bleeding can help. */
const MANY_COLUMNS = [
  `| ${Array.from({ length: 20 }, (_, i) => `C${i + 1}`).join(" | ")} |`,
  `|${"---|".repeat(20)}`,
  `| ${Array.from({ length: 20 }, (_, i) => `值${i + 1}`).join(" | ")} |`,
  "",
].join("\n");

/** Geometry of the first table on the page, in CSS pixels. */
async function tableMetrics(page: Page) {
  return page.evaluate(() => {
    const table = document.querySelector<HTMLTableElement>(".milkdown .editor table");
    if (!table) throw new Error("no table rendered");
    const wrap = table.parentElement as HTMLElement;
    const editor = document.querySelector<HTMLElement>(".milkdown .editor");
    if (!editor) throw new Error("no editor");
    const ecs = getComputedStyle(editor);
    const pane = editor.closest("section") as HTMLElement;
    const bodyRow = table.querySelectorAll("tr")[1];
    return {
      wrapClass: wrap.className,
      column:
        editor.clientWidth - parseFloat(ecs.paddingLeft) - parseFloat(ecs.paddingRight),
      paneWidth: pane.clientWidth,
      paneLeft: pane.getBoundingClientRect().left,
      tableWidth: table.getBoundingClientRect().width,
      tableLeft: table.getBoundingClientRect().left,
      wrapWidth: wrap.getBoundingClientRect().width,
      wrapScrollWidth: wrap.scrollWidth,
      wrapClientWidth: wrap.clientWidth,
      columnWidths: [...bodyRow.children].map((c) => c.getBoundingClientRect().width),
      pageScrollWidth: document.documentElement.scrollWidth,
      pageClientWidth: document.documentElement.clientWidth,
    };
  });
}

/** Put `markdown` on the clipboard and paste it at the caret. */
async function pasteMarkdown(page: Page, markdown: string) {
  await page.evaluate((md) => navigator.clipboard.writeText(md), markdown);
  await page.locator(".ProseMirror").click();
  await page.keyboard.press("ControlOrMeta+v");
  await expect(page.locator(".milkdown .editor table")).toBeVisible();
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
  await expect(page.locator(".milkdown .editor table")).toBeVisible();
}

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await installTauriMock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.isVisible()) await skip.click();
  // Edit mode, so the paste lands in the document.
  await page.keyboard.press("e");
  await expect(page.locator(".ProseMirror").first()).toHaveAttribute(
    "contenteditable",
    "true",
  );
});

test("a wide table bleeds past the prose column without overflowing the pane", async ({
  page,
}) => {
  await pasteMarkdown(page, WIDE_TABLE);
  const m = await tableMetrics(page);

  expect(m.wrapClass).toContain("mk-table-wrap");
  // Bleeds well past the prose column…
  expect(m.tableWidth).toBeGreaterThan(m.column * 1.5);
  // …but keeps a gutter at the pane edge, and never spills out of the pane.
  expect(m.tableWidth).toBeLessThanOrEqual(m.paneWidth - 64 + 1);
  expect(m.tableLeft).toBeGreaterThanOrEqual(m.paneLeft - 1);
  // The page itself must not gain a horizontal scrollbar.
  expect(m.pageScrollWidth).toBeLessThanOrEqual(m.pageClientWidth);
});

test("wide-table columns are sized by content, none squeezed to a sliver", async ({
  page,
}) => {
  await pasteMarkdown(page, WIDE_TABLE);
  const { columnWidths } = await tableMetrics(page);

  expect(columnWidths).toHaveLength(8);
  // The floor is 6.5em on a 15.2px cell font ≈ 98.8px; allow for rounding.
  for (const w of columnWidths) expect(w).toBeGreaterThan(95);
  // Content-proportional, not the equal split `table-layout: fixed` gave:
  // the widest column is clearly wider than the narrowest.
  expect(Math.max(...columnWidths)).toBeGreaterThan(Math.min(...columnWidths) * 1.4);
});

test("a small table still fills exactly the prose column", async ({ page }) => {
  await pasteMarkdown(page, SMALL_TABLE);
  const m = await tableMetrics(page);

  expect(Math.round(m.tableWidth)).toBe(Math.round(m.column));
  // Centred in its (bleeding) wrapper, so it still lines up with the prose.
  expect(m.wrapScrollWidth).toBeLessThanOrEqual(m.wrapClientWidth);
});

test("a table too wide even for the bleed scrolls inside its wrapper", async ({
  page,
}) => {
  await pasteMarkdown(page, MANY_COLUMNS);
  const m = await tableMetrics(page);

  // Wrapper overflows → its own horizontal scrollbar…
  expect(m.wrapScrollWidth).toBeGreaterThan(m.wrapClientWidth);
  // …while the page stays put, and the left edge is not cut off by centring.
  expect(m.pageScrollWidth).toBeLessThanOrEqual(m.pageClientWidth);
  expect(m.tableLeft).toBeGreaterThanOrEqual(m.paneLeft - 1);
});

test("read mode renders the table with the same geometry as edit mode", async ({
  page,
}) => {
  await pasteMarkdown(page, WIDE_TABLE);
  const edit = await tableMetrics(page);

  // Esc only leaves edit mode when focus is outside the editable surface —
  // that is the app's own rule (App.tsx `isEditableTarget`), unrelated to
  // tables; blur first, the way clicking chrome would.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page.locator(".ProseMirror").first()).toHaveAttribute(
    "contenteditable",
    "false",
  );
  const read = await tableMetrics(page);

  expect(Math.round(read.tableWidth)).toBe(Math.round(edit.tableWidth));
  expect(read.columnWidths.map(Math.round)).toEqual(edit.columnWidths.map(Math.round));
});

test("a table inside a blockquote stays inside it", async ({ page }) => {
  // Via source mode: pasting `> |…|` at a caret inside an existing paragraph
  // does not nest, and this test is about the nested case specifically.
  await setSourceMarkdown(
    page,
    WIDE_TABLE.split("\n")
      .map((l) => (l ? `> ${l}` : l))
      .join("\n"),
  );
  const m = await page.evaluate(() => {
    const quote = document.querySelector<HTMLElement>(".milkdown .editor blockquote");
    const table = document.querySelector<HTMLTableElement>(".milkdown .editor table");
    if (!quote || !table) throw new Error("no quoted table rendered");
    const wrap = table.parentElement as HTMLElement;
    return {
      inQuote: quote.contains(table),
      quoteLeft: quote.getBoundingClientRect().left,
      quoteRight: quote.getBoundingClientRect().right,
      wrapLeft: wrap.getBoundingClientRect().left,
      wrapRight: wrap.getBoundingClientRect().right,
    };
  });

  expect(m.inQuote).toBe(true);
  // No bleed: the wrapper stays within the quote's content box.
  expect(m.wrapLeft).toBeGreaterThanOrEqual(m.quoteLeft - 1);
  expect(m.wrapRight).toBeLessThanOrEqual(m.quoteRight + 1);
});

test("a small table inside a blockquote does not gain a scrollbar", async ({ page }) => {
  // The nested wrapper is NARROWER than the prose column, so flooring the
  // table at an absolute `--mk-column` overflowed a table that fits and put
  // a scrollbar on it. The wide-table case above cannot catch that: it
  // overflows either way. Hence a small table, asserting it does not scroll.
  await setSourceMarkdown(
    page,
    SMALL_TABLE.split("\n")
      .map((l) => (l ? `> ${l}` : l))
      .join("\n"),
  );
  const m = await page.evaluate(() => {
    const table = document.querySelector<HTMLTableElement>(".milkdown .editor table");
    if (!table) throw new Error("no quoted table rendered");
    const wrap = table.parentElement as HTMLElement;
    return {
      wrapScrollWidth: wrap.scrollWidth,
      wrapClientWidth: wrap.clientWidth,
      tableWidth: table.getBoundingClientRect().width,
      wrapWidth: wrap.getBoundingClientRect().width,
    };
  });

  expect(m.wrapScrollWidth).toBeLessThanOrEqual(m.wrapClientWidth);
  expect(m.tableWidth).toBeLessThanOrEqual(m.wrapWidth + 1);
});

test("without container-query units the table still fits and scrolls", async ({
  page,
}) => {
  // macOS 10.15's WebView has no `cqw`, so the @supports block never applies
  // and the wrapper keeps its declared defaults. Reproduce that state
  // directly — Chromium always supports cqw, so it cannot be feature-tested.
  await pasteMarkdown(page, WIDE_TABLE);
  await page.evaluate(() => {
    const wrap = document.querySelector<HTMLElement>(".mk-table-wrap");
    if (!wrap) throw new Error("no wrapper");
    wrap.style.setProperty("--mk-bleed", "0px");
    wrap.style.setProperty("--mk-column", "100%");
    wrap.style.marginInline = "0";
  });
  const m = await tableMetrics(page);

  // Confined to the prose column, overflow scrolls inside the wrapper, and
  // the columns still have their floor — no one-character-per-line.
  expect(Math.round(m.wrapWidth)).toBe(Math.round(m.column));
  expect(m.wrapScrollWidth).toBeGreaterThan(m.wrapClientWidth);
  expect(m.pageScrollWidth).toBeLessThanOrEqual(m.pageClientWidth);
  for (const w of m.columnWidths) expect(w).toBeGreaterThan(95);
});

test("a narrow pane falls back to the prose column with a scroll", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await pasteMarkdown(page, WIDE_TABLE);
  const m = await tableMetrics(page);

  // No room to bleed: the wrapper stays within the prose column (+ the 32px
  // gutter allowance can only shrink it), and the overflow scrolls.
  expect(m.wrapWidth).toBeLessThanOrEqual(m.paneWidth);
  expect(m.wrapScrollWidth).toBeGreaterThan(m.wrapClientWidth);
  expect(m.pageScrollWidth).toBeLessThanOrEqual(m.pageClientWidth);
});
