import { useEffect } from "react";
import {
  setVaultPaths as blockSetVaultPaths,
  setVaultRoot as blockSetVaultRoot,
} from "../lib/block-index-store";
import {
  setVaultPaths as headingSetVaultPaths,
  setVaultRoot as headingSetVaultRoot,
} from "../lib/heading-index-store";
import {
  setVaultPaths as indexSetVaultPaths,
  setVaultRoot as indexSetVaultRoot,
} from "../lib/link-index-store";
import {
  setVaultPaths as tagSetVaultPaths,
  setVaultRoot as tagSetVaultRoot,
} from "../lib/tag-index-store";

/**
 * Keeps the link / tag / heading / block index stores in sync with the
 * active vault. A root change restores each store's persisted cache
 * (instant); a file-list change reconciles stale targets. The full rebuild
 * that touches every file stays opt-in via the palette command — doing it on
 * vault-open would freeze large vaults.
 *
 * Behaviour-preserving extraction of the two index-sync effects from App.tsx.
 */
export function useIndexStoreSync(
  vaultRoot: string | null,
  vaultFiles: ReadonlyArray<{ path: string }>,
) {
  useEffect(() => {
    indexSetVaultRoot(vaultRoot);
    tagSetVaultRoot(vaultRoot);
    headingSetVaultRoot(vaultRoot);
    blockSetVaultRoot(vaultRoot);
  }, [vaultRoot]);

  useEffect(() => {
    const paths = vaultFiles.map((f) => f.path);
    indexSetVaultPaths(paths);
    tagSetVaultPaths(paths);
    headingSetVaultPaths(paths);
    blockSetVaultPaths(paths);
  }, [vaultFiles]);
}
