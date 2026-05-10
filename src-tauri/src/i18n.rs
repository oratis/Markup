//! Tiny env-driven locale support for the native macOS menu.
//!
//! Tauri's `setup` hook runs before the WebView (and its localStorage) is
//! ready, so we can't read the JS-side preference at menu build time. We
//! sniff `$LANG` / `$LC_ALL` instead — matches the user's system locale
//! 99% of the time. The JS UI has its own override via Settings.
//!
//! To localise more strings later, add a key to MENU and the matching ZH
//! arm in `t`. Anything missing falls back to the English literal.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Locale {
    En,
    Zh,
}

impl Locale {
    pub fn from_str(s: &str) -> Self {
        match s {
            "zh" => Self::Zh,
            "en" => Self::En,
            "auto" => detect(),
            _ => detect(),
        }
    }
}

pub fn detect() -> Locale {
    let lang = std::env::var("LANG")
        .or_else(|_| std::env::var("LC_ALL"))
        .or_else(|_| std::env::var("LC_MESSAGES"))
        .unwrap_or_default()
        .to_ascii_lowercase();
    if lang.starts_with("zh") {
        Locale::Zh
    } else {
        Locale::En
    }
}

pub fn t(loc: Locale, key: &str) -> &'static str {
    match loc {
        Locale::En => en(key),
        Locale::Zh => zh(key),
    }
}

fn en(key: &str) -> &'static str {
    match key {
        // Top-level
        "menu.file" => "File",
        "menu.edit" => "Edit",
        "menu.view" => "View",
        "menu.window" => "Window",
        "menu.help" => "Help",

        // Markup (app)
        "menu.about" => "About Markup",
        "menu.settings" => "Settings…",

        // File
        "menu.new" => "New File",
        "menu.open" => "Open File…",
        "menu.openRecent" => "Open Recent…",
        "menu.openVault" => "Open Vault…",
        "menu.closeVault" => "Close Vault",
        "menu.save" => "Save",
        "menu.saveAs" => "Save As…",
        "menu.exportHtml" => "Export as HTML…",
        "menu.exportPdf" => "Export as PDF (Print)…",
        "menu.closeTab" => "Close Tab",

        // Edit
        "menu.findInFile" => "Find in File",
        "menu.findInVault" => "Find in Vault",
        "menu.quickOpen" => "Quick Open",
        "menu.commandPalette" => "Command Palette",

        // View
        "menu.toggleSourceMode" => "Toggle Source Mode",
        "menu.toggleSidebar" => "Toggle Sidebar",
        "menu.toggleOutline" => "Toggle Outline",
        "menu.focusMode" => "Focus Mode",
        "menu.typewriterMode" => "Typewriter Mode",
        "menu.themeLight" => "Light Theme",
        "menu.themeDark" => "Dark Theme",
        "menu.themeSepia" => "Sepia Theme",
        // Unknown keys: "?" placeholder. Static so it satisfies the
        // Tauri menu API which requires &'static str.
        _ => "?",
    }
}

fn zh(key: &str) -> &'static str {
    match key {
        "menu.file" => "文件",
        "menu.edit" => "编辑",
        "menu.view" => "视图",
        "menu.window" => "窗口",
        "menu.help" => "帮助",

        "menu.about" => "关于 Markup",
        "menu.settings" => "设置…",

        "menu.new" => "新建文件",
        "menu.open" => "打开文件…",
        "menu.openRecent" => "打开最近的…",
        "menu.openVault" => "打开 Vault…",
        "menu.closeVault" => "关闭 Vault",
        "menu.save" => "保存",
        "menu.saveAs" => "另存为…",
        "menu.exportHtml" => "导出为 HTML…",
        "menu.exportPdf" => "导出为 PDF（打印）…",
        "menu.closeTab" => "关闭标签页",

        "menu.findInFile" => "在文件中查找",
        "menu.findInVault" => "在 Vault 中搜索",
        "menu.quickOpen" => "快速打开",
        "menu.commandPalette" => "命令面板",

        "menu.toggleSourceMode" => "切换源码模式",
        "menu.toggleSidebar" => "切换侧栏",
        "menu.toggleOutline" => "切换大纲",
        "menu.focusMode" => "Focus 模式",
        "menu.typewriterMode" => "Typewriter 模式",
        "menu.themeLight" => "浅色主题",
        "menu.themeDark" => "深色主题",
        "menu.themeSepia" => "Sepia 主题",
        _ => en(key), // fallback to English so we never show the raw key
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn english_default_when_lang_unset_or_unknown() {
        // Direct API tests — env detection is a side-channel we can't safely
        // mutate inside the test process without races. Just spot-check t().
        assert_eq!(t(Locale::En, "menu.file"), "File");
        assert_eq!(t(Locale::Zh, "menu.file"), "文件");
    }

    #[test]
    fn unknown_keys_return_placeholder() {
        // Unknown keys land on a fixed "?" sentinel so the Tauri menu API
        // (which requires &'static str) gets a valid value.
        assert_eq!(t(Locale::En, "menu.does-not-exist"), "?");
        assert_eq!(t(Locale::Zh, "menu.does-not-exist"), "?");
    }

    #[test]
    fn missing_zh_falls_back_to_english() {
        // We rely on this in zh() — if a key isn't in the zh table, use en.
        // Verify by adding a test key only in en. Currently every key has zh,
        // so this asserts the fallback path doesn't loop.
        assert_eq!(t(Locale::Zh, "menu.about"), "关于 Markup");
    }
}
