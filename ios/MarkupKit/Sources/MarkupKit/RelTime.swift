import Foundation

/// Human-readable relative time string for a past timestamp ("5s ago",
/// "2m ago", "3h ago", "4d ago"). Intentionally coarse — used for "last
/// saved" hints and file-row modified times. Faithful port of the desktop
/// `src/lib/rel-time.ts` so both platforms read identically.
///
/// `ms` and `nowMs` are Unix-epoch milliseconds. `nowMs` is injectable so
/// callers (and tests) stay deterministic; pass `Date()` at the call site.
public enum RelTime {
    public static func string(_ ms: Double, now nowMs: Double) -> String {
        let diff = max(0, nowMs - ms)
        let s = Int(diff / 1000)
        if s < 60 { return "\(s)s ago" }
        let m = s / 60
        if m < 60 { return "\(m)m ago" }
        let h = m / 60
        if h < 24 { return "\(h)h ago" }
        let d = h / 24
        return "\(d)d ago"
    }

    /// Convenience using the current wall-clock time.
    public static func string(_ ms: Double) -> String {
        string(ms, now: Date().timeIntervalSince1970 * 1000)
    }
}
