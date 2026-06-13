import SwiftUI

/// First-run hero: three swipeable cards introducing the reader, the
/// bring-your-own-folder model, and the privacy stance, ending in the folder
/// picker (design §6.1). Shown as the no-vault state.
struct OnboardingView: View {
    var onOpenFolder: () -> Void
    var onOpenGitHub: () -> Void
    @State private var page = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private struct Card: Identifiable {
        let id = UUID()
        let icon: String
        let title: L
        let body: L
    }

    private let cards: [Card] = [
        Card(icon: "book", title: .onboardTitle1, body: .onboardBody1),
        Card(icon: "folder.badge.plus", title: .onboardTitle2, body: .onboardBody2),
        Card(icon: "lock.shield", title: .onboardTitle3, body: .onboardBody3),
    ]

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $page) {
                ForEach(Array(cards.enumerated()), id: \.offset) { index, card in
                    cardView(card).tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))

            // Non-final cards advance the intro; the last card forks into two
            // equal-weight vault sources — a local folder, or a GitHub repo.
            Group {
                if page < cards.count - 1 {
                    Button {
                        if reduceMotion { page += 1 } else { withAnimation { page += 1 } }
                    } label: {
                        Text(t(.onboardNext)).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                } else {
                    HStack(spacing: 12) {
                        Button(action: onOpenFolder) {
                            Text(t(.openFolder))
                                .frame(maxWidth: .infinity)
                                .lineLimit(1).minimumScaleFactor(0.7)
                        }
                        .buttonStyle(.borderedProminent)
                        Button(action: onOpenGitHub) {
                            Text(t(.openFromGitHub))
                                .frame(maxWidth: .infinity)
                                .lineLimit(1).minimumScaleFactor(0.7)
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
            .controlSize(.large)
            .padding(.horizontal, 24)
            .padding(.bottom, 16)
        }
    }

    private func cardView(_ card: Card) -> some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: card.icon)
                .font(.system(size: 56))
                .foregroundStyle(.tint)
                .accessibilityHidden(true)
            Text(t(card.title))
                .font(.title2.bold())
                .multilineTextAlignment(.center)
            Text(t(card.body))
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
            Spacer()
            Spacer()
        }
        .padding(.horizontal, 32)
    }
}
