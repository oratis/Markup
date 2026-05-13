/**
 * Resolve a canvas file-node's vault-relative `file` field to an
 * absolute disk path so readFile can load it. Kept separate from the
 * file-node component so the path logic is independently testable.
 *
 * Obsidian's `.canvas` files store paths as vault-relative without a
 * leading slash (e.g. "Notes/Foo.md"). The vault root is whatever the
 * app store currently has as vaultRoot.
 */

/** Join a vault root and a vault-relative path. Per the Obsidian
 *  Canvas spec, `node.file` is always written as a vault-relative
 *  forward-slash path, so we treat the path as relative even if it
 *  has a leading slash (which would be a stray byte). Drive-letter
 *  paths are still passed through unchanged for Windows ports.
 *  Returns null when there's nothing to resolve. */
export function resolveVaultPath(
  vaultRoot: string | null | undefined,
  relPath: string | null | undefined,
): string | null {
  if (!relPath) return null;
  // Windows drive-letter paths fall through verbatim — those aren't
  // vault-relative by any reasonable interpretation.
  if (/^[A-Za-z]:[\\/]/.test(relPath)) return relPath;
  if (!vaultRoot) {
    // No vault to anchor against. Pass through absolute POSIX paths
    // but reject bare relative paths since we can't form a useful one.
    return relPath.startsWith("/") ? relPath : null;
  }
  const trimmedRoot = vaultRoot.replace(/[\\/]+$/, "");
  const trimmedRel = relPath.replace(/^[\\/]+/, "");
  return `${trimmedRoot}/${trimmedRel}`;
}
