import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VaultFile } from "../store";
import { installHoverPreview } from "./hover-preview";

const vault: VaultFile[] = [
  {
    path: "/v/Target.md",
    name: "Target.md",
    relPath: "Target.md",
    mtimeMs: 0,
    size: 0,
  },
];

let host: HTMLElement;
let listeners = new Set<() => void>();
let readCalls: string[] = [];

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  listeners = new Set();
  readCalls = [];
});

afterEach(() => {
  document.body.removeChild(host);
  // strip any leftover tooltips
  document.querySelectorAll("[data-markup-hover-preview]").forEach((el) => {
    el.parentNode?.removeChild(el);
  });
});

function makeOpts(content = "hello world body") {
  return {
    getVaultFiles: () => vault,
    readFile: async (p: string) => {
      readCalls.push(p);
      return content;
    },
    subscribeInvalidate: (cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

function fireOver(target: HTMLElement) {
  const e = new MouseEvent("mouseover", { bubbles: true });
  Object.defineProperty(e, "target", { value: target });
  host.dispatchEvent(e);
}

function fireOut(target: HTMLElement) {
  const e = new MouseEvent("mouseout", { bubbles: true });
  Object.defineProperty(e, "target", { value: target });
  Object.defineProperty(e, "relatedTarget", { value: document.body });
  host.dispatchEvent(e);
}

describe("installHoverPreview", () => {
  it("shows a tooltip after dwell on .wikilink", async () => {
    vi.useFakeTimers();
    installHoverPreview(host, makeOpts());
    const link = document.createElement("span");
    link.className = "wikilink";
    link.setAttribute("data-wikilink-name", "Target");
    host.appendChild(link);

    fireOver(link);
    expect(document.querySelector("[data-markup-hover-preview]")).toBeNull();
    await vi.advanceTimersByTimeAsync(400);
    expect(document.querySelector("[data-markup-hover-preview]")).not.toBeNull();
    vi.useRealTimers();
  });

  it("hides the tooltip on mouseout", async () => {
    vi.useFakeTimers();
    installHoverPreview(host, makeOpts());
    const link = document.createElement("span");
    link.className = "wikilink";
    link.setAttribute("data-wikilink-name", "Target");
    host.appendChild(link);

    fireOver(link);
    await vi.advanceTimersByTimeAsync(400);
    expect(document.querySelector("[data-markup-hover-preview]")).not.toBeNull();
    fireOut(link);
    expect(document.querySelector("[data-markup-hover-preview]")).toBeNull();
    vi.useRealTimers();
  });

  it("does NOT fire the read when mouseout happens before dwell", async () => {
    vi.useFakeTimers();
    installHoverPreview(host, makeOpts());
    const link = document.createElement("span");
    link.className = "wikilink";
    link.setAttribute("data-wikilink-name", "Target");
    host.appendChild(link);

    fireOver(link);
    await vi.advanceTimersByTimeAsync(100); // shorter than DWELL_MS
    fireOut(link);
    await vi.advanceTimersByTimeAsync(500);
    expect(readCalls).toEqual([]);
    vi.useRealTimers();
  });

  it("caches content across repeated hovers on the same target", async () => {
    vi.useFakeTimers();
    installHoverPreview(host, makeOpts());
    const link = document.createElement("span");
    link.className = "wikilink";
    link.setAttribute("data-wikilink-name", "Target");
    host.appendChild(link);

    fireOver(link);
    await vi.advanceTimersByTimeAsync(400);
    fireOut(link);
    fireOver(link);
    await vi.advanceTimersByTimeAsync(400);
    expect(readCalls).toEqual(["/v/Target.md"]); // only one fetch
    vi.useRealTimers();
  });

  it("invalidates cache when the index changes", async () => {
    vi.useFakeTimers();
    installHoverPreview(host, makeOpts());
    const link = document.createElement("span");
    link.className = "wikilink";
    link.setAttribute("data-wikilink-name", "Target");
    host.appendChild(link);

    fireOver(link);
    await vi.advanceTimersByTimeAsync(400);
    fireOut(link);

    // Notify subscribers of an index change.
    for (const cb of listeners) cb();

    fireOver(link);
    await vi.advanceTimersByTimeAsync(400);
    expect(readCalls).toEqual(["/v/Target.md", "/v/Target.md"]); // refetched
    vi.useRealTimers();
  });

  it("uninstalls cleanly", async () => {
    vi.useFakeTimers();
    const { uninstall } = installHoverPreview(host, makeOpts());
    uninstall();
    const link = document.createElement("span");
    link.className = "wikilink";
    link.setAttribute("data-wikilink-name", "Target");
    host.appendChild(link);

    fireOver(link);
    await vi.advanceTimersByTimeAsync(400);
    expect(readCalls).toEqual([]);
    vi.useRealTimers();
  });
});
