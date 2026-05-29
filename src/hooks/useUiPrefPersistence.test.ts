import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Theme } from "../store";
import { useUiPrefPersistence } from "./useUiPrefPersistence";

const base = {
  theme: "light" as Theme,
  sourceMode: false,
  sidebarOpen: false,
  outlineOpen: false,
  focusMode: false,
  typewriterMode: false,
  recentFiles: [] as string[],
  recentVaults: [] as string[],
};

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

describe("useUiPrefPersistence", () => {
  it("persists every preference to localStorage", () => {
    renderHook(() =>
      useUiPrefPersistence({
        ...base,
        theme: "dark",
        sourceMode: true,
        sidebarOpen: true,
        outlineOpen: true,
        focusMode: true,
        typewriterMode: true,
        recentFiles: ["/a.md"],
        recentVaults: ["/vault"],
      }),
    );
    expect(localStorage.getItem("markup.theme")).toBe("dark");
    expect(localStorage.getItem("markup.sourceMode")).toBe("true");
    expect(localStorage.getItem("markup.sidebar")).toBe("true");
    expect(localStorage.getItem("markup.outline")).toBe("true");
    expect(localStorage.getItem("markup.focus")).toBe("true");
    expect(localStorage.getItem("markup.typewriter")).toBe("true");
    expect(JSON.parse(localStorage.getItem("markup.recentFiles") ?? "[]")).toEqual([
      "/a.md",
    ]);
    expect(JSON.parse(localStorage.getItem("markup.recentVaults") ?? "[]")).toEqual([
      "/vault",
    ]);
  });

  it("reflects theme and view-mode classes onto the document root", () => {
    renderHook(() =>
      useUiPrefPersistence({
        ...base,
        theme: "dark",
        focusMode: true,
        typewriterMode: true,
      }),
    );
    const cls = document.documentElement.classList;
    expect(cls.contains("theme-dark")).toBe(true);
    expect(cls.contains("dark")).toBe(true);
    expect(cls.contains("focus-mode")).toBe(true);
    expect(cls.contains("typewriter-mode")).toBe(true);
  });

  it("updates persisted theme when it changes", () => {
    const { rerender } = renderHook((prefs) => useUiPrefPersistence(prefs), {
      initialProps: { ...base, theme: "light" as Theme },
    });
    expect(localStorage.getItem("markup.theme")).toBe("light");
    rerender({ ...base, theme: "sepia" as Theme });
    expect(localStorage.getItem("markup.theme")).toBe("sepia");
    expect(document.documentElement.classList.contains("theme-sepia")).toBe(true);
  });
});
