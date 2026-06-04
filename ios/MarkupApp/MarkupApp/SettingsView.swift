import SwiftUI
import MarkupKit

/// App settings: appearance defaults, vault info, and about.
struct SettingsView: View {
    let vault: VaultStore
    @Environment(\.dismiss) private var dismiss
    @Bindable private var loc = Localization.shared

    @AppStorage("reader.theme") private var themeRaw = ReaderTheme.light.rawValue
    @AppStorage("reader.fontScale") private var fontScale = 1.0
    @AppStorage("reader.maxWidth") private var maxWidth = 720
    @AppStorage("reader.lineHeight") private var lineHeight = 1.65

    private var appVersion: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        return v
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(t(.appearance)) {
                    Picker(t(.readerTheme), selection: $themeRaw) {
                        ForEach(ReaderTheme.allCases, id: \.rawValue) { th in
                            Text(th.rawValue.capitalized).tag(th.rawValue)
                        }
                    }
                    VStack(alignment: .leading) {
                        Text("\(t(.textSize))  \(Int(fontScale * 100))%")
                        Slider(value: $fontScale, in: 0.6...2.0, step: 0.1)
                    }
                    VStack(alignment: .leading) {
                        Text("\(t(.readingWidth))  \(maxWidth) pt")
                        Slider(
                            value: Binding(
                                get: { Double(maxWidth) },
                                set: { maxWidth = Int($0) }),
                            in: 480...1000, step: 20)
                    }
                    VStack(alignment: .leading) {
                        Text("\(t(.lineSpacing))  \(String(format: "%.2f", lineHeight))")
                        Slider(value: $lineHeight, in: 1.2...2.4, step: 0.05)
                    }
                }

                Section(t(.language)) {
                    Picker(t(.language), selection: $loc.language) {
                        Text(t(.languageSystem)).tag(AppLanguage.system)
                        Text("English").tag(AppLanguage.en)
                        Text("中文").tag(AppLanguage.zh)
                    }
                    .pickerStyle(.segmented)
                }

                Section(t(.vault)) {
                    LabeledContent(t(.folder), value: vault.rootName)
                    LabeledContent(t(.notes), value: "\(vault.files.count)")
                    LabeledContent(t(.index), value: vault.indexReady ? t(.ready) : t(.building))
                    Button(t(.reindex)) { vault.scan() }
                }

                Section(t(.about)) {
                    LabeledContent(t(.version), value: appVersion)
                    Link(t(.onGitHub), destination: URL(string: "https://github.com/oratis/Markup")!)
                    Link(t(.getMac), destination: URL(string: "https://github.com/oratis/Markup/releases")!)
                    Text(t(.privacyLine))
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle(t(.settings))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } } }
        }
    }
}
