import Testing
@testable import MarkupKit

// Ported from src/lib/fuzzy.test.ts to keep ranking behaviour identical to desktop.
@Suite("scoreSubsequence")
struct FuzzyTests {
    @Test func returnsNegativeInfinityWhenNotSubsequence() {
        #expect(scoreSubsequence("hello", "xyz") == -.infinity)
        #expect(scoreSubsequence("abc", "abcd") == -.infinity)
    }

    @Test func consecutiveBeatsScattered() {
        let consecutive = scoreSubsequence("foobar.md", "foo")
        let scattered = scoreSubsequence("f_o_o_b_a_r.md", "foo")
        #expect(consecutive > scattered)
    }

    @Test func rewardsMatchAfterSeparator() {
        let sepBoundary = scoreSubsequence("notes/api.md", "api")
        let midword = scoreSubsequence("xxxnotesapixxx.md", "api")
        #expect(sepBoundary > midword)
    }

    @Test func treatsUnderscoreDotDashSpaceAsBoundaries() {
        #expect(scoreSubsequence("a_b", "b") > scoreSubsequence("ab", "b"))
        #expect(scoreSubsequence("a-b", "b") > scoreSubsequence("ab", "b"))
        #expect(scoreSubsequence("a.b", "b") > scoreSubsequence("ab", "b"))
        #expect(scoreSubsequence("a b", "b") > scoreSubsequence("ab", "b"))
    }

    @Test func startOfStringBonus() {
        #expect(scoreSubsequence("foo.md", "f") > scoreSubsequence("xfoo.md", "f"))
    }

    @Test func prefersShorterHaystackOnTies() {
        #expect(scoreSubsequence("api.md", "api") > scoreSubsequence("api.long_name_here.md", "api"))
    }

    @Test func emptyNeedleIsJustLengthPenalty() {
        let v = scoreSubsequence("anything.md", "")
        #expect(abs(v - (-Double("anything.md".count) * 0.01)) < 1e-9)
    }

    @Test func respectsInOrderMatching() {
        #expect(scoreSubsequence("abc", "cba") == -.infinity)
    }
}
