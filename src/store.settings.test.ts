import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, useAppStore } from "./store";

beforeEach(() => {
  useAppStore.setState({
    fontSize: DEFAULT_SETTINGS.fontSize,
    proseMaxWidth: DEFAULT_SETTINGS.proseMaxWidth,
    autosaveMs: DEFAULT_SETTINGS.autosaveMs,
    imagePasteDir: DEFAULT_SETTINGS.imagePasteDir,
  });
});

describe("settings", () => {
  it("clamps font size to [11, 24]", () => {
    useAppStore.getState().setSettings({ fontSize: 5 });
    expect(useAppStore.getState().fontSize).toBe(11);
    useAppStore.getState().setSettings({ fontSize: 99 });
    expect(useAppStore.getState().fontSize).toBe(24);
  });

  it("clamps prose width to [480, 1200]", () => {
    useAppStore.getState().setSettings({ proseMaxWidth: 100 });
    expect(useAppStore.getState().proseMaxWidth).toBe(480);
    useAppStore.getState().setSettings({ proseMaxWidth: 5000 });
    expect(useAppStore.getState().proseMaxWidth).toBe(1200);
  });

  it("treats autosaveMs=0 as 'autosave disabled' (allowed)", () => {
    useAppStore.getState().setSettings({ autosaveMs: 0 });
    expect(useAppStore.getState().autosaveMs).toBe(0);
  });

  it("clamps autosaveMs to <=5000", () => {
    useAppStore.getState().setSettings({ autosaveMs: 999_999 });
    expect(useAppStore.getState().autosaveMs).toBe(5000);
  });

  it("falls back to 'assets' when imagePasteDir is blank", () => {
    useAppStore.getState().setSettings({ imagePasteDir: "  " });
    expect(useAppStore.getState().imagePasteDir).toBe("assets");
  });

  it("preserves unrelated fields when patching one", () => {
    useAppStore.getState().setSettings({ fontSize: 18 });
    const s = useAppStore.getState();
    expect(s.fontSize).toBe(18);
    expect(s.proseMaxWidth).toBe(DEFAULT_SETTINGS.proseMaxWidth);
    expect(s.autosaveMs).toBe(DEFAULT_SETTINGS.autosaveMs);
  });

  it("rejects NaN by clamping to lower bound", () => {
    useAppStore.getState().setSettings({ fontSize: Number.NaN });
    expect(useAppStore.getState().fontSize).toBe(11);
  });

  it("clamps sidebar / outline widths to [160, 600]", () => {
    useAppStore.getState().setSettings({ sidebarWidth: 50, outlineWidth: 9999 });
    const s = useAppStore.getState();
    expect(s.sidebarWidth).toBe(160);
    expect(s.outlineWidth).toBe(600);
  });

  it("toggles saveOnBlur boolean", () => {
    useAppStore.getState().setSettings({ saveOnBlur: true });
    expect(useAppStore.getState().saveOnBlur).toBe(true);
    useAppStore.getState().setSettings({ saveOnBlur: false });
    expect(useAppStore.getState().saveOnBlur).toBe(false);
  });

  it("toggles trimOnSave boolean", () => {
    useAppStore.getState().setSettings({ trimOnSave: true });
    expect(useAppStore.getState().trimOnSave).toBe(true);
    useAppStore.getState().setSettings({ trimOnSave: false });
    expect(useAppStore.getState().trimOnSave).toBe(false);
  });

  it("toggles showLineNumbers boolean", () => {
    useAppStore.getState().setSettings({ showLineNumbers: false });
    expect(useAppStore.getState().showLineNumbers).toBe(false);
    useAppStore.getState().setSettings({ showLineNumbers: true });
    expect(useAppStore.getState().showLineNumbers).toBe(true);
  });

  it("toggles showToolbar boolean", () => {
    useAppStore.getState().setSettings({ showToolbar: false });
    expect(useAppStore.getState().showToolbar).toBe(false);
    useAppStore.getState().setSettings({ showToolbar: true });
    expect(useAppStore.getState().showToolbar).toBe(true);
  });

  it("toggles showTabBar boolean", () => {
    useAppStore.getState().setSettings({ showTabBar: false });
    expect(useAppStore.getState().showTabBar).toBe(false);
    useAppStore.getState().setSettings({ showTabBar: true });
    expect(useAppStore.getState().showTabBar).toBe(true);
  });

  it("round-trips vaultSort 'name' / 'mtime'", () => {
    useAppStore.getState().setSettings({ vaultSort: "mtime" });
    expect(useAppStore.getState().vaultSort).toBe("mtime");
    useAppStore.getState().setSettings({ vaultSort: "name" });
    expect(useAppStore.getState().vaultSort).toBe("name");
  });

  it("clamps wordCountGoal to [0, 100000]", () => {
    useAppStore.getState().setSettings({ wordCountGoal: -50 });
    expect(useAppStore.getState().wordCountGoal).toBe(0);
    useAppStore.getState().setSettings({ wordCountGoal: 9_999_999 });
    expect(useAppStore.getState().wordCountGoal).toBe(100_000);
    useAppStore.getState().setSettings({ wordCountGoal: 500 });
    expect(useAppStore.getState().wordCountGoal).toBe(500);
  });
});
