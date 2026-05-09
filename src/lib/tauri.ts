import { invoke } from "@tauri-apps/api/core";
import type { LoadedFile } from "./types";

export async function openFileDialog(): Promise<LoadedFile | null> {
  return await invoke<LoadedFile | null>("open_file");
}

export async function readFile(path: string): Promise<LoadedFile> {
  return await invoke<LoadedFile>("read_file", { path });
}

export async function writeFile(
  path: string,
  content: string,
  expectedMtimeMs: number | null,
): Promise<number> {
  return await invoke<number>("write_file", {
    path,
    content,
    expectedMtimeMs,
  });
}
