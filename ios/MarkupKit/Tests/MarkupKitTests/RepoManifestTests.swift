import Foundation
import Testing
@testable import MarkupKit

@Suite("RepoManifest")
struct RepoManifestTests {
    // A realistic git-trees API response: one tree (dir), three blobs (files),
    // and one submodule (commit) — the dir + submodule must be dropped.
    private let treeJSON = Data("""
    {
      "sha": "tree123",
      "url": "https://api.github.com/...",
      "truncated": false,
      "tree": [
        {"path": "README.md", "mode": "100644", "type": "blob", "sha": "aaa", "size": 42},
        {"path": "docs", "mode": "040000", "type": "tree", "sha": "ddd"},
        {"path": "docs/guide.md", "mode": "100644", "type": "blob", "sha": "bbb", "size": 100},
        {"path": "assets/logo.png", "mode": "100644", "type": "blob", "sha": "ccc", "size": 2048},
        {"path": "vendor/lib", "mode": "160000", "type": "commit", "sha": "eee"}
      ]
    }
    """.utf8)

    // MARK: - parseTreeAPI

    @Test func parsesBlobsTreeShaAndTruncated() {
        let m = RepoManifest.parseTreeAPI(treeJSON)
        #expect(m?.treeSha == "tree123")
        #expect(m?.truncated == false)
        // Only the three blobs survive (tree + submodule excluded).
        #expect(m?.paths == ["README.md", "assets/logo.png", "docs/guide.md"])
        #expect(m?.blobs["README.md"] == RepoBlob(path: "README.md", sha: "aaa", size: 42))
        #expect(m?.blobs["docs/guide.md"]?.sha == "bbb")
        #expect(m?.blobs["assets/logo.png"]?.size == 2048)
    }

    @Test func missingSizeDefaultsToZero() {
        let json = Data("""
        {"sha":"t","tree":[{"path":"x.md","type":"blob","sha":"s"}]}
        """.utf8)
        #expect(RepoManifest.parseTreeAPI(json)?.blobs["x.md"]?.size == 0)
    }

    @Test func capturesTruncatedFlag() {
        let json = Data("""
        {"sha":"t","truncated":true,"tree":[{"path":"x.md","type":"blob","sha":"s","size":1}]}
        """.utf8)
        #expect(RepoManifest.parseTreeAPI(json)?.truncated == true)
    }

    @Test func rejectsUnsafePaths() {
        let json = Data("""
        {"sha":"t","tree":[
          {"path":"../evil.md","type":"blob","sha":"s1","size":1},
          {"path":"/abs.md","type":"blob","sha":"s2","size":1},
          {"path":"a/../b.md","type":"blob","sha":"s3","size":1},
          {"path":"ok.md","type":"blob","sha":"s4","size":1}
        ]}
        """.utf8)
        let m = RepoManifest.parseTreeAPI(json)
        #expect(m?.paths == ["ok.md"])
    }

    @Test func badJSONReturnsNil() {
        #expect(RepoManifest.parseTreeAPI(Data("nope".utf8)) == nil)
    }

    @Test func emptyTreeIsEmptyManifest() {
        let json = Data(#"{"sha":"t","tree":[]}"#.utf8)
        #expect(RepoManifest.parseTreeAPI(json)?.blobs.isEmpty == true)
    }

    // MARK: - diff

    private func manifest(_ pairs: [(String, String)]) -> RepoManifest {
        var blobs: [String: RepoBlob] = [:]
        for (path, sha) in pairs { blobs[path] = RepoBlob(path: path, sha: sha, size: 1) }
        return RepoManifest(treeSha: "t", blobs: blobs)
    }

    @Test func identicalManifestsDiffEmpty() {
        let m = manifest([("a.md", "1"), ("b.md", "2")])
        let d = RepoManifest.diff(from: m, to: m)
        #expect(d.isEmpty)
        #expect(d.changeCount == 0)
    }

    @Test func detectsAddedChangedRemoved() {
        let old = manifest([("keep.md", "1"), ("change.md", "2"), ("gone.md", "3")])
        let new = manifest([("keep.md", "1"), ("change.md", "2x"), ("added.md", "9")])
        let d = RepoManifest.diff(from: old, to: new)
        #expect(d.added.map(\.path) == ["added.md"])
        #expect(d.changed.map(\.path) == ["change.md"])
        #expect(d.changed.first?.sha == "2x")
        #expect(d.removed == ["gone.md"])
        #expect(!d.isEmpty)
        #expect(d.changeCount == 3)
    }

    @Test func toFetchIsAddedPlusChangedPathSorted() {
        let old = manifest([("z.md", "1")])
        let new = manifest([("z.md", "1z"), ("a.md", "2"), ("m.md", "3")])
        let d = RepoManifest.diff(from: old, to: new)
        // a.md + m.md added, z.md changed → sorted by path.
        #expect(d.toFetch.map(\.path) == ["a.md", "m.md", "z.md"])
    }

    @Test func sameContentDifferentTreeShaStillEmpty() {
        // A new commit that touched no files we track → tree SHA differs but the
        // blob map is identical, so the diff is empty (nothing to download).
        let old = RepoManifest(treeSha: "old", blobs: ["a.md": RepoBlob(path: "a.md", sha: "1", size: 1)])
        let new = RepoManifest(treeSha: "new", blobs: ["a.md": RepoBlob(path: "a.md", sha: "1", size: 1)])
        #expect(RepoManifest.diff(from: old, to: new).isEmpty)
    }

    // MARK: - Codable round-trips (sidecar persistence)

    @Test func manifestCodableRoundTrips() throws {
        let m = manifest([("a.md", "1"), ("dir/b.md", "2")])
        let data = try JSONEncoder().encode(m)
        #expect(try JSONDecoder().decode(RepoManifest.self, from: data) == m)
    }

    @Test func vaultMetaCodableRoundTrips() throws {
        let meta = GitHubVaultMeta(
            link: GitHubLink(owner: "o", repo: "r", ref: "main", path: "", isDirectory: true),
            manifest: manifest([("README.md", "abc")]))
        let data = try JSONEncoder().encode(meta)
        #expect(try JSONDecoder().decode(GitHubVaultMeta.self, from: data) == meta)
    }

    @Test func parseThenDiffEndToEnd() {
        // Parse two tree responses and diff — the realistic refresh path.
        let v1 = RepoManifest.parseTreeAPI(treeJSON)!
        let v2JSON = Data("""
        {"sha":"tree999","tree":[
          {"path":"README.md","type":"blob","sha":"aaa","size":42},
          {"path":"docs/guide.md","type":"blob","sha":"bbb2","size":120},
          {"path":"docs/new.md","type":"blob","sha":"fff","size":7}
        ]}
        """.utf8)
        let v2 = RepoManifest.parseTreeAPI(v2JSON)!
        let d = RepoManifest.diff(from: v1, to: v2)
        #expect(d.added.map(\.path) == ["docs/new.md"])
        #expect(d.changed.map(\.path) == ["docs/guide.md"])
        #expect(d.removed == ["assets/logo.png"])
    }
}
