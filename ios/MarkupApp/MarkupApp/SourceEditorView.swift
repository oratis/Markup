import SwiftUI
import UIKit
import MarkupKit

/// A native Markdown source editor: `UITextView` with a scrolling accessory bar
/// of formatting actions and smart list continuation on Return.
struct SourceEditorView: UIViewRepresentable {
    @Binding var text: String

    func makeUIView(context: Context) -> UITextView {
        let tv = MarkupTextView()
        tv.delegate = context.coordinator
        tv.editCoordinator = context.coordinator
        tv.font = .monospacedSystemFont(ofSize: 16, weight: .regular)
        tv.autocapitalizationType = .sentences
        tv.smartQuotesType = .no
        tv.smartDashesType = .no
        tv.alwaysBounceVertical = true
        tv.textContainerInset = UIEdgeInsets(top: 12, left: 12, bottom: 80, right: 12)
        tv.text = text
        context.coordinator.textView = tv
        tv.inputAccessoryView = context.coordinator.makeAccessoryBar()
        return tv
    }

    func updateUIView(_ tv: UITextView, context: Context) {
        context.coordinator.parentText = $text
        if tv.text != text { tv.text = text }
    }

    func makeCoordinator() -> Coordinator { Coordinator(text: $text) }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parentText: Binding<String>
        weak var textView: UITextView?

        init(text: Binding<String>) { self.parentText = text }

        func textViewDidChange(_ tv: UITextView) { parentText.wrappedValue = tv.text }

        // Auto-close brackets, type-over, and smart list continuation on Return.
        func textView(
            _ tv: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String
        ) -> Bool {
            // Never interfere with IME composition (e.g. Chinese input) — a
            // deliberate advantage of the native editor over a WebView one.
            if tv.markedTextRange != nil { return true }

            let ns = tv.text as NSString
            if range.length == 0, text.count == 1, let ch = text.first {
                // Type over an auto-inserted closing character instead of
                // doubling it: `()` + `)` → step past, not `())`.
                if ")]}`".contains(ch), range.location < ns.length,
                   ns.substring(with: NSRange(location: range.location, length: 1)) == text {
                    tv.selectedRange = NSRange(location: range.location + 1, length: 0)
                    return false
                }
                // Auto-close an opening bracket, caret left between the pair.
                if let edit = MarkdownEdit.autoClose(tv.text, location: range.location, open: ch) {
                    apply(edit)
                    return false
                }
            }

            guard text == "\n" else { return true }
            let lineRange = ns.lineRange(for: NSRange(location: range.location, length: 0))
            var line = ns.substring(with: lineRange)
            if line.hasSuffix("\n") { line = String(line.dropLast()) }

            switch MarkdownEdit.listContinuation(forLine: line) {
            case .none:
                return true
            case .exit:
                let cleared = ns.replacingCharacters(in: lineRange, with: "\n")
                tv.text = cleared
                let loc = min(lineRange.location + 1, (cleared as NSString).length)
                tv.selectedRange = NSRange(location: loc, length: 0)
                parentText.wrappedValue = cleared
                return false
            case .next(let prefix):
                apply(MarkdownEdit.insert(
                    tv.text, location: range.location, length: range.length, snippet: "\n" + prefix))
                return false
            }
        }

        // MARK: - Accessory bar

        func makeAccessoryBar() -> UIView {
            let bar = UIScrollView(frame: CGRect(x: 0, y: 0, width: 320, height: 48))
            bar.autoresizingMask = [.flexibleWidth]
            bar.backgroundColor = .secondarySystemBackground
            bar.showsHorizontalScrollIndicator = false

            let stack = UIStackView()
            stack.axis = .horizontal
            stack.spacing = 4
            stack.translatesAutoresizingMaskIntoConstraints = false
            bar.addSubview(stack)
            NSLayoutConstraint.activate([
                stack.leadingAnchor.constraint(equalTo: bar.leadingAnchor, constant: 10),
                stack.trailingAnchor.constraint(equalTo: bar.trailingAnchor, constant: -10),
                stack.centerYAnchor.constraint(equalTo: bar.centerYAnchor),
                stack.heightAnchor.constraint(equalToConstant: 36),
            ])

            let items: [(String, () -> Void)] = [
                ("number", { [weak self] in self?.toggleLine("# ") }),
                ("bold", { [weak self] in self?.wrap("**", "**") }),
                ("italic", { [weak self] in self?.wrap("*", "*") }),
                ("chevron.left.forwardslash.chevron.right", { [weak self] in self?.wrap("`", "`") }),
                ("link", { [weak self] in self?.insert("[]()", caret: 1) }),
                ("text.badge.link", { [weak self] in self?.insert("[[]]", caret: 2) }),
                ("list.bullet", { [weak self] in self?.toggleLine("- ") }),
                ("checklist", { [weak self] in self?.toggleLine("- [ ] ") }),
                ("text.quote", { [weak self] in self?.toggleLine("> ") }),
                ("tablecells", { [weak self] in
                    self?.insert("\n| Col | Col |\n| --- | --- |\n|  |  |\n", caret: nil)
                }),
                ("wand.and.stars", { [weak self] in self?.formatTableAtCaret() }),
            ]
            for (symbol, action) in items {
                let button = UIButton(type: .system)
                button.setImage(UIImage(systemName: symbol), for: .normal)
                button.addAction(UIAction { _ in action() }, for: .touchUpInside)
                button.widthAnchor.constraint(equalToConstant: 42).isActive = true
                stack.addArrangedSubview(button)
            }
            return bar
        }

