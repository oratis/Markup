import MarkupKit
import Observation

/// Holds the ordered set of open documents for the iPad tab strip. The *active*
/// tab is the app's existing `selection` (the sidebar binding) — this store
/// only owns ordering + open/close, delegating the fiddly bits to
/// `MarkupKit.TabList` (unit-tested).
@MainActor
@Observable
final class OpenTabsStore {
    /// Open documents, left-to-right. `VaultFile` is `Equatable` on its
    /// relative path, so this de-dupes by file identity.
    private(set) var files: [VaultFile] = []

    var isEmpty: Bool { files.isEmpty }
    var count: Int { files.count }

    private func ids() -> [String] { files.map(\.relPath) }

    /// Open `file` (no-op if already open). Returns nothing — the caller sets
    /// `selection` to activate it.
    func open(_ file: VaultFile) {
        guard !files.contains(file) else { return }
        files.append(file)
    }

    /// Close `file`; returns the file that should become active afterwards
    /// (right neighbour, else left, else nil), or `nil` if `file` wasn't the
    /// active one (caller keeps its current selection).
    func close(_ file: VaultFile) -> VaultFile? {
        let neighborID = TabList.neighborAfterClosing(file.relPath, in: ids())
        files.removeAll { $0 == file }
        return neighborID.flatMap { id in files.first { $0.relPath == id } }
    }

    /// Replace a file in place (e.g. after a rename) so its tab keeps position.
    func replace(_ old: VaultFile, with new: VaultFile) {
        guard let i = files.firstIndex(of: old) else { return }
        files[i] = new
    }

    func closeAll() { files.removeAll() }

    /// Drop any tabs whose file no longer exists in `present` (e.g. after a
    /// vault rescan / external deletion).
    func prune(keeping present: [VaultFile]) {
        let live = Set(present.map(\.relPath))
        files.removeAll { !live.contains($0.relPath) }
    }
}
