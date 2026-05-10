import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../store";
import { FileTree } from "./FileTree";

beforeEach(() => {
  useAppStore.setState({
    vaultRoot: null,
    vaultFiles: [],
    tabs: [],
    activeTabId: null,
  });
});

describe("FileTree (state-driven branches)", () => {
  it('renders the "no vault" message when no vault is open', () => {
    render(<FileTree />);
    expect(screen.getByText(/no vault open/i)).toBeInTheDocument();
  });

  it('renders the "empty vault" message when a vault is open but has 0 files', () => {
    useAppStore.setState({ vaultRoot: "/v", vaultFiles: [] });
    render(<FileTree />);
    expect(screen.getByText(/empty vault/i)).toBeInTheDocument();
  });

  // Note: full row-rendering tests require a non-zero layout viewport that
  // jsdom can't provide for @tanstack/react-virtual. Covered by the
  // upcoming Playwright E2E layer.
});
