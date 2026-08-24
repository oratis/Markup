import { beforeEach, describe, expect, it } from "vitest";
import {
  currentBindings,
  defaults,
  eventToShortcut,
  getShortcut,
  matches,
  resetAll,
  setShortcut,
} from "./shortcuts";

beforeEach(() => {
  resetAll();
});

function ke(opts: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent("keydown", opts);
}

describe("eventToShortcut", () => {
  it("emits Mod+Letter for ⌘ + key", () => {
    expect(eventToShortcut(ke({ key: "s", metaKey: true }))).toBe("Mod+S");
    expect(eventToShortcut(ke({ key: "s", ctrlKey: true }))).toBe("Mod+S");
  });

  it("includes Shift / Alt when held", () => {
    expect(eventToShortcut(ke({ key: "P", metaKey: true, shiftKey: true }))).toBe(
      "Mod+Shift+P",
    );
    expect(eventToShortcut(ke({ key: "f", metaKey: true, altKey: true }))).toBe(
      "Mod+Alt+F",
    );
  });

  it("returns null for plain non-modifier keys", () => {
    expect(eventToShortcut(ke({ key: "a" }))).toBeNull();
  });

  it("returns null when only a modifier is pressed", () => {
    expect(eventToShortcut(ke({ key: "Meta", metaKey: true }))).toBeNull();
    expect(eventToShortcut(ke({ key: "Shift", shiftKey: true }))).toBeNull();
  });

  it("preserves punctuation like / and ,", () => {
    expect(eventToShortcut(ke({ key: "/", metaKey: true }))).toBe("Mod+/");
    expect(eventToShortcut(ke({ key: ",", metaKey: true }))).toBe("Mod+,");
  });

  it("names the physical key when macOS composes an Alt combo", () => {
    // ⌥W arrives as "∑", ⌥] as "‘", ⌥T as "†" — the physical key still says
    // which key it was.
    expect(
      eventToShortcut(ke({ key: "∑", code: "KeyW", metaKey: true, altKey: true })),
    ).toBe("Mod+Alt+W");
    expect(
      eventToShortcut(
        ke({ key: "‘", code: "BracketRight", metaKey: true, altKey: true }),
      ),
    ).toBe("Mod+Alt+]");
    expect(
      eventToShortcut(ke({ key: "†", code: "KeyT", metaKey: true, altKey: true })),
    ).toBe("Mod+Alt+T");
    expect(
      eventToShortcut(
        ke({ key: "Ω", code: "KeyZ", metaKey: true, shiftKey: true, altKey: true }),
      ),
    ).toBe("Mod+Shift+Alt+Z");
  });

  it("names the physical key when an Alt combo is a dead key", () => {
    expect(
      eventToShortcut(ke({ key: "Dead", code: "KeyE", metaKey: true, altKey: true })),
    ).toBe("Mod+Alt+E");
  });

  it("leaves ASCII Alt combos alone so AltGr layouts keep typing", () => {
    // Ctrl+Alt+Q is "@" on a German layout; the typed character must win.
    expect(
      eventToShortcut(ke({ key: "@", code: "KeyQ", ctrlKey: true, altKey: true })),
    ).toBe("Mod+Alt+@");
  });

  it("matches a composed ⌘⌥W against the Close Other Tabs default", () => {
    expect(
      matches(
        ke({ key: "∑", code: "KeyW", metaKey: true, altKey: true }),
        "closeOtherTabs",
      ),
    ).toBe(true);
    expect(
      matches(
        ke({ key: "w", code: "KeyW", metaKey: true, altKey: true }),
        "closeOtherTabs",
      ),
    ).toBe(true);
  });
});

describe("override + matches", () => {
  it("getShortcut returns the default before any override", () => {
    expect(getShortcut("save")).toBe(defaults.save);
  });

  it("setShortcut overrides the default and reflects in currentBindings", () => {
    setShortcut("save", "Mod+Alt+S");
    expect(getShortcut("save")).toBe("Mod+Alt+S");
    expect(currentBindings().save).toBe("Mod+Alt+S");
  });

  it("setShortcut(null) reverts to the default", () => {
    setShortcut("save", "Mod+Alt+S");
    setShortcut("save", null);
    expect(getShortcut("save")).toBe(defaults.save);
  });

  it("setShortcut to the default value also reverts (no stale override)", () => {
    setShortcut("save", "Mod+Alt+S");
    setShortcut("save", defaults.save);
    expect(getShortcut("save")).toBe(defaults.save);
  });

  it("matches() honours overrides", () => {
    setShortcut("save", "Mod+Alt+S");
    expect(matches(ke({ key: "s", metaKey: true }), "save")).toBe(false);
    expect(matches(ke({ key: "s", metaKey: true, altKey: true }), "save")).toBe(true);
  });

  it("currentBindings is referentially stable when nothing changed (snapshot cache)", () => {
    const a = currentBindings();
    const b = currentBindings();
    expect(a).toBe(b);
  });

  it("currentBindings returns a NEW object after a setShortcut", () => {
    const a = currentBindings();
    setShortcut("save", "Mod+Alt+S");
    const b = currentBindings();
    expect(a).not.toBe(b);
    expect(b.save).toBe("Mod+Alt+S");
  });
});
