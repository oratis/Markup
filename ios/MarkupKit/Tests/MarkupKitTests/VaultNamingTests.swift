import Testing
@testable import MarkupKit

@Suite("VaultNaming.uniqueName")
struct VaultNamingTests {
    @Test func usesBaseWhenFree() {
        #expect(VaultNaming.uniqueName(base: "Untitled", ext: "md", existing: []) == "Untitled.md")
    }

    @Test func suffixesOnCollision() {
        let existing: Set<String> = ["Untitled.md", "Untitled 2.md"]
        #expect(VaultNaming.uniqueName(base: "Untitled", ext: "md", existing: existing)
            == "Untitled 3.md")
    }

    @Test func collisionIsCaseInsensitive() {
        #expect(VaultNaming.uniqueName(base: "Note", ext: "md", existing: ["note.md"])
            == "Note 2.md")
    }
}
