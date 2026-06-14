import Foundation
import Testing
@testable import MarkupKit

@Suite("GitBlob")
struct GitBlobTests {
    // SHAs verified against `git hash-object` / `printf … | git hash-object --stdin`.
    @Test func emptyBlobMatchesGit() {
        #expect(GitBlob.sha(Data()) == "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391")
    }

    @Test func helloBlobMatchesGit() {
        // `printf 'hello\n' | git hash-object --stdin`
        #expect(GitBlob.sha(Data("hello\n".utf8)) == "ce013625030ba8dba906f756967f9e9ca394464a")
    }

    @Test func noTrailingNewlineMatchesGit() {
        // `printf 'hello' | git hash-object --stdin`
        #expect(GitBlob.sha(Data("hello".utf8)) == "b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0")
    }

    @Test func differentContentDiffers() {
        #expect(GitBlob.sha(Data("a".utf8)) != GitBlob.sha(Data("b".utf8)))
    }

    @Test func spansMultipleBlocks() {
        // A payload longer than one 64-byte SHA-1 block, vs `git hash-object`.
        let content = String(repeating: "x", count: 1000)
        // `python3 -c "import hashlib;print(hashlib.sha1(b'blob 1000\0'+b'x'*1000).hexdigest())"`
        #expect(GitBlob.sha(Data(content.utf8)) == "14c7dfdd4258dec5c0e9d2e919bd249bd674be1f")
    }
}
