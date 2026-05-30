import SwiftUI
import MarkupKit

/// Renders one note as a page, with a theme switcher. Reading is the default
/// surface (the app's whole point).
struct ReaderView: View {
    let file: VaultFile
    let content: String

    @AppStorage("reader.theme") private var themeRaw = ReaderTheme.light.rawValue
    private var theme: ReaderTheme { ReaderTheme(rawValue: themeRaw) ?? .light }

    private var baseURL: URL {
        URL(fileURLWithPath: file.path).deletingLastPathComponent()
    }

    var body: some View {
        ReaderWebView(
            html: MarkdownLite.renderDocument(content, title: file.name, theme: theme),
            baseURL: baseURL
        )
        .ignoresSafeArea(edges: .bottom)
        .navigationTitle(file.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Theme", selection: $themeRaw) {
                        ForEach(ReaderTheme.allCases, id: \.rawValue) { t in
                            Text(t.rawValue.capitalized).tag(t.rawValue)
                        }
                    }
                } label: {
                    Image(systemName: "textformat.size")
                }
            }
        }
    }
}
