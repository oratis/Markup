import Foundation

/// Result of an edit: the new text plus the selection to set (UTF-16 offsets,
/// matching `UITextView`'s `selectedRange`).
public struct TextEdit: Equatable, Sendable {
    public var text: String
    public var location: Int
    public var length: Int
    public init(text: String, location: Int, length: Int) {
        self.text = text
        self.location = location
        self.length = length
    }
}

/// What pressing Return on a list line should do.
public enum ListContinuation: Equatable, Sendable {
    case none            // not a list line — default newline
    case exit            // empty item — clear the marker
    case next(String)    // insert newline + this prefix
}

/// Pure text-editing operations for the source editor, working on UTF-16
/// offsets so they map directly onto `UITextView`. Ports the intent of the
/// desktop CodeMirror helpers (`insert-md`, `cm-list-continue`).
public enum MarkdownEdit {

    /// Wrap the selection with `open`/`close`. Empty selection → caret between.
    public static func wrap(
        _ text: String, location: Int, length: Int, open: String, close: String
    ) -> TextEdit {
        let ns = text as NSString
        let range = NSRange(location: location, length: length)
        let inner = ns.substring(with: range)
        let newText = ns.replacingCharacters(in: range, with: open + inner + close)
        let openLen = (open as NSString).length
        return TextEdit(
            text: newText, location: location + openLen,
            length: length == 0 ? 0 : (inner as NSString).length)
    }

    /// Replace the selection with `snippet`; caret lands `caretOffset` UTF-16
    /// units past the insertion point (default: end of the snippet).
    public static func insert(
        _ text: String, location: Int, length: Int, snippet: String, caretOffset: Int? = nil
    ) -> TextEdit {
        let ns = text as NSString
        let range = NSRange(location: location, length: length)
        let newText = ns.replacingCharacters(in: range, with: snippet)
        return TextEdit(
            text: newText, location: location + (caretOffset ?? (snippet as NSString).length),
            length: 0)
    }

    /// Toggle a line `prefix` (e.g. "# ", "> ", "- ", "- [ ] ") on the line
    /// containing `location`.
    public static func toggleLinePrefix(_ text: String, location: Int, prefix: String) -> TextEdit {
        let ns = text as NSString
        let lineRange = ns.lineRange(for: NSRange(location: min(location, ns.length), length: 0))
        let line = ns.substring(with: lineRange)
        let hasNewline = line.hasSuffix("\n")
        let content = hasNewline ? String(line.dropLast()) : line
        let prefixLen = (prefix as NSString).length

        let newContent: String
        let delta: Int
        if content.hasPrefix(prefix) {
            newContent = String(content.dropFirst(prefix.count))
            delta = -prefixLen
        } else {
            newContent = prefix + content
            delta = prefixLen
        }
        let newLine = hasNewline ? newContent + "\n" : newContent
        let newText = ns.replacingCharacters(in: lineRange, with: newLine)
        return TextEdit(
            text: newText, location: max(lineRange.location, location + delta), length: 0)
    }

    /// What to do when Return is pressed with the caret on `line`.
    public static func listContinuation(forLine line: String) -> ListContinuation {
        if let g = Rx.groups("^(\\s*)([-*+])\\s+\\[[ xX]\\]\\s+(.*)$", line) {
            return g[3].isEmpty ? .exit : .next("\(g[1])\(g[2]) [ ] ")
        }
        if let g = Rx.groups("^(\\s*)(\\d+)([.)])\\s+(.*)$", line) {
            if g[4].isEmpty { return .exit }
            let n = (Int(g[2]) ?? 1) + 1
            return .next("\(g[1])\(n)\(g[3]) ")
        }
        if let g = Rx.groups("^(\\s*)([-*+])\\s+(.*)$", line) {
            return g[3].isEmpty ? .exit : .next("\(g[1])\(g[2]) ")
        }
        return .none
    }

    /// The partial query typed inside an open `[[` ending at `caret` (a UTF-16
    /// offset), or `nil` when the caret isn't within a single-line, unclosed
    /// wikilink. Drives the inline `[[` autocomplete. E.g. `"road"` for
    /// `…see [[road|` and `""` right after `[[`.
    public static func wikilinkQuery(in text: String, caret: Int) -> String? {
        let ns = text as NSString
        guard caret >= 2, caret <= ns.length else { return nil }
        let open = ns.range(
            of: "[[", options: .backwards, range: NSRange(location: 0, length: caret))
        guard open.location != NSNotFound else { return nil }
        let after = open.location + open.length
        let between = ns.substring(with: NSRange(location: after, length: caret - after))
        if between.contains("]]") || between.contains("\n") || between.contains("[[") {
            return nil
        }
        return between
    }

