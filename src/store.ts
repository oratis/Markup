import { create } from "zustand";
import type { LoadedFile } from "./lib/types";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

interface AppState {
  file: LoadedFile | null;
  status: SaveStatus;
  errorMessage: string | null;
  setFile: (f: LoadedFile | null) => void;
  setStatus: (s: SaveStatus, errorMessage?: string | null) => void;
  setMtime: (m: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  file: null,
  status: "saved",
  errorMessage: null,
  setFile: (f) =>
    set({ file: f, status: "saved", errorMessage: null }),
  setStatus: (s, errorMessage = null) =>
    set({ status: s, errorMessage }),
  setMtime: (m) =>
    set((state) =>
      state.file ? { file: { ...state.file, mtime_ms: m } } : state,
    ),
}));
