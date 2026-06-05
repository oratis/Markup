import Foundation
import Testing
@testable import MarkupKit

@Suite("Callout")
struct CalloutTests {
    @Test func parsesEachKnownTypeCaseInsensitively() {
        for (type, title) in Callout.titles {
            let upper = Callout.parseMarker("[!\(type.uppercased())]")
            #expect(upper?.type == type)
            #expect(upper?.title == nil)
            #expect(Callout.defaultTitle(for: type) == title)
        }
    }

    @Test func extractsInlineCustomTitle() {
        let r = Callout.parseMarker("[!note] Heads up, everyone")
        #expect(r?.type == "note")
        #expect(r?.title == "Heads up, everyone")
    }

    @Test func ignoresBodyAfterANewline() {
        // Only the marker line contributes a title; the body stays out of it.
        let r = Callout.parseMarker("[!tip]\nUse the keyboard shortcut.")
        #expect(r?.type == "tip")
        #expect(r?.title == nil)
    }

    @Test func rejectsUnknownTypesAndPlainBlockquotes() {
        #expect(Callout.parseMarker("[!unknown] hi") == nil)
        #expect(Callout.parseMarker("just a normal quote") == nil)
        #expect(Callout.parseMarker("") == nil)
        #expect(Callout.defaultTitle(for: "bogus") == nil)
    }

    @Test func toleratesLeadingWhitespace() {
        #expect(Callout.parseMarker("   [!warning]")?.type == "warning")
    }
}