    /// The auto-closing partner for an opening character, or `nil` if the
    /// character doesn't auto-close. Mirrors the desktop `cm-auto-close`
    /// pairs: `()`, `[]`, `{}`, and the symmetric `` ` ``.
    public static func autoClosePartner(for open: Character) -> Character? {
        switch open {
        case "(": return ")"
        case "[": return "]"
        case "{": return "}"
        case "`": return "`"
        default: return nil
        }
    }

    /// Pure model of typing an auto-closing character at a collapsed caret:
    /// inserts `open` + its partner and leaves the caret between them. Returns
    /// `nil` when `open` isn't an auto-closing character (caller inserts it
    /// normally). A non-empty selection should be handled by `wrap` instead.
    public static func autoClose(_ text: String, location: Int, open: Character) -> TextEdit? {
        guard let close = autoClosePartner(for: open) else { return nil }
        let ns = text as NSString
        let pair = String(open) + String(close)
        let newText = ns.replacingCharacters(
            in: NSRange(location: location, length: 0), with: pair)
        return TextEdit(text: newText, location: location + 1, length: 0)
    }
}

/// Pretty-printing for GFM pipe tables: pads every column to its widest cell
/// so the source stays readable. Pure and deterministic — used by the editor's
/// "format table" action. Ports the intent of the desktop `cm-table-format`.
public enum MarkdownTable {

    /// Is this a plausible GFM table (a header row, a `---|---` delimiter row,
    /// then zero+ body rows)? Cheap structural check, not a full parse.
    public static func looksLikeTable(_ text: String) -> Bool {
        let lines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        guard lines.count >= 2 else { return false }
        guard lines[0].contains("|") else { return false }
        return isDelimiterRow(lines[1])
    }

    private static func isDelimiterRow(_ line: String) -> Bool {
        let cells = splitCells(line)
        guard !cells.isEmpty else { return false }
        return cells.allSatisfy { cell in
            let t = cell.trimmingCharacters(in: .whitespaces)
            return !t.isEmpty && t.allSatisfy { $0 == "-" || $0 == ":" }
        }
    }

    /// Split a table row into trimmed cell strings, dropping the optional
    /// leading/trailing pipe.
    static func splitCells(_ line: String) -> [String] {
        var s = line.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("|") { s.removeFirst() }
        if s.hasSuffix("|") { s.removeLast() }
        return s.components(separatedBy: "|").map { $0.trimmingCharacters(in: .whitespaces) }
    }

    /// Re-align a table's columns. Each column is padded to the width of its
    /// widest cell; the delimiter row preserves `:` alignment markers. Leaves
    /// non-table input unchanged.
    public static func format(_ text: String) -> String {
        guard looksLikeTable(text) else { return text }
        let rawLines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        let trailingNewline = text.hasSuffix("\n")
        let lines = trailingNewline ? Array(rawLines.dropLast()) : rawLines

        var rows = lines.map { splitCells($0) }
        let cols = rows.map(\.count).max() ?? 0
        for i in rows.indices {
            while rows[i].count < cols { rows[i].append("") }
        }

        // Column widths from header + body (skip the delimiter row at index 1).
        var widths = [Int](repeating: 3, count: cols) // min 3 so "---" fits
        for (r, row) in rows.enumerated() where r != 1 {
            for c in 0..<cols {
                widths[c] = max(widths[c], row[c].count)
            }
        }

        func renderRow(_ row: [String]) -> String {
            let padded = (0..<cols).map { c -> String in
                let cell = row[c]
                return cell + String(repeating: " ", count: max(0, widths[c] - cell.count))
            }
            return "| " + padded.joined(separator: " | ") + " |"
        }

        func renderDelimiter(_ row: [String]) -> String {
            let padded = (0..<cols).map { c -> String in
                let marker = row[c]
                let left = marker.hasPrefix(":")
                let right = marker.hasSuffix(":")
                let dashes = max(3, widths[c]) - (left ? 1 : 0) - (right ? 1 : 0)
                return (left ? ":" : "") + String(repeating: "-", count: max(1, dashes))
                    + (right ? ":" : "")
            }
            return "| " + padded.joined(separator: " | ") + " |"
        }

        var out: [String] = []
        for (r, row) in rows.enumerated() {
            out.append(r == 1 ? renderDelimiter(row) : renderRow(row))
        }
        return out.joined(separator: "\n") + (trailingNewline ? "\n" : "")
    }
}
