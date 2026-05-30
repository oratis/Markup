// swift-tools-version: 6.0
import PackageDescription

// MarkupKit — pure, UI-free core for Markup on iOS/iPadOS.
//
// Holds the logic ported from the desktop app's `src/lib` (models, fuzzy
// ranking, slug/heading helpers, search-operator parsing) plus, over time,
// the VaultService / IndexService / RenderService described in
// docs/design/ios/00-ios-app-design.md.
//
// Deliberately depends on nothing but Foundation so it builds & tests on the
// macOS host in CI (`swift test`) without an iOS simulator or Xcode project.
let package = Package(
    name: "MarkupKit",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "MarkupKit", targets: ["MarkupKit"]),
    ],
    targets: [
        .target(
            name: "MarkupKit",
            linkerSettings: [.linkedLibrary("sqlite3")]
        ),
        .testTarget(name: "MarkupKitTests", dependencies: ["MarkupKit"]),
    ]
)
