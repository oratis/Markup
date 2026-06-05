import Foundation

/// Pure ordering logic for the open-document tab strip (iPad multi-doc).
///
/// The app holds the ordered list of open document ids and a separate "active"
/// id (the sidebar selection). This enum owns only the fiddly bits worth
/// testing in isolation: insert-if-absent, and which tab to activate after one
/// is closed.
public enum TabList {
    /// Append `id` if it isn't already open; otherwise return the list
    /// unchanged (opening an already-open doc just re-activates it).
    public static func opening(_ id: String, into ids: [String]) -> [String] {
        ids.contains(id) ? ids : ids + [id]
    }

    /// The id to activate after `closing` is removed from `ids`: the tab to its
    /// right, else the tab to its left, else `nil` (last tab closed). `ids` is
    /// the list *before* removal.
    public static func neighborAfterClosing(_ closing: String, in ids: [String]) -> String? {
        guard let i = ids.firstIndex(of: closing) else {
            // Not open — active selection is unaffected; caller keeps it.
            return nil
        }
        if i + 1 < ids.count { return ids[i + 1] }
        if i - 1 >= 0 { return ids[i - 1] }
        return nil
    }
}
