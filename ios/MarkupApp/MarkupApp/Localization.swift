import Foundation
import Observation

/// In-app language choice (overrides the system language at runtime, no
/// restart needed). Persisted in UserDefaults.
enum AppLanguage: String, CaseIterable, Identifiable {
    case system, en, zh
    var id: String { rawValue }
}

/// Runtime-switchable EN/中文 strings. A tiny in-house table (the app has a
/// small, fixed string set) chosen over a String catalog so switching is
/// instant and observable, with no app relaunch — matching the desktop's
/// bilingual UX. `@Observable` so views re-render when the language changes.
@MainActor
@Observable
final class Localization {
    static let shared = Localization()
    private let key = "app.language"

    var language: AppLanguage {
        didSet { UserDefaults.standard.set(language.rawValue, forKey: key) }
    }

    init() {
        language = AppLanguage(
            rawValue: UserDefaults.standard.string(forKey: "app.language") ?? "") ?? .system
    }

    /// The effective language code ("en" or "zh") after resolving `.system`.
    private var code: String {
        switch language {
        case .en: return "en"
        case .zh: return "zh"
        case .system:
            return (Locale.preferredLanguages.first ?? "en").hasPrefix("zh") ? "zh" : "en"
        }
    }

    func callAsFunction(_ k: L) -> String { code == "zh" ? k.zh : k.en }
}

/// Convenience: `t(.settings)` reads `Localization.shared` (tracked by
/// Observation during a view body, so views update on language change).
@MainActor func t(_ k: L) -> String { Localization.shared(k) }

/// Every user-facing string, with its English and 中文 forms.
enum L {
    case settings, done, search, quickOpen, tags, outline, backlinks, openFolder
    case noMarkdownTitle, noMarkdownBody, openVault, openVaultBody, openAFolder
    case couldntRead, selectNote, selectNoteBody
    case jumpToFile, searchVaultPrompt, searchYourVault, noMatches, noTags, noHeadings, noBacklinks
    case read, edit, share, shareAsHTML, exportPDF, shareMarkdown, copyAsHTML, copyMarkdown
    case theme, textSize, larger, smaller, resetSize
    case conflictTitle, keepMine, reload, conflictBody
    case appearance, readerTheme, readingWidth, vault, folder, notes, index, ready, building, reindex
    case about, version, onGitHub, getMac, privacyLine, language, languageSystem
    case canvasTitle, canvasBody, nodesEdgesFmt
    case onboardTitle1, onboardBody1, onboardTitle2, onboardBody2
    case onboardTitle3, onboardBody3, onboardNext, onboardStart
    case enableScripts, disableScripts, desktopMode, mobileMode, lineSpacing
    case recents, favorites, noRecentsTitle, noRecentsBody, remove

    var en: String {
        switch self {
        case .settings: return "Settings"
        case .done: return "Done"
        case .search: return "Search"
        case .quickOpen: return "Quick Open"
        case .tags: return "Tags"
        case .outline: return "Outline"
        case .backlinks: return "Backlinks"
        case .openFolder: return "Open folder"
        case .noMarkdownTitle: return "No Markdown files"
        case .noMarkdownBody: return "This folder has no .md files."
        case .openVault: return "Open a vault"
        case .openVaultBody:
            return "Point Markup at a folder of Markdown files — the same one you use on your Mac, via iCloud Drive or Files."
        case .openAFolder: return "Open a Folder"
        case .couldntRead: return "Couldn't read file"
        case .selectNote: return "Select a note"
        case .selectNoteBody: return "Pick a file to read it here."
        case .jumpToFile: return "Jump to file"
        case .searchVaultPrompt: return "Search vault   (try tag:project, path:journal/)"
        case .searchYourVault: return "Search your vault"
        case .noMatches: return "No matches"
        case .noTags: return "No tags"
        case .noHeadings: return "No headings"
        case .noBacklinks: return "No backlinks"
        case .read: return "Read"
        case .edit: return "Edit"
        case .share: return "Share"
        case .shareAsHTML: return "Share as HTML"
        case .exportPDF: return "Export PDF"
        case .shareMarkdown: return "Share Markdown"
        case .copyAsHTML: return "Copy as HTML"
        case .copyMarkdown: return "Copy Markdown"
        case .theme: return "Theme"
        case .textSize: return "Text size"
        case .larger: return "Larger"
        case .smaller: return "Smaller"
        case .resetSize: return "Reset size"
        case .conflictTitle: return "This note changed on disk"
        case .keepMine: return "Keep mine"
        case .reload: return "Reload"
        case .conflictBody:
            return "It was modified elsewhere (e.g. iCloud sync) since you opened it."
        case .appearance: return "Appearance"
        case .readerTheme: return "Reader theme"
        case .readingWidth: return "Reading width"
        case .vault: return "Vault"
        case .folder: return "Folder"
        case .notes: return "Notes"
        case .index: return "Index"
        case .ready: return "Ready"
        case .building: return "Building…"
        case .reindex: return "Reindex"
        case .about: return "About"
        case .version: return "Version"
        case .onGitHub: return "Markup on GitHub"
        case .getMac: return "Get Markup for Mac"
        case .privacyLine: return "Private by default — no account, no telemetry."
        case .language: return "Language"
        case .languageSystem: return "System"
        case .canvasTitle: return "Canvas is a desktop feature"
        case .canvasBody:
            return "Open this file in Markup for Mac to view and edit it."
        case .nodesEdgesFmt: return "%d node(s) · %d edge(s)"
        case .onboardTitle1: return "Read your Markdown like a page"
        case .onboardBody1:
            return "Open a folder of notes and read them beautifully rendered — code, math, diagrams, tables."
        case .onboardTitle2: return "Bring your own folder"
        case .onboardBody2:
            return "Point Markup at an iCloud Drive or Files folder — the same vault you use on your Mac. Nothing to import."
        case .onboardTitle3: return "Private by default"
        case .onboardBody3: return "No account, no telemetry. Your notes stay on your device and your iCloud."
        case .onboardNext: return "Next"
        case .onboardStart: return "Open a Folder"
        case .enableScripts: return "Enable scripts"
        case .disableScripts: return "Disable scripts"
        case .desktopMode: return "Desktop layout"
        case .mobileMode: return "Mobile layout"
        case .lineSpacing: return "Line spacing"
        case .recents: return "Recents"
        case .favorites: return "Favorites"
        case .noRecentsTitle: return "No recent files"
        case .noRecentsBody: return "Files you open from other apps (Share → Markup) show up here."
        case .remove: return "Remove"
        }
    }

