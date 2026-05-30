import Foundation

/// The result of splitting a search query into operators + free text.
/// Mirrors the desktop `ParsedQuery` from `src/lib/search-operators.ts`.
public struct ParsedQuery: Equatable, Sendable {
    /// Tag values (without a leading `#`). Empty when no `tag:` operator.
    public var tags: [String]
    /// Path substrings. Empty when no `path:` operator.
    public var paths: [String]
    /// Free-text remainder; everything outside operators. May be empty.
    public var text: String

    public init(tags: [String], paths: [String], text: String) {
        self.tags = tags
        self.paths = paths
        self.text = text
    }
}

private let operatorRegex = try! NSRegularExpression(
    pattern: "\\b(tag|path):(\\S+)", options: [.caseInsensitive])

/// Parse `tag:` / `path:` operators and the free-text remainder out of a query.
///
///   `tag:#foo`            — files carrying the #foo tag (literal `#` optional)
///   `path:journal/`       — paths whose vault-relative form contains the substring
///   anything else         — added to the free-text query
///
/// Faithful port of `parseQuery` in `src/lib/search-operators.ts`.
public func parseQuery(_ raw: String) -> ParsedQuery {
    if raw.isEmpty { return ParsedQuery(tags: [], paths: [], text: "") }

    var tags: [String] = []
    var paths: [String] = []
    let ns = raw as NSString
    let fullRange = NSRange(location: 0, length: ns.length)

    for m in operatorRegex.matches(in: raw, range: fullRange) {
        let kind = ns.substring(with: m.range(at: 1)).lowercased()
        let value = ns.substring(with: m.range(at: 2))
        if kind == "tag" {
            tags.append(value.hasPrefix("#") ? String(value.dropFirst()) : value)
        } else if kind == "path" {
            paths.append(value)
        }
    }

    var text = operatorRegex.stringByReplacingMatches(
        in: raw, range: fullRange, withTemplate: "")
    text = text.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
    text = text.trimmingCharacters(in: .whitespacesAndNewlines)

    return ParsedQuery(tags: tags, paths: paths, text: text)
}

/// True when `path` matches every `path:` operator substring (case-insensitive).
/// Returns true when there are no path operators.
public func pathMatches(_ path: String, _ pathOps: [String]) -> Bool {
    if pathOps.isEmpty { return true }
    let lower = path.lowercased()
    return pathOps.allSatisfy { lower.contains($0.lowercased()) }
}
