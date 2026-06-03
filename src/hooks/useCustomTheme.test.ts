import { afterEach, describe, expect, it } from "vitest";
import { CUSTOM_CSS_STYLE_ID, applyCustomCss } from "./useCustomTheme";

function styleEl() {
  return document.getElementById(CUSTOM_CSS_STYLE_ID);
}

describe("applyCustomCss", () => {
  afterEach(() => {
    styleEl()?.remove();
  });

  it("injects a <style> with the CSS when non-empty", () => {
    applyCustomCss(".milkdown .editor h1 { color: teal; }");
    const el = styleEl();
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe("STYLE");
    expect(el?.textContent).toContain("color: teal");
  });

  it("reuses the single element and updates its content", () => {
    applyCustomCss("a { color: red; }");
    const first = styleEl();
    applyCustomCss("a { color: blue; }");
    const second = styleEl();
    expect(second).toBe(first); // same node, not a duplicate
    expect(document.querySelectorAll(`#${CUSTOM_CSS_STYLE_ID}`).length).toBe(1);
    expect(second?.textContent).toContain("blue");
  });

  it("removes the element when the CSS is empty or whitespace", () => {
    applyCustomCss("a { color: red; }");
    expect(styleEl()).not.toBeNull();
    applyCustomCss("   ");
    expect(styleEl()).toBeNull();
  });

  it("does nothing (no element) when starting empty", () => {
    applyCustomCss("");
    expect(styleEl()).toBeNull();
  });
});
