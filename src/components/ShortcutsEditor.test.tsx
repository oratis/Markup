import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { defaults, labels, resetAll, setShortcut } from "../lib/shortcuts";
import { ShortcutsEditor } from "./ShortcutsEditor";

afterEach(() => resetAll());

describe("ShortcutsEditor", () => {
  it("renders a row for every registered shortcut id", () => {
    render(<ShortcutsEditor />);
    for (const id of Object.keys(defaults) as Array<keyof typeof defaults>) {
      expect(screen.getByText(labels[id])).toBeInTheDocument();
    }
  });

  it("filter input narrows the list to matching labels", () => {
    render(<ShortcutsEditor />);
    fireEvent.change(screen.getByPlaceholderText(/filter shortcuts/i), {
      target: { value: "bold" },
    });
    expect(screen.getByText(labels.fmtBold)).toBeInTheDocument();
    expect(screen.queryByText(labels.save)).toBeNull();
  });

  it("shows no-match hint when the filter excludes everything", () => {
    render(<ShortcutsEditor />);
    fireEvent.change(screen.getByPlaceholderText(/filter shortcuts/i), {
      target: { value: "zzzzzzzz" },
    });
    expect(screen.getByText(/no matching shortcuts/i)).toBeInTheDocument();
  });

  it("flags duplicate bindings with a ⚠ glyph on each conflicting row", () => {
    // Bind two different commands to the same key.
    setShortcut("save", "Mod+Q");
    setShortcut("saveAs", "Mod+Q");
    render(<ShortcutsEditor />);
    // Both rows show the warning glyph.
    expect(screen.getAllByText("⚠").length).toBeGreaterThanOrEqual(2);
  });
});
