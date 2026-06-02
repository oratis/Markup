import SwiftUI
import MarkupKit

/// App settings: appearance defaults, vault info, and about.
struct SettingsView: View {
    let vault: VaultStore
    @Environment(\.dismiss) private var dismiss

    @AppStorage("reader.theme") private var themeRaw = ReaderTheme.light.rawValue
    @AppStorage("reader.fontScale") private var fontScale = 1.0
    @AppStorage("reader.maxWidth") private var maxWidth = 720

    private var appVersion: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        return v
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Reader theme", selection: $themeRaw) {
                        ForEach(ReaderTheme.allCases, id: \.rawValue) { t in
                            Text(t.rawValue.capitalized).tag(t.rawValue)
                        }
                    }
                    VStack(alignment: .leading) {
                        Text("Text size  \(Int(fontScale * 100))%")
                        Slider(value: $fontScale, in: 0.6...2.0, step: 0.1)
                    }
                    VStack(alignment: .leading) {
                        Text("Reading width  \(maxWidth) pt")
                        Slider(
                            value: Binding(
                                get: { Double(maxWidth) },
                                set: { maxWidth = Int($0) }),
                            in: 480...1000, step: 20)
                    }
                }

                Section("Vault") {
                    LabeledContent("Folder", value: vault.rootName)
                    LabeledContent("Notes", value: "\(vault.files.count)")
                    LabeledContent("Index", value: vault.indexReady ? "Ready" : "Building…")
                    Button("Reindex") { vault.scan() }
                }

                Section("About") {
                    LabeledContent("Version", value: appVersion)
                    Link("Markup on GitHub", destination: URL(string: "https://github.com/oratis/Markup")!)
                    Link("Get Markup for Mac", destination: URL(string: "https://github.com/oratis/Markup/releases")!)
                    Text("Private by default — no account, no telemetry.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        }
    }
}
