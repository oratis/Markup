import MarkupKit
import SwiftUI

/// Horizontal strip of open-document tabs (iPad multi-doc). Tapping a tab
/// activates it (drives the shared `selection`); the ✕ closes it. Shown above
/// the detail pane only when more than one document is open.
struct TabStripView: View {
    let tabs: OpenTabsStore
    @Binding var selection: VaultFile?
    var onClose: (VaultFile) -> Void

    private func title(_ file: VaultFile) -> String {
        (file.name as NSString).deletingPathExtension
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(tabs.files) { file in
                    let active = selection == file
                    HStack(spacing: 5) {
                        Button { selection = file } label: {
                            Text(title(file))
                                .font(.callout)
                                .lineLimit(1)
                                .foregroundStyle(active ? Color.primary : .secondary)
                        }
                        .buttonStyle(.plain)

                        Button { onClose(file) } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(t(.closeTab))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .fill(active ? Color.accentColor.opacity(0.16) : Color.secondary.opacity(0.08))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .strokeBorder(active ? Color.accentColor.opacity(0.5) : .clear, lineWidth: 1)
                    )
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
        }
        .background(.bar)
    }
}