    var zh: String {
        switch self {
        case .settings: return "设置"
        case .done: return "完成"
        case .search: return "搜索"
        case .quickOpen: return "快速打开"
        case .tags: return "标签"
        case .outline: return "大纲"
        case .backlinks: return "反向链接"
        case .openFolder: return "打开文件夹"
        case .noMarkdownTitle: return "没有 Markdown 文件"
        case .noMarkdownBody: return "此文件夹没有 .md 文件。"
        case .openVault: return "打开仓库"
        case .openVaultBody:
            return "让 Markup 指向一个 Markdown 文件夹——通过 iCloud 云盘或「文件」，可与 Mac 端共用同一个。"
        case .openAFolder: return "打开文件夹"
        case .couldntRead: return "无法读取文件"
        case .selectNote: return "选择一篇笔记"
        case .selectNoteBody: return "选一个文件在此阅读。"
        case .jumpToFile: return "跳转到文件"
        case .searchVaultPrompt: return "搜索仓库（可用 tag:项目、path:journal/）"
        case .searchYourVault: return "搜索你的仓库"
        case .noMatches: return "无匹配结果"
        case .noTags: return "没有标签"
        case .noHeadings: return "没有标题"
        case .noBacklinks: return "没有反向链接"
        case .read: return "阅读"
        case .edit: return "编辑"
        case .share: return "分享"
        case .shareAsHTML: return "分享为 HTML"
        case .exportPDF: return "导出 PDF"
        case .shareMarkdown: return "分享 Markdown"
        case .copyAsHTML: return "复制为 HTML"
        case .copyMarkdown: return "复制 Markdown"
        case .theme: return "主题"
        case .textSize: return "字号"
        case .larger: return "增大"
        case .smaller: return "减小"
        case .resetSize: return "重置字号"
        case .conflictTitle: return "此笔记在磁盘上已变更"
        case .keepMine: return "保留我的"
        case .reload: return "重新载入"
        case .conflictBody: return "自你打开后，它在别处（如 iCloud 同步）被修改了。"
        case .appearance: return "外观"
        case .readerTheme: return "阅读主题"
        case .readingWidth: return "阅读宽度"
        case .vault: return "仓库"
        case .folder: return "文件夹"
        case .notes: return "笔记数"
        case .index: return "索引"
        case .ready: return "就绪"
        case .building: return "构建中…"
        case .reindex: return "重建索引"
        case .about: return "关于"
        case .version: return "版本"
        case .onGitHub: return "在 GitHub 上查看 Markup"
        case .getMac: return "获取 Mac 版 Markup"
        case .privacyLine: return "默认隐私——无账户、无遥测。"
        case .language: return "语言"
        case .languageSystem: return "跟随系统"
        case .canvasTitle: return "Canvas 是桌面端功能"
        case .canvasBody: return "请在 Mac 版 Markup 中打开此文件以查看和编辑。"
        case .nodesEdgesFmt: return "%d 个节点 · %d 条连线"
        case .onboardTitle1: return "像读一页纸那样读 Markdown"
        case .onboardBody1: return "打开一个笔记文件夹，精美渲染地阅读——代码、公式、图表、表格。"
        case .onboardTitle2: return "用你自己的文件夹"
        case .onboardBody2: return "让 Markup 指向 iCloud 云盘或「文件」中的文件夹——与 Mac 端共用同一个仓库,无需导入。"
        case .onboardTitle3: return "默认隐私"
        case .onboardBody3: return "无账户、无遥测。你的笔记只留在本机和你的 iCloud。"
        case .onboardNext: return "下一步"
        case .onboardStart: return "打开文件夹"
        case .enableScripts: return "启用脚本"
        case .disableScripts: return "停用脚本"
        case .desktopMode: return "桌面版式"
        case .mobileMode: return "移动版式"
        case .lineSpacing: return "行距"
        case .recents: return "最近打开"
        case .favorites: return "收藏"
        case .noRecentsTitle: return "没有最近文件"
        case .noRecentsBody: return "从其他 App 打开的文件（分享 → Markup）会出现在这里。"
        case .remove: return "移除"
        }
    }
}
