import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("../lib/tauri", () => ({
  githubVaultStatus: vi.fn(),
  githubProposeChanges: vi.fn(),
}));

import { githubProposeChanges, githubVaultStatus } from "../lib/tauri";
import { ProposeChangesDialog } from "./ProposeChangesDialog";

beforeEach(() => {
  vi.mocked(githubVaultStatus).mockReset();
  vi.mocked(githubProposeChanges).mockReset();
});

describe("ProposeChangesDialog", () => {
  it("shows the empty state when there are no local changes", async () => {
    vi.mocked(githubVaultStatus).mockResolvedValue([]);
    render(<ProposeChangesDialog vaultDir="/v" label="o/r@main" onClose={() => {}} />);
    expect(await screen.findByText("No local changes.")).toBeInTheDocument();
  });

  it("lists changed files and proposes the selected ones as a PR", async () => {
    vi.mocked(githubVaultStatus).mockResolvedValue([
      { path: "docs/a.md", state: "modified" },
      { path: "new.md", state: "added" },
    ]);
    vi.mocked(githubProposeChanges).mockResolvedValue({
      prUrl: "https://github.com/o/r/pull/7",
      branch: "markup/fix",
    });

    render(<ProposeChangesDialog vaultDir="/v" label="o/r@main" onClose={() => {}} />);

    // Files appear with their state badges.
    expect(await screen.findByText("docs/a.md")).toBeInTheDocument();
    expect(screen.getByText("new.md")).toBeInTheDocument();

    // Title is required for submit.
    fireEvent.change(screen.getByPlaceholderText("Pull request title"), {
      target: { value: "Fix docs" },
    });
    fireEvent.click(screen.getByText("Create pull request"));

    await waitFor(() =>
      expect(screen.getByText("https://github.com/o/r/pull/7")).toBeInTheDocument(),
    );
    expect(githubProposeChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        vaultDir: "/v",
        paths: ["docs/a.md", "new.md"],
        prTitle: "Fix docs",
        message: "Fix docs", // defaults to the title
      }),
    );
  });

  it("surfaces a backend error instead of a PR link", async () => {
    vi.mocked(githubVaultStatus).mockResolvedValue([{ path: "a.md", state: "modified" }]);
    vi.mocked(githubProposeChanges).mockRejectedValue(
      "You don't have push access to o/r.",
    );

    render(<ProposeChangesDialog vaultDir="/v" label="o/r@main" onClose={() => {}} />);
    fireEvent.change(await screen.findByPlaceholderText("Pull request title"), {
      target: { value: "T" },
    });
    fireEvent.click(screen.getByText("Create pull request"));

    expect(await screen.findByText(/don't have push access/)).toBeInTheDocument();
  });
});
