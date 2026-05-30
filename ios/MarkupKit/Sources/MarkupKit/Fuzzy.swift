import Foundation

/// Greedy in-order subsequence match. Returns a score, or `-.infinity` if
/// `needle` is not a subsequence of `haystack`. Both inputs should already be
/// normalised to the same case — this does not lowercase for you.
///
/// Scoring (faithful port of the desktop `src/lib/fuzzy.ts`):
///  - +1 per matched character
///  - +3 (instead of +1) for a character adjacent to the previous match
///    (consecutive-run reward)
///  - +2 when matching at the start of the string or right after a
///    `/ _ - .` or space (word-boundary bonus)
///  - −0.01 × haystack length, so shorter paths win ties
///
/// Used to rank vault files in Quick Open.
public func scoreSubsequence(_ haystack: String, _ needle: String) -> Double {
    let hChars = Array(haystack)
    let nChars = Array(needle)
    let boundaries: Set<Character> = ["/", "_", "-", ".", " "]

    var score = 0.0
    var h = 0
    var lastMatchH = -1

    for n in 0..<nChars.count {
        while h < hChars.count && hChars[h] != nChars[n] { h += 1 }
        if h >= hChars.count { return -.infinity }
        score += (lastMatchH == h - 1) ? 3 : 1
        if h == 0 || boundaries.contains(hChars[h - 1]) { score += 2 }
        lastMatchH = h
        h += 1
    }

    score -= Double(hChars.count) * 0.01
    return score
}
