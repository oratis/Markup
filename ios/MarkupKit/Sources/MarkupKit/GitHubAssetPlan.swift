import Foundation

/// A plan for materializing a GitHub document into a local working copy: the
/// in-repo assets it references that must be downloaded alongside it so the
/// reader renders with full fidelity instead of 404-ing every image/stylesheet.
///
/// This is the bridge between the pure `DocReferences` scanner and
/// `GitHubService`'s downloader (design `docs/design/ios/03-github-primary-vault.md`
/// §16, reading-gap #1 "broken images/CSS"). It deliberately includes only
/// **assets** — images, stylesheets, scripts — and excludes:
///  - external URLs / anchors / unresolvable refs (nothing to download),
///  - the document itself,
///  - in-repo *links* to other docs (those are followed lazily when tapped, not
///    bundled up-front — otherwise opening one README would drag in the repo).
public struct GitHubAssetPlan: Equatable, Sendable {
    /// Repo-relative path of the primary document (e.g. "docs/guide.md").
    public let docPath: String
    /// Repo-relative paths of in-repo assets to download, de-duplicated and in
    /// first-seen order (stable for tests + predictable download sequencing).
    public let assetPaths: [String]

    public init(docPath: String, assetPaths: [String]) {
        self.docPath = docPath
        self.assetPaths = assetPaths
    }

    /// Plan the assets for a Markdown document at `docPath`.
    public static func markdown(_ md: String, docPath: String) -> GitHubAssetPlan {
        make(DocReferences.markdown(md, docPath: docPath), docPath: docPath)
    }

    /// Plan the assets for an HTML document at `docPath`.
    public static func html(_ html: String, docPath: String) -> GitHubAssetPlan {
        make(DocReferences.html(html, docPath: docPath), docPath: docPath)
    }

    private static let assetKinds: Set<DocRefKind> = [.image, .stylesheet, .script]

    private static func make(_ refs: [DocRef], docPath: String) -> GitHubAssetPlan {
        var seen = Set<String>()
        var paths: [String] = []
        for ref in refs where assetKinds.contains(ref.kind) {
            guard case let .inRepo(p) = ref.target, p != docPath, !seen.contains(p) else { continue }
            seen.insert(p)
            paths.append(p)
        }
        return GitHubAssetPlan(docPath: docPath, assetPaths: paths)
    }
}
