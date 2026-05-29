import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type PersistedSettings, useSettingsPersistence } from "./useSettingsPersistence";

const base: PersistedSettings = {
  fontSize: 16,
  proseMaxWidth: 720,
  autosaveMs: 300,
  imagePasteDir: "assets",
  exportTheme: "default",
  spellcheck: true,
  lineWrap: true,
  sidebarWidth: 240,
  outlineWidth: 320,
  saveOnBlur: false,
  trimOnSave: true,
  showLineNumbers: false,
  wordCountGoal: 0,
  showToolbar: true,
  showTabBar: true,
  vaultSort: "name",
};

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("style");
});

describe("useSettingsPersistence", () => {
  it("writes typography to CSS custom properties", () => {
    renderHook(() =>
      useSettingsPersistence({ ...base, fontSize: 18, proseMaxWidth: 800 }),
    );
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--markup-font-size")).toBe("18px");
    expect(root.style.getPropertyValue("--markup-prose-max-width")).toBe("800px");
  });

  it("persists the full settings bag as JSON", () => {
    renderHook(() => useSettingsPersistence({ ...base, wordCountGoal: 500 }));
    const stored = JSON.parse(localStorage.getItem("markup.settings") ?? "{}");
    expect(stored.wordCountGoal).toBe(500);
    expect(stored.fontSize).toBe(16);
    expect(stored.vaultSort).toBe("name");
  });

  it("re-persists when a field changes", () => {
    const { rerender } = renderHook((s) => useSettingsPersistence(s), {
      initialProps: base,
    });
    expect(JSON.parse(localStorage.getItem("markup.settings") ?? "{}").fontSize).toBe(16);
    rerender({ ...base, fontSize: 22 });
    expect(JSON.parse(localStorage.getItem("markup.settings") ?? "{}").fontSize).toBe(22);
    expect(document.documentElement.style.getPropertyValue("--markup-font-size")).toBe(
      "22px",
    );
  });
});
