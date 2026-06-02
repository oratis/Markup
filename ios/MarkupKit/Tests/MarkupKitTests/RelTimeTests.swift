import Testing
@testable import MarkupKit

@Suite("RelTime")
struct RelTimeTests {
    // A fixed "now" so the cases are deterministic.
    let now = 1_000_000_000_000.0

    @Test func secondsAgo() {
        #expect(RelTime.string(now - 5_000, now: now) == "5s ago")
        #expect(RelTime.string(now - 59_000, now: now) == "59s ago")
    }

    @Test func minutesAgo() {
        #expect(RelTime.string(now - 60_000, now: now) == "1m ago")
        #expect(RelTime.string(now - 59 * 60_000, now: now) == "59m ago")
    }

    @Test func hoursAgo() {
        #expect(RelTime.string(now - 60 * 60_000, now: now) == "1h ago")
        #expect(RelTime.string(now - 23 * 60 * 60_000, now: now) == "23h ago")
    }

    @Test func daysAgo() {
        #expect(RelTime.string(now - 24 * 60 * 60_000, now: now) == "1d ago")
        #expect(RelTime.string(now - 10 * 24 * 60 * 60_000, now: now) == "10d ago")
    }

    @Test func futureClampsToZero() {
        #expect(RelTime.string(now + 5_000, now: now) == "0s ago")
    }
}
