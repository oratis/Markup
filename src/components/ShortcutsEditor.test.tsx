import { render, screen } from "@testing-library/react";
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
});
