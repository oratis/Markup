import Foundation

/// Small NSRegularExpression helpers shared by the parsing modules.
enum Rx {
    /// Capture groups of the first match (index 0 = whole match), or nil.
    static func groups(
        _ pattern: String, _ s: String, _ options: NSRegularExpression.Options = []
    ) -> [String]? {
        guard let re = try? NSRegularExpression(pattern: pattern, options: options) else { return nil }
        let ns = s as NSString
        guard let m = re.firstMatch(in: s, range: NSRange(location: 0, length: ns.length))
        else { return nil }
        return ranges(m, ns)
    }

    /// Capture groups for every (non-overlapping) match.
    static func allGroups(
        _ pattern: String, _ s: String, _ options: NSRegularExpression.Options = []
    ) -> [[String]] {
        guard let re = try? NSRegularExpression(pattern: pattern, options: options) else { return [] }
        let ns = s as NSString
        return re.matches(in: s, range: NSRange(location: 0, length: ns.length))
            .map { ranges($0, ns) }
    }

    /// True when the whole string matches / contains the pattern.
    static func matches(
        _ pattern: String, _ s: String, _ options: NSRegularExpression.Options = []
    ) -> Bool {
        guard let re = try? NSRegularExpression(pattern: pattern, options: options) else { return false }
        let ns = s as NSString
        return re.firstMatch(in: s, range: NSRange(location: 0, length: ns.length)) != nil
    }

    private static func ranges(_ m: NSTextCheckingResult, _ ns: NSString) -> [String] {
        (0..<m.numberOfRanges).map { i in
            let r = m.range(at: i)
            return r.location == NSNotFound ? "" : ns.substring(with: r)
        }
    }
}
