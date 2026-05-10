import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defaults, labels } from "../lib/shortcuts";
import { ShortcutsEditor } from "./ShortcutsEditor";

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
});
