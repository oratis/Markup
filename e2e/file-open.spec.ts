import { expect, test, type Page } from "@playwright/test";
import { installTauriMock } from "./tauri-mock";

// Real React/store/editor pipeline; only the native filesystem/event bridge is
// replaced. A gated read makes the launch race deterministic, without sleeps.
async function installFiles(
  page: Page,
  options: { restore?: boolean; pending?: boolean; holdListener?: boolean } = {},
) {
  await installTauriMock(page);
  await page.addInitScript(({ restore, pending: hasPending, holdListener }) => {
    localStorage.setItem("markup.onboarded", "true");
    if (restore) {
      localStorage.setItem(
        "markup.session",
        JSON.stringify({
          open: ["/v/previous.md"],
          active: "/v/previous.md",
        }),
      );
    }
    const files: Record<string, string> = {
      "/v/previous.md": "# Previous document\n\nOld content.\n",
      "/v/requested.md": "# Requested document\n\nNew content.\n",
    };
    // biome-ignore lint/suspicious/noExplicitAny: browser-side native bridge shim
    const native = (window as any).__TAURI_INTERNALS__;
    const originalInvoke = native.invoke;
    const callbacks = new Map<number, (event: unknown) => void>();
    const listeners = new Map<number, { event: string; handler: number }>();
    let nextId = 0;
    let pending = hasPending ? ["/v/requested.md"] : [];
    let releaseRead!: () => void;
    const blockedRead = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    let releaseListener!: () => void;
    const blockedListener = new Promise<void>((resolve) => {
      releaseListener = resolve;
    });
    native.transformCallback = (callback: (event: unknown) => void) => {
      const id = ++nextId;
      callbacks.set(id, callback);
      return id;
    };
    native.unregisterCallback = (id: number) => callbacks.delete(id);
    native.invoke = async (command: string, args: Record<string, unknown> = {}) => {
      if (command === "plugin:event|listen") {
        if (holdListener && args.event === "open-files") await blockedListener;
        const id = ++nextId;
        listeners.set(id, { event: String(args.event), handler: Number(args.handler) });
        return id;
      }
      if (command === "plugin:event|unlisten") {
        listeners.delete(Number(args.eventId));
        return;
      }
      if (command === "take_pending_files") {
        const paths = pending;
        pending = [];
        return paths;
      }
      if (command === "read_file") {
        const path = String(args.path);
        if (restore && path === "/v/previous.md") await blockedRead;
        if (!(path in files)) throw new Error(`Missing fixture: ${path}`);
        return { path, content: files[path], mtime_ms: 1 };
      }
      if (command === "write_file") return 2;
      return originalInvoke(command, args);
    };
    // biome-ignore lint/suspicious/noExplicitAny: browser-side test controls
    (window as any).__fileOpenTest = {
      releaseRead,
      releaseListener,
      listenerCount: () =>
        [...listeners.values()].filter((l) => l.event === "open-files").length,
      queue: (path: string) => pending.push(path),
      emit(paths: string[]) {
        for (const [id, { event, handler }] of listeners) {
          if (event === "open-files")
            callbacks.get(handler)?.({ event, id, payload: paths });
        }
      },
    };
  }, options);
}

async function openFromFinder(page: Page, path: string) {
  await page.evaluate((path) => {
    // biome-ignore lint/suspicious/noExplicitAny: browser-side test controls
    (window as any).__fileOpenTest.emit([path]);
  }, path);
}

test("Finder opens update the rendered document while the app is running", async ({
  page,
}) => {
  await installFiles(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();
  await openFromFinder(page, "/v/previous.md");
  await expect(page.getByRole("heading", { name: "Previous document" })).toBeVisible();
  await openFromFinder(page, "/v/requested.md");
  await expect(page.getByRole("heading", { name: "Requested document" })).toBeVisible();
  await expect(page.locator(".ProseMirror")).toContainText("New content.");
  await page.locator("[draggable=true]").filter({ hasText: "previous.md" }).click();
  await expect(page.getByRole("heading", { name: "Previous document" })).toBeVisible();
  await page.locator("[draggable=true]").filter({ hasText: "requested.md" }).click();
  await expect(page.getByRole("heading", { name: "Requested document" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: browser-side test controls
        return (window as any).__fileOpenTest.listenerCount();
      }),
    )
    .toBe(1);
});

test("slow session restore cannot steal focus from a file opened on launch", async ({
  page,
}) => {
  await installFiles(page, { restore: true, pending: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Requested document" })).toBeVisible();
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: browser-side test controls
    (window as any).__fileOpenTest.releaseRead();
  });
  // Wait until restoration actually finished before inspecting the active doc.
  await expect(
    page.locator("[draggable=true]").filter({ hasText: "previous.md" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Requested document" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("markup.session")!).active),
    )
    .toBe("/v/requested.md");
});

test("ordinary launch still restores the previous active document", async ({ page }) => {
  await installFiles(page, { restore: true });
  await page.goto("/");
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: browser-side test controls
    (window as any).__fileOpenTest.releaseRead();
  });
  await expect(page.getByRole("heading", { name: "Previous document" })).toBeVisible();
});

test("a live file open wins over an in-flight session restore", async ({ page }) => {
  await installFiles(page, { restore: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();
  await openFromFinder(page, "/v/requested.md");
  await expect(page.getByRole("heading", { name: "Requested document" })).toBeVisible();
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: browser-side test controls
    (window as any).__fileOpenTest.releaseRead();
  });
  await expect(
    page.locator("[draggable=true]").filter({ hasText: "previous.md" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Requested document" })).toBeVisible();
});

test("a file arriving while the native listener registers is not lost", async ({
  page,
}) => {
  await installFiles(page, { holdListener: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Markup" })).toBeVisible();
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: browser-side test controls
    const bridge = (window as any).__fileOpenTest;
    bridge.queue("/v/requested.md");
    bridge.emit(["/v/requested.md"]);
    bridge.releaseListener();
  });
  await expect(page.getByRole("heading", { name: "Requested document" })).toBeVisible();
});
