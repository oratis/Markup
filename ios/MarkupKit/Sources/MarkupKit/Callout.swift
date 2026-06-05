import Foundation

/// GitHub-style alert / callout blocks (`> [!NOTE]`, `> [!WARNING]`, …).
///
/// The reader renders these client-side by post-processing `marked`'s
/// `<blockquote>` output into `<div class="markdown-alert …">`, matching the
/// markup the desktop export produces via comrak's `alerts` extension — so a
/// single `.markdown-alert-*` stylesheet styles both platforms.
///
/// This type is the single source of truth for the recognised types and their
/// default titles; `ReaderHTML` injects them into the reader's transform.
public enum Callout {
    /// Recognised alert types (lowercased) → default title. Order and keys
    /// match comrak's `AlertType` and the shared `.markdown-alert-*` CSS.
    public static let titles: [(type: String, title: String)] = [
        ("note", "Note"),
        ("tip", "Tip"),
        ("important", "Important"),
        ("warning", "Warning"),
        ("caution", "Caution"),
    ]

    /// The default title for a recognised type, or `nil` if unknown.
    public static func defaultTitle(for type: String) -> String? {
        titles.first { $0.type == type.lowercased() }?.title
    }

    /// Detect a `[!TYPE]` marker at the start of a blockquote's first line.
    ///
    /// Returns the lowercased type (only when it's one of `titles`) plus any
    /// inline custom title on the same line (Obsidian-style
    /// `> [!note] Custom title`). Returns `nil` for a plain blockquote or an
    /// unrecognised type.
    public static func parseMarker(_ firstLine: String) -> (type: String, title: String?)? {
        let pattern = "^\\s*\\[!(\\w+)\\]([^\\n]*)"
        guard let re = try? NSRegularExpression(pattern: pattern),
              let m = re.firstMatch(
                  in: firstLine, range: NSRange(firstLine.startIndex..., in: firstLine)),
              let typeR = Range(m.range(at: 1), in: firstLine)
        else { return nil }

        let type = firstLine[typeR].lowercased()
        guard titles.contains(where: { $0.type == type }) else { return nil }

        var title: String?
        if let titleR = Range(m.range(at: 2), in: firstLine) {
            let t = firstLine[titleR].trimmingCharacters(in: .whitespaces)
            if !t.isEmpty { title = t }
        }
        return (type, title)
    }
}
