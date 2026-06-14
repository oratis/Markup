import Foundation

/// Git blob object identity — the same content-addressed SHA GitHub reports for
/// each file in a tree (`RepoBlob.sha`). Lets the app tell whether a file in a
/// materialized GitHub vault has been edited locally since it was synced, by
/// comparing the local content's blob SHA against the stored manifest.
///
/// Self-contained SHA-1 (no CryptoKit) so MarkupKit stays a pure-Foundation,
/// dependency-free package. SHA-1 here is for *content identity*, not security.
public enum GitBlob {
    /// The git blob SHA-1 (lowercase hex) of `content`: the SHA-1 of the bytes
    /// `"blob <byteCount>\0" + content`. Matches `git hash-object` and the SHAs
    /// in a GitHub git-tree response.
    public static func sha(_ content: Data) -> String {
        var message = Data("blob \(content.count)\u{0}".utf8)
        message.append(content)
        return SHA1.hexDigest(message)
    }
}

/// Minimal SHA-1 (RFC 3174). Internal — only used by `GitBlob`.
enum SHA1 {
    static func hexDigest(_ message: Data) -> String {
        var h0: UInt32 = 0x6745_2301
        var h1: UInt32 = 0xEFCD_AB89
        var h2: UInt32 = 0x98BA_DCFE
        var h3: UInt32 = 0x1032_5476
        var h4: UInt32 = 0xC3D2_E1F0

        // Pre-process: append 0x80, pad with zeros to 56 mod 64, then the
        // original bit-length as a big-endian 64-bit integer.
        var msg = [UInt8](message)
        let bitLen = UInt64(msg.count) &* 8
        msg.append(0x80)
        while msg.count % 64 != 56 { msg.append(0) }
        for shift in stride(from: 56, through: 0, by: -8) {
            msg.append(UInt8((bitLen >> UInt64(shift)) & 0xff))
        }

        func rotl(_ v: UInt32, _ n: UInt32) -> UInt32 { (v << n) | (v >> (32 - n)) }

        var w = [UInt32](repeating: 0, count: 80)
        for chunk in stride(from: 0, to: msg.count, by: 64) {
            for i in 0..<16 {
                let j = chunk + i * 4
                w[i] = (UInt32(msg[j]) << 24) | (UInt32(msg[j + 1]) << 16)
                    | (UInt32(msg[j + 2]) << 8) | UInt32(msg[j + 3])
            }
            for i in 16..<80 { w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1) }

            var a = h0, b = h1, c = h2, d = h3, e = h4
            for i in 0..<80 {
                let f: UInt32
                let k: UInt32
                switch i {
                case 0..<20: f = (b & c) | (~b & d); k = 0x5A82_7999
                case 20..<40: f = b ^ c ^ d; k = 0x6ED9_EBA1
                case 40..<60: f = (b & c) | (b & d) | (c & d); k = 0x8F1B_BCDC
                default: f = b ^ c ^ d; k = 0xCA62_C1D6
                }
                let tmp = rotl(a, 5) &+ f &+ e &+ k &+ w[i]
                e = d; d = c; c = rotl(b, 30); b = a; a = tmp
            }
            h0 = h0 &+ a; h1 = h1 &+ b; h2 = h2 &+ c; h3 = h3 &+ d; h4 = h4 &+ e
        }
        return [h0, h1, h2, h3, h4].map { String(format: "%08x", $0) }.joined()
    }
}
