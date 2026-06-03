import Foundation
import MarkupKit

/// Bridges the UIKit source editor (`SourceEditorView.Coordinator`) and the
/// SwiftUI chrome around it (`ReaderView`), so an inline `[[` wikilink picker
/// can be driven from typing yet rendered as a SwiftUI overlay.
@MainActor
@Observable
final class EditorController {
    /// The partial query typed after an unclosed `[[` (e.g. "road" in
    /// `[[road`), or `nil` when the caret isn't inside a wikilink. Drives the
    /// suggestions overlay.
    var wikilinkQuery: String?

    /// Set by the editor coordinator: insert the chosen note name into the
    /// active `[[…]]` at the caret.
    var insertWikilink: ((String) -> Void)?

    /// Set true by the accessory "image" button; ReaderView presents a photo
    /// picker, writes the image into the vault, then calls `insertText`.
    var imagePickerRequested = false

    /// Set by the editor coordinator: insert raw text at the caret (e.g. an
    /// image reference).
    var insertText: ((String) -> Void)?
}
