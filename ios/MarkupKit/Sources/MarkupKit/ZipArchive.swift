import Compression
import Foundation

/// One extracted file from a zip.
public struct ZipEntry: Equatable, Sendable {
    public let path: String
    public let data: Data
    public init(path: String, data: Data) {
        self.path = path
        self.data = data
    }
}

/// A minimal, dependency-free reader for the kind of `.zip` web bundles AI
/// tools export (`index.html` + an `assets/` folder). Supports **stored**
/// (method 0) and **deflate** (method 8) entries; ignores directories,
/// encryption, and zip64. Pure + bounds-checked — never traps on bad input,
/// returns `[]` instead.
public enum ZipArchive {

    /// Extract every supported file entry from zip `data`.
    public static func extract(_ data: Data) -> [ZipEntry] {
        let bytes = [UInt8](data)
        guard let eocd = findEOCD(bytes) else { return [] }
        let count = u16(bytes, eocd + 10)
        var offset = Int(u32(bytes, eocd + 16)) // start of central directory

        var entries: [ZipEntry] = []
        for _ in 0..<count {
            guard offset + 46 <= bytes.count, u32(bytes, offset) == 0x0201_4b50 else { break }
            let method = u16(bytes, offset + 10)
            let compSize = Int(u32(bytes, offset + 20))
            let uncompSize = Int(u32(bytes, offset + 24))
            let nameLen = Int(u16(bytes, offset + 28))
            let extraLen = Int(u16(bytes, offset + 30))
            let commentLen = Int(u16(bytes, offset + 32))
            let localOffset = Int(u32(bytes, offset + 42))
            let nameStart = offset + 46
            guard nameStart + nameLen <= bytes.count else { break }
            let name = String(decoding: bytes[nameStart..<nameStart + nameLen], as: UTF8.self)

            if !name.hasSuffix("/"), // skip directory records
               let data = readEntry(
                bytes, localOffset: localOffset, method: method,
                compSize: compSize, uncompSize: uncompSize) {
                entries.append(ZipEntry(path: name, data: data))
            }
            offset = nameStart + nameLen + extraLen + commentLen
        }
        return entries
    }

    /// Whether `data` looks like a **zip64** archive (or otherwise exceeds the
    /// classic-format limits this reader understands). `extract` silently drops
    /// entries it can't parse — fine for a small web bundle, but for a whole-repo
    /// zipball it would yield a *partial* tree with no error. Callers that need
    /// completeness (the GitHub vault) should check this and fail loudly.
    ///
    /// Detected via the classic EOCD sentinels: a `0xFFFF` entry count or a
    /// `0xFFFFFFFF` central-directory size/offset all mean "see the zip64 record".
    public static func isLikelyZip64(_ data: Data) -> Bool {
        let bytes = [UInt8](data)
        guard let eocd = findEOCD(bytes) else { return false }
        return u16(bytes, eocd + 10) == 0xFFFF      // total entry count
            || u32(bytes, eocd + 12) == 0xFFFF_FFFF // central-directory size
            || u32(bytes, eocd + 16) == 0xFFFF_FFFF // central-directory offset
    }

    /// Pick the HTML file to open as the bundle's entry point: a top-level
    /// `index.html`/`index.htm` first, else the shallowest `.html`, else the
    /// first one. Returns `nil` when the bundle has no HTML.
    public static func entryHTML(_ paths: [String]) -> String? {
        let htmls = paths.filter {
            let e = ($0 as NSString).pathExtension.lowercased()
            return e == "html" || e == "htm"
        }
        guard !htmls.isEmpty else { return nil }
        if let topIndex = htmls.first(where: {
            let n = ($0 as NSString).lastPathComponent.lowercased()
            return !$0.contains("/") && (n == "index.html" || n == "index.htm")
        }) { return topIndex }
        if let anyIndex = htmls.first(where: {
            let n = ($0 as NSString).lastPathComponent.lowercased()
            return n == "index.html" || n == "index.htm"
        }) { return anyIndex }
        // Shallowest path (fewest `/`), stable by original order.
        return htmls.min { depth($0) < depth($1) }
    }

    private static func depth(_ p: String) -> Int { p.filter { $0 == "/" }.count }

    // MARK: - Internals

    private static func readEntry(
        _ bytes: [UInt8], localOffset: Int, method: Int, compSize: Int, uncompSize: Int
    ) -> Data? {
        guard localOffset + 30 <= bytes.count, u32(bytes, localOffset) == 0x0403_4b50 else {
            return nil
        }
        let nameLen = Int(u16(bytes, localOffset + 26))
        let extraLen = Int(u16(bytes, localOffset + 28))
        let dataStart = localOffset + 30 + nameLen + extraLen
        guard dataStart + compSize <= bytes.count else { return nil }
        let comp = Array(bytes[dataStart..<dataStart + compSize])
        switch method {
        case 0: // stored
            return Data(comp)
        case 8: // deflate
            return inflate(comp, expectedSize: uncompSize)
        default:
            return nil
        }
    }

    private static func inflate(_ comp: [UInt8], expectedSize: Int) -> Data? {
        guard expectedSize > 0 else { return Data() }
        var dst = [UInt8](repeating: 0, count: expectedSize)
        let written = comp.withUnsafeBufferPointer { src in
            compression_decode_buffer(
                &dst, expectedSize, src.baseAddress!, comp.count, nil, COMPRESSION_ZLIB)
        }
        guard written == expectedSize else { return nil }
        return Data(dst)
    }

    /// Find the End Of Central Directory record by scanning back for its
    /// signature (handles a trailing comment up to 64 KB).
    private static func findEOCD(_ bytes: [UInt8]) -> Int? {
        guard bytes.count >= 22 else { return nil }
        let minStart = max(0, bytes.count - 22 - 0xFFFF)
        var i = bytes.count - 22
        while i >= minStart {
            if u32(bytes, i) == 0x0605_4b50 { return i }
            i -= 1
        }
        return nil
    }

    private static func u16(_ b: [UInt8], _ i: Int) -> Int {
        guard i + 1 < b.count else { return 0 }
        return Int(b[i]) | (Int(b[i + 1]) << 8)
    }

    private static func u32(_ b: [UInt8], _ i: Int) -> UInt32 {
        guard i + 3 < b.count else { return 0 }
        return UInt32(b[i]) | (UInt32(b[i + 1]) << 8)
            | (UInt32(b[i + 2]) << 16) | (UInt32(b[i + 3]) << 24)
    }
}
