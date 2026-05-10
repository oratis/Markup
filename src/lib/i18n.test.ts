import { beforeEach, describe, expect, it } from "vitest";
import { effective, getLocale, setLocale, t } from "./i18n";

beforeEach(() => {
  setLocale("en");
});

describe("i18n", () => {
  it("t() returns the en translation by default", () => {
    expect(t("status.saved")).toBe("Saved");
  });

  it("t() returns the zh translation when locale switches", () => {
    setLocale("zh");
    expect(t("status.saved")).toBe("已保存");
  });

  it("t() interpolates positional args", () => {
    setLocale("en");
    expect(t("status.words", 42)).toBe("42 words");
    expect(t("status.error", "ENOENT")).toBe("Error: ENOENT");
  });

  it("getLocale reflects the currently active value", () => {
    setLocale("zh");
    expect(getLocale()).toBe("zh");
    setLocale("en");
    expect(getLocale()).toBe("en");
  });

  it("effective resolves auto via the test environment's navigator.language", () => {
    setLocale("auto");
    const eff = effective();
    expect(eff === "en" || eff === "zh").toBe(true);
  });
});
