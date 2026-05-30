import Foundation

/// Slugify a heading-ish string for use as a filesystem name. Strips leading
/// `#`s, trims, caps at `max` chars, replaces filesystem-unsafe characters
/// with `-`. Returns an empty string when the input is blank.
///
/// Faithful port of `src/lib/slugify.ts`.
public func slugifyForFilename(_ input: String, max: Int = 80) -> String {
    var s = input.replacingOccurrences(
        of: "^#+\\s+", with: "", options: .regularExpression)
    s = s.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.count > max { s = String(s.prefix(max)) }
    let unsafe: Set<Character> = ["/", "\\", ":", "*", "?", "\"", "<", ">", "|"]
    return String(s.map { unsafe.contains($0) ? "-" : $0 })
}

/// Extract the text of the first H1 (`# Foo`) from a markdown string, or `nil`
/// when none is present in the first 200 lines. Only a single `#` followed by
/// whitespace counts as an H1.
public func firstHeadingText(_ md: String) -> String? {
    for line in md.components(separatedBy: "\n").prefix(200) {
        if line.range(of: "^#\\s+\\S", options: .regularExpression) != nil {
            return line.replacingOccurrences(
                of: "^#\\s+", with: "", options: .regularExpression)
        }
    }
    return nil
}
