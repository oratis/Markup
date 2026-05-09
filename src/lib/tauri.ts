import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { LoadedFile, VaultOpened, VaultFile, SearchHit } from "./types";

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

export async function pickVault(): Promise<string | null> {
  return await invoke<string | null>("pick_vault");
}

export async function openVault(path: string): Promise<VaultOpened> {
  return await invoke<VaultOpened>("open_vault", { path });
}

export async function closeVault(): Promise<void> {
  await invoke("close_vault");
}

export async function listVaultFiles(): Promise<VaultFile[]> {
  return await invoke<VaultFile[]>("list_vault_files");
}

export async function currentVault(): Promise<string | null> {
  return await invoke<string | null>("current_vault");
}

export async function searchVault(
  query: string,
  limit = 50,
): Promise<SearchHit[]> {
  return await invoke<SearchHit[]>("search_vault", { query, limit });
}

export async function listenMenu(
  cb: (id: string) => void,
): Promise<UnlistenFn> {
  return await listen<string>("menu-event", (e) => cb(e.payload));
}

export async function listenVaultChanged(
  cb: () => void,
): Promise<UnlistenFn> {
  return await listen<void>("vault-changed", () => cb());
}
