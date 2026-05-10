import { describe, expect, it } from "vitest";
import { nextTheme } from "./system-theme";

describe("nextTheme", () => {
  it("light → dark → sepia → auto → light (wrap)", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("sepia");
    expect(nextTheme("sepia")).toBe("auto");
    expect(nextTheme("auto")).toBe("light");
  });
});
