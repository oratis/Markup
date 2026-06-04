import SwiftUI

/// Switch between remembered vaults, remove ones you no longer use, or open
/// another folder. The active vault is checkmarked.
struct VaultSwitcherView: View {
    let vault: VaultStore
    var onOpenAnother: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if !vault.knownVaults.isEmpty {
                    Section {
                        ForEach(vault.knownVaults) { v in
                            Button {
                                if v.path != vault.rootURL?.path { vault.switchTo(v) }
                                dismiss()
                            } label: {
                                HStack {
                                    Label {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(v.name)
                                            Text(v.path)
                                                .font(.caption2).foregroundStyle(.secondary)
                                                .lineLimit(1).truncationMode(.head)
                                        }
                                    } icon: { Image(systemName: "folder") }
                                    Spacer()
                                    if v.path == vault.rootURL?.path {
                                        Image(systemName: "checkmark").foregroundStyle(.tint)
                                    }
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) { vault.removeVault(v) } label: {
                                    Label(t(.remove), systemImage: "trash")
                                }
                            }
                        }
                    }
                }
                Button {
                    dismiss()
                    onOpenAnother()
                } label: {
                    Label(t(.openFolder), systemImage: "folder.badge.plus")
                }
            }
            .navigationTitle(t(.switchVault))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.done)) { dismiss() } } }
        }
    }
}
