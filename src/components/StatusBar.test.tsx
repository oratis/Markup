import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../store";
import { StatusBar } from "./StatusBar";

function setActive(content: string, opts: Partial<{ vault: string | null }> = {}) {
  useAppStore.setState({
    sourceMode: false,
    vaultRoot: opts.vault ?? null,
    tabs: [
      {
        id: "/x.md",
        path: "/x.md",
        name: "x.md",
        content,
        mtimeMs: 1,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: "/x.md",
  });
}

beforeEach(() => {
  useAppStore.setState({ sourceMode: false, vaultRoot: null });
});

describe("StatusBar word count", () => {
  it("counts plain English words by whitespace", () => {
    setActive("hello world from markup");
    render(<StatusBar />);
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("counts each CJK character as a word", () => {
    setActive("欢迎使用");
    render(<StatusBar />);
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("mixes CJK and English correctly", () => {
    setActive("hello 世界 markup");
    render(<StatusBar />);
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("reports 0 words for empty or whitespace-only content", () => {
    setActive("   \n\n   ");
    render(<StatusBar />);
    expect(screen.getByText("0 words")).toBeInTheDocument();
  });

  it('shows "WYSIWYG" when not in source mode and "Source" otherwise', () => {
    setActive("body");
    render(<StatusBar />);
    expect(screen.getByText("WYSIWYG")).toBeInTheDocument();
  });

  it("renders the vault root path when one is open", () => {
    setActive("body", { vault: "/Users/test/vault" });
    render(<StatusBar />);
    expect(screen.getByText("/Users/test/vault")).toBeInTheDocument();
  });
});
