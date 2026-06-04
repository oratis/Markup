import Compression
import Foundation
import Testing
@testable import MarkupKit

@Suite("ZipArchive.entryHTML")
struct ZipEntryHTMLTests {
    @Test func prefersTopLevelIndex() {
        let paths = ["assets/app.js", "sub/page.html", "index.html", "readme.txt"]
        #expect(ZipArchive.entryHTML(paths) == "index.html")
    }

    @Test func fallsBackToShallowestHTML() {
        #expect(ZipArchive.entryHTML(["a/b/deep.html", "top.html"]) == "top.html")
    }

    @Test func nilWhenNoHTML() {
        #expect(ZipArchive.entryHTML(["a.txt", "b.css"]) == nil)
    }
}

@Suite("ZipArchive.extract")
struct ZipExtractTests {
    @Test func extractsStoredEntry() {
        let body = Data("<h1>hi</h1>".utf8)
        let zip = makeZip([(name: "index.html", data: body, deflate: false)])
        let entries = ZipArchive.extract(zip)
        #expect(entries.count == 1)
        #expect(entries.first?.path == "index.html")
        #expect(entries.first?.data == body)
    }

    @Test func extractsDeflateEntry() {
        // A body long/repetitive enough that DEFLATE actually shrinks it,
        // exercising the real inflate path.
        let body = Data(String(repeating: "abcd1234", count: 200).utf8)
        let zip = makeZip([(name: "page.html", data: body, deflate: true)])
        let entries = ZipArchive.extract(zip)
        #expect(entries.count == 1)
        #expect(entries.first?.data == body)
    }

    @Test func extractsMultipleAndSkipsDirs() {
        let zip = makeZip([
            (name: "assets/", data: Data(), deflate: false), // directory record
            (name: "index.html", data: Data("x".utf8), deflate: false),
            (name: "assets/app.css", data: Data("body{}".utf8), deflate: true),
        ])
        let entries = ZipArchive.extract(zip)
        let paths = entries.map(\.path).sorted()
        #expect(paths == ["assets/app.css", "index.html"])
    }

    @Test func badDataYieldsEmpty() {
        #expect(ZipArchive.extract(Data("not a zip".utf8)).isEmpty)
        #expect(ZipArchive.extract(Data()).isEmpty)
    }
}

// MARK: - In-test ZIP builder

private func le16(_ v: Int) -> [UInt8] { [UInt8(v & 0xff), UInt8((v >> 8) & 0xff)] }
private func le32(_ v: Int) -> [UInt8] {
    [UInt8(v & 0xff), UInt8((v >> 8) & 0xff), UInt8((v >> 16) & 0xff), UInt8((v >> 24) & 0xff)]
}

private func deflateRaw(_ data: Data) -> Data {
    let src = [UInt8](data)
    var dst = [UInt8](repeating: 0, count: max(64, src.count * 2 + 64))
    let n = src.withUnsafeBufferPointer { sp in
        compression_encode_buffer(&dst, dst.count, sp.baseAddress!, src.count, nil, COMPRESSION_ZLIB)
    }
    return Data(dst[0..<n])
}

/// Build a minimal but valid zip (local headers + central directory + EOCD).
private func makeZip(_ files: [(name: String, data: Data, deflate: Bool)]) -> Data {
    var local = [UInt8]()
    var central = [UInt8]()
    var offsets: [Int] = []

    for f in files {
        let nameBytes = [UInt8](f.name.utf8)
        let isDir = f.name.hasSuffix("/")
        let stored = isDir ? Data() : (f.deflate ? deflateRaw(f.data) : f.data)
        let method = (f.deflate && !isDir) ? 8 : 0
        offsets.append(local.count)

        // Local file header
        local += le32(0x0403_4b50) + le16(20) + le16(0) + le16(method)
        local += le16(0) + le16(0) + le32(0) // time, date, crc
        local += le32(stored.count) + le32(f.data.count)
        local += le16(nameBytes.count) + le16(0)
        local += nameBytes
        local += [UInt8](stored)
    }

    for (i, f) in files.enumerated() {
        let nameBytes = [UInt8](f.name.utf8)
        let isDir = f.name.hasSuffix("/")
        let storedSize = isDir ? 0 : (f.deflate ? deflateRaw(f.data).count : f.data.count)
        let method = (f.deflate && !isDir) ? 8 : 0
        central += le32(0x0201_4b50) + le16(20) + le16(20) + le16(0) + le16(method)
        central += le16(0) + le16(0) + le32(0)
        central += le32(storedSize) + le32(f.data.count)
        central += le16(nameBytes.count) + le16(0) + le16(0)
        central += le16(0) + le16(0) + le32(0)
        central += le32(offsets[i])
        central += nameBytes
    }

    var out = local
    let cdOffset = out.count
    out += central
    out += le32(0x0605_4b50) + le16(0) + le16(0)
    out += le16(files.count) + le16(files.count)
    out += le32(central.count) + le32(cdOffset) + le16(0)
    return Data(out)
}