        // MARK: - Edit primitives

        private func selection() -> (Int, Int) {
            let r = textView?.selectedRange ?? NSRange(location: 0, length: 0)
            return (r.location, r.length)
        }

        private func apply(_ edit: TextEdit) {
            guard let tv = textView else { return }
            tv.text = edit.text
            let len = (edit.text as NSString).length
            tv.selectedRange = NSRange(
                location: min(edit.location, len),
                length: min(edit.length, max(0, len - edit.location)))
            parentText.wrappedValue = edit.text
        }

        private func wrap(_ open: String, _ close: String) {
            guard let tv = textView else { return }
            let (l, len) = selection()
            apply(MarkdownEdit.wrap(tv.text, location: l, length: len, open: open, close: close))
        }

        private func insert(_ snippet: String, caret: Int?) {
            guard let tv = textView else { return }
            let (l, len) = selection()
            apply(MarkdownEdit.insert(tv.text, location: l, length: len, snippet: snippet, caretOffset: caret))
        }

        private func toggleLine(_ prefix: String) {
            guard let tv = textView else { return }
            let (l, _) = selection()
            apply(MarkdownEdit.toggleLinePrefix(tv.text, location: l, prefix: prefix))
        }

        // MARK: - Hardware-keyboard actions (iPad)

        func boldSelection() { wrap("**", "**") }
        func italicSelection() { wrap("*", "*") }
        func codeSelection() { wrap("`", "`") }

        /// Re-align the GFM table the caret sits in. No-op if not in a table.
        func formatTableAtCaret() {
            guard let tv = textView else { return }
            let ns = tv.text as NSString
            let caret = min(tv.selectedRange.location, ns.length)
            let here = ns.lineRange(for: NSRange(location: caret, length: 0))
            var start = here.location
            var end = here.location + here.length
            while start > 0 {
                let prev = ns.lineRange(for: NSRange(location: start - 1, length: 0))
                if ns.substring(with: prev).contains("|") { start = prev.location } else { break }
            }
            while end < ns.length {
                let next = ns.lineRange(for: NSRange(location: end, length: 0))
                if ns.substring(with: next).contains("|") { end = next.location + next.length }
                else { break }
            }
            let blockRange = NSRange(location: start, length: end - start)
            let block = ns.substring(with: blockRange)
            let formatted = MarkdownTable.format(block)
            guard formatted != block else { return }
            let newText = ns.replacingCharacters(in: blockRange, with: formatted)
            tv.text = newText
            tv.selectedRange = NSRange(
                location: min(caret, (newText as NSString).length), length: 0)
            parentText.wrappedValue = newText
        }
    }
}

/// `UITextView` that adds Markdown hardware-keyboard shortcuts (⌘B / ⌘I / ⌘`)
/// routed to the editor coordinator, for iPad keyboard users.
final class MarkupTextView: UITextView {
    weak var editCoordinator: SourceEditorView.Coordinator?

    override var keyCommands: [UIKeyCommand]? {
        [
            UIKeyCommand(input: "b", modifierFlags: .command, action: #selector(cmdBold)),
            UIKeyCommand(input: "i", modifierFlags: .command, action: #selector(cmdItalic)),
            UIKeyCommand(input: "`", modifierFlags: .command, action: #selector(cmdCode)),
        ]
    }

    @objc private func cmdBold() { editCoordinator?.boldSelection() }
    @objc private func cmdItalic() { editCoordinator?.italicSelection() }
    @objc private func cmdCode() { editCoordinator?.codeSelection() }
}
