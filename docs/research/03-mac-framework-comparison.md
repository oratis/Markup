# MarkUp — macOS 桌面框架选型报告

**日期**: 2026-05-10
**作者**: 调研笔记（自用）
**项目背景**: MarkUp 是一个 Mac 上的开源 Typora 克隆，目标是"高性能的 Markdown 查看 + 管理"。
**用户画像**: 单人开发者；自用为主；可能开源给朋友试用；未来可能上 App Store；愿意学新东西但不想踩太多基础架构的坑。

---

## TL;DR — 结论先放这

> **二选一明确判断（A vs B）：选 A — Tauri 2.x。**
>
> 但是，如果你愿意承担 Swift/AppKit 的学习曲线（你提到了 Xcode），**长期来看 C 方案（SwiftUI + WKWebView + ProseMirror/Milkdown）才是 Mac 上最优解**。Typora 的真正竞品（Bear、iA Writer、Craft）都是原生的，不是偶然。
>
> - **要快速做出来、跨平台留余地** → A（Tauri 2.x）
> - **要做 Mac 上"最好的" Markdown 编辑器、能接受先慢后快** → C（SwiftUI + WKWebView）
> - **熟练但臃肿、生态最稳** → B（Electron）— 不推荐，因为你明确要"高性能"
> - **D（React Native macOS / Expo）** → 直接劝退，下面有解释

下面是详细对比和数据支撑。

---

## 方案 A: Tauri 2.x

### A.1 体积、内存、启动时间（vs Electron）

各路 2025-2026 基准给出的数字一致到惊人：

| 指标 | Tauri 2.0 | Electron 30+ | 差异 |
|---|---|---|---|
| 安装包体积（同款 Todo App） | ~12 MB | ~180 MB | -93% |
| 典型 bundle 范围 | < 10 MB | > 100 MB | 一个数量级 |
| 空闲内存（macOS） | ~30-40 MB | ~200-300 MB | -85% |
| 渲染进程内存（同窗口） | WKWebView | Chromium，约 2× 于 Tauri | -50% |
| 启动时间 | < 0.5s | 1-2s | 显著快 |

来源：tech-insider.org 2026 基准、PkgPulse 2026、gethopp.app 实测对比。

> 注意：「-93%」这种数字在 Hello World 上确实成立，但真实 App 加上前端框架（React + 编辑器内核 + 依赖）后，Tauri 包体也会到 20-50 MB，但仍远小于 Electron 的 150-300 MB。

### A.2 macOS 集成度

| 能力 | Tauri 2.x 支持情况 |
|---|---|
| 应用菜单栏 | 有 API（`tauri::menu`），可以用代码构建 NSMenu |
| 文件关联（`.md` 双击打开） | 通过 `bundle.macOS.fileAssociations` 配置 Info.plist UTI |
| Spotlight 索引 | **官方无原生支持**；社区有 [tauri-macos-spotlight-example](https://github.com/ahkohd/tauri-macos-spotlight-example) 但是把 App 做成 Spotlight 替代品的，不是被 Spotlight 索引 |
| QuickLook 预览扩展 | **基本不可行**：QuickLook 扩展必须是原生 macOS App Extension（Bundle Identifier 嵌入主 App、Sandbox 严格、Swift/ObjC 接口） |
| App Sandbox | 支持，需要写 `Entitlements.plist` 并在 `tauri.conf.json` 引用 |
| Notarization | 官方文档完备（见下） |
| 系统拖拽、剪贴板 | 支持 |
| Touch ID / Keychain | 需要自己写 Rust FFI 或找插件 |
| `NSDocument` 模型（脏标记、自动保存、Versions） | **不支持**：Tauri 没有 NSDocument 抽象，需要自己模拟 |

**关键缺失**：QuickLook 扩展和原生 NSDocument 的"自动保存 / Versions / 时光机集成" — 如果你想做"Mac 原生体验"，这两个是 Typora 都没做但 Bear/iA Writer 做了的差异化点。Tauri 这边基本告别。

### A.3 Apple 签名 / 公证流程成熟度

成熟度评级：**B+**（文档完备，但相对原生 Xcode 流程多一层）

[Tauri 2 macOS 签名文档](https://v2.tauri.app/distribute/sign/macos/) 给出的流程：

1. 装好 `Developer ID Application` 证书到 Keychain
2. 设环境变量：`APPLE_SIGNING_IDENTITY`、`APPLE_ID`、`APPLE_PASSWORD`（app-specific password），或 App Store Connect API Key 三件套
3. `tauri build` 自动签名 + 调 notarytool 公证 + staple

**已知坑**：
- 公证有时挂在 `notarytool submit` 上数小时无输出（[Issue #14579](https://github.com/tauri-apps/tauri/issues/14579), [Discussion #8630](https://github.com/orgs/tauri-apps/discussions/8630)）— 不是 Tauri 的锅，是 Apple 公证服务时不时抽风
- `ExternalBin`（嵌入二进制）的签名/公证有 bug（[Issue #11992](https://github.com/tauri-apps/tauri/issues/11992)）
- **免费 Apple ID 无法公证**：必须 $99/年的 Apple Developer Program

### A.4 Wry / WKWebView 还是别的？

**Tauri 在 macOS 上 100% 用 WKWebView**（通过 [Wry](https://github.com/tauri-apps/wry) 库统一封装）。没得选。这就引出几个真实问题：

#### 已知性能/稳定性问题（重点关注）

1. **macOS 13-15 的 WKWebView 锁 60fps**：`requestAnimationFrame` 被钉死在 60Hz，无视显示器实际刷新率。120Hz ProMotion 屏幕看动画依然只有 60Hz。[macOS 26 已修复](https://github.com/userFRM/tauri-plugin-macos-fps)。社区有 `tauri-plugin-macos-fps` 插件可以解开。
2. **macOS 上比 Windows 慢**：[Tauri Issue #11822](https://github.com/tauri-apps/tauri/issues/11822) — 一个笔记 App 开发者明确报告"复制 / 选中文本会非常卡"，Windows 上没事。
3. **窗口最小化/最大化后 WebView 尺寸卡住**：[Issue #14843](https://github.com/tauri-apps/tauri/issues/14843)，仍在跟进。
4. **macOS 26 上有崩溃**：[Wry Issue #1576](https://github.com/tauri-apps/wry/issues/1576)。
5. **Production build 网络被 sandbox 全部拦截**：[Issue #13878](https://github.com/tauri-apps/tauri/issues/13878) — dev 模式好好的，build 出来的 .app 自动更新和 reqwest 全废。需要在 Entitlements 里手动开 `com.apple.security.network.client`。

#### 对 Markdown 编辑器是否合适

**合适但不完美**。WKWebView 跑 ProseMirror / CodeMirror 6 / Milkdown / Lexical 都没问题，吞吐量足够。**但是**：
- 大文件（10MB+ 的 Markdown）：WebView 里跑 ProseMirror 会卡顿，原生方案这时候有优势
- 编辑器输入延迟：WebView 输入栈 > 原生 NSTextView 输入栈，对挑剔的写作者是可感知的差距
- 选择 / 拖拽 / 系统右键菜单：WKWebView 实现得不如原生，集成难度大

### A.5 类似开源项目（Tauri + Markdown）

| 项目 | 描述 | 状态 |
|---|---|---|
| [Moraya](https://github.com/zouwei/moraya) | Tauri 2 + Svelte，~10MB，AI Markdown，自动更新 | 活跃 |
| [Marko](https://github.com/SeanPedersen/Marko) | Tauri WYSIWYG Markdown 编辑器 | 活跃但小众 |
| AppFlowy | Notion-like，跨平台，Flutter UI 而非 Tauri，但有部分 Tauri 实验 | 大型项目 |

**关键发现**：**没有一个真正流行的 Markdown 编辑器是用 Tauri 做的**。Typora 是 Electron，Obsidian 是 Electron，Logseq 是 Electron（社区 2022 年讨论过迁移到 Tauri，[未完成](https://discuss.logseq.com/t/improve-performance-idea-swap-electron-for-tauri-and-sql-database/9105)）。这要么是机会，要么是警告 — 可能是因为 Tauri 上做不出对应 UX。

Tauri 跑得好的是**安全/系统类**应用：Spacedrive（文件管理）、Padloc（密码管理）、Hoppscotch。Markdown 编辑器是个偏 UX 的赛道，Tauri 没有现成的成功案例。

### A.6 学习曲线（前端 + Rust）

- **前端部分**：你已经熟，无成本（React + ProseMirror/Milkdown）
- **Rust 后端部分**：Tauri 的命令系统简单（`#[tauri::command]`），文件操作、SQLite、Markdown 解析都有现成的 crate（pulldown-cmark、comrak）
- **真实痛点**：前后端通信用 IPC（async + serde），调试不如纯 JS 直接。一个常见案例：你想在 Rust 端用 [`comrak`](https://crates.io/crates/comrak) 解析 Markdown 然后扔给前端渲染，要序列化 AST 过 IPC 桥，复杂结构会拖慢

总学习曲线：**中等**。如果不会 Rust，从零到能写出一个像样的 Tauri App 大概 2-4 周。

### A.7 分发

- **DMG**：开箱即用（`tauri build` 输出 .dmg）
- **自动更新**：内置 [updater](https://v2.tauri.app/plugin/updater/) 但功能很基础（无下载进度、无"稍后提醒"、需要服务端动态返回 JSON 而不能用静态托管）。社区有 [tauri-plugin-sparkle-updater](https://github.com/ahonn/tauri-plugin-sparkle-updater) 把 macOS 切到 Sparkle，但要桥接 Objective-C
- **TestFlight**：Tauri 支持上 App Store（[文档](https://v2.tauri.app/distribute/app-store/)），TestFlight 是 App Store 审核流程的一部分，理论可行但需要配 Sandbox、Provisioning Profile、Universal Build。门槛高

### A.8 已知问题汇总

- macOS 上 WebView 性能弱于 Windows（重大）
- ProMotion 60fps 限制（小重要，可绕）
- Production build sandbox 网络默认拦截（中重要，配置一次解决）
- 公证偶尔卡几小时（可接受）
- 自动更新功能简陋，需要插件或自建服务（中重要）
- Markdown 编辑器赛道没成功案例（信号）

---

## 方案 B: Electron

### B.1 数据指标

见上表。简而言之：体积大 10×，内存大 5-7×，启动慢 2-4×。Typora 装包 150 MB，运行 300+ MB 内存。这跟你"高性能"诉求**直接冲突**。

### B.2 macOS 集成度

跟 Tauri 类似的 web-shell 困境：菜单、文件关联可以；QuickLook、NSDocument、Spotlight 深度集成几乎不可能。

但 Electron 有一个 Tauri 没有的优势：**生态太成熟**，大部分坑都被 VSCode / Slack / 1Password 踩过了，Stack Overflow 答案现成。

### B.3 签名 / 公证

`electron-builder` 和 `electron-forge` 都集成了 [@electron/notarize](https://github.com/electron/notarize)，配置示例：

```json
"mac": {
  "hardenedRuntime": true,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist",
  "notarize": { "teamId": "ABC123" }
}
```

需要的核心 entitlements：`com.apple.security.cs.allow-jit`、`com.apple.security.cs.allow-unsigned-executable-memory`（V8 JIT 必须）。

成熟度评级：**A**。所有坑都有人踩过。

### B.4 自动更新

[electron-updater](https://www.electron.build/auto-update.html)（`electron-builder` 自带）功能完整：进度条、差分包、phased rollout。比 Tauri 的简单 updater 强很多。

### B.5 案例

VSCode、Obsidian、Slack、Discord、Notion、1Password、Figma（部分）。Typora 推测也是 Electron。**Markdown 编辑器赛道的霸主全在 Electron**，这是真实信号 — 写编辑器需要的能力（CodeMirror、Monaco、ProseMirror）在 Chromium 上跑得最稳。

### B.6 写 Markdown 编辑器是否合适

**最合适**。Obsidian、Typora 已经证明这条路。但代价是性能。

### B.7 已知问题

- 体积大、内存高 — 与"高性能"诉求矛盾
- 跟随 Chromium 的安全更新有维护成本
- 启动慢

---

## 方案 C: 原生 SwiftUI + AppKit + WKWebView

### C.1 总体定位

**最 Mac 化、性能最好、维护成本不一定最高、但学习曲线最陡**。

如果目标是"Mac 上最好的 Markdown 编辑器"（而不是"跨平台够用"），这是唯一的正确答案。Bear、iA Writer、Craft、Ulysses 全部是原生。

### C.2 架构设计建议

```
┌────────────────────────────────────────┐
│  SwiftUI 主窗口                         │
│  ┌──────────┬───────────────────────┐  │
│  │ Sidebar  │  WKWebView            │  │
│  │ NSOutline│  ├ ProseMirror or     │  │
│  │ View     │  │ Milkdown 编辑器    │  │
│  │ (文件树) │  └ JS bridge 双向通信  │  │
│  └──────────┴───────────────────────┘  │
└────────────────────────────────────────┘
       │
       ▼
  Swift 层：
  - swift-markdown 解析 / lint
  - SwiftData 文件索引（标题、tag、反向链接）
  - Security-Scoped Bookmarks 持久化文件夹访问
  - FileSystemEvents 监听文件变化
  - NSDocument 自动保存 / Versions
```

### C.3 关键技术点

#### WKWebView 加载 ProseMirror / Milkdown

完全可行，且有成熟先例：
- [MarkupEditor](https://github.com/stevengharris/MarkupEditor)（SwiftUI + WKWebView + ProseMirror）已经在做这事，证明架构合理 — ProseMirror 让 JS 代码从 11000 行降到 3000 行
- [Milkdown](https://milkdown.dev/) 本身就是 ProseMirror + Remark，可以直接通过 `WKWebView.loadHTMLString` 加载本地 HTML 包
- WebView 跟 Swift 通信：`WKScriptMessageHandler`（JS → Swift）+ `evaluateJavaScript` (Swift → JS)

#### swift-markdown

[swift-markdown](https://github.com/swiftlang/swift-markdown)（Apple 官方，基于 cmark-gfm）：
- 性能：cmark 系比 Markdown.pl 快 10000×，比绝大部分 Pure Swift 实现快
- API：immutable / persistent value types，线程安全
- 用途：解析 / lint / outline 提取 / 全文搜索的 token 化，**不用于渲染**（渲染交给 WebView 里的 ProseMirror）

#### 文件树：NSOutlineView vs SwiftUI OutlineGroup

- **SwiftUI `OutlineGroup`**：API 简单，但是大目录（10000+ 节点）卡顿明显，键盘导航、拖拽、右键菜单不够 Mac 化
- **NSOutlineView（通过 `NSViewRepresentable`）**：性能强、Mac 习惯一致；推荐 [Sameesunkaria/OutlineView](https://github.com/Sameesunkaria/OutlineView) 这类封装
- **结论**：用 NSOutlineView。Typora 的文件面板手感糟糕，是个差异化机会

#### Security-Scoped Bookmarks

App Sandbox 下打开"我的笔记文件夹"后，下次启动需要这玩意才能继续访问。流程：
1. `NSOpenPanel` 选文件夹 → 获得 URL
2. `URL.bookmarkData(options: .withSecurityScope)` → 持久化到 SwiftData / UserDefaults
3. 下次启动 `URL(resolvingBookmarkData:options: .withSecurityScope)` → 还原
4. 访问前 `startAccessingSecurityScopedResource()`，结束后 `stopAccessing...()`

这是 Mac App Sandbox 的"必修课"，配套博客很多（如 [SwiftLee 的总结](https://www.avanderlee.com/swift/security-scoped-bookmarks-for-url-access/)）。

#### SwiftData / Core Data 索引

- SwiftData（iOS 17+ / macOS 14+）：声明式，写起来舒服，做"文件路径 ⇄ 标题/标签/反向链接"的索引很合适
- Core Data：成熟、文档全、但 API 繁琐
- 对 Markdown 编辑器的索引规模（1 万 - 10 万文档），SwiftData 完全够用

### C.4 SwiftUI WebView vs AppKit WebView

macOS 14 起 SwiftUI 提供 `WebView`（封装 WKWebView），但**API 仍然弱**：消息传递、配置、自定义 user agent 等高级功能要么没暴露，要么要 fallback 到 `NSViewRepresentable + WKWebView`。

**结论**：直接用 `NSViewRepresentable` 包 `WKWebView`，不要碰 SwiftUI 那个简化的 WebView。控制力差太多。

### C.5 学习曲线

| 你已会 | 你需要学 |
|---|---|
| React / TS | Swift 语法 + 闭包风格 |
| 前端编辑器 | SwiftUI declarative + AppKit interop |
| HTML/CSS | NSViewRepresentable / NSWindow lifecycle |
| 一般工程 | App Sandbox / Entitlements / Bookmarks |
| | NSDocument 模型（如果想要 Versions） |
| | Swift Concurrency (async/await + actors) |

预估时间：**从零到能跑一个像样原型 1-2 个月**。但是一旦上路，迭代速度会逐渐反超 Tauri（因为 macOS API 直接调，不需要 IPC 桥）。

### C.6 维护成本

- 跟 Apple 平台版本走，每年 macOS 大版本可能要适配
- 单平台 = 不需要管 Linux / Windows 的 WebView 差异
- 长期维护成本**实际比 Tauri 更低**（没有 Rust 编译时间、没有 Wry 第三方依赖、没有 IPC 调试）

### C.7 trade-off

- 优点：性能最好、最 Mac 化、可用 NSDocument / QuickLook / Spotlight / Sandbox 全套、未来可上 App Store、维护轻
- 缺点：不跨平台、需要学 Swift / AppKit、初期慢
- 如果这是个"自用 + 开源给朋友"的项目，朋友 90% 是 Mac 用户的话，跨平台**没那么重要**

---

## 方案 D: React Native macOS / Expo（劝退）

### 事实澄清

- **Expo ≠ macOS 桌面框架**。Expo 是 React Native 的工具链，主要面向 iOS/Android。[Expo 官方讨论](https://github.com/expo/expo/discussions/22273) 长期表示"暂无 Windows/macOS 计划"
- **React Native macOS** 是 Microsoft 的 fork（[microsoft/react-native-macos](https://github.com/microsoft/react-native-macos)），独立 release cadence，落后 RN 主线 1-2 个版本

### 为什么不适合做 Markdown 编辑器

1. **它是 mobile-first 工具，桌面是二等公民**：很多 mobile API 在桌面没有等价物，文档自己说"contributions welcomed"（= 没人写）
2. **没有像样的 WebView 集成**：WKWebView 桥接要自己写 native module，做 ProseMirror 体验比 Tauri 还麻烦
3. **生态：除了微软自家产品（VSCode 部分 / Office 部分实验），没有公开的成功 Markdown 编辑器案例**
4. **跟 SwiftUI / AppKit 互操作非常痛苦**：要做 NSOutlineView、NSDocument 还是要写 Swift / Obj-C bridge，相当于既写 RN 又写原生
5. **签名 / 公证：跟 Xcode 绕一圈，比 Tauri 还麻烦**

### 唯一合理的场景

你已经有 React Native 的 iOS / Android App，想"顺手"出个 macOS 版本，UI 重用 90% — 这才用 RN macOS。从零做 Markdown 编辑器没有任何理由选它。

**结论：直接劝退**。Expo 与桌面无关；React Native macOS 不适合纯桌面 Markdown 编辑器。

---

## Apple Developer 账号 / 分发流程

### 三档需求

| 场景 | 需要什么 | 成本 |
|---|---|---|
| **A. 纯自用** | 关掉 Gatekeeper（不推荐）；或者 ad-hoc 自签名（每次开机要 `xattr -d com.apple.quarantine`） | $0 |
| **B. 给朋友试用 / 开源分发** | Apple Developer Program（个人账号 $99/年）+ Developer ID Application 证书 + Notarization | $99/年 |
| **C. 上 App Store** | 同 B + Apple Distribution 证书 + App Sandbox（强制）+ 完整 Provisioning Profile + App Review | $99/年 + 审核时间 |

[Apple Developer Program 官方](https://developer.apple.com/programs/) 个人账号现在仍然是 $99/年（人民币 688）。`wangharp@gmail.com` 用个人 Apple ID 注册即可，不需要公司。

### 证书类型对照

| 证书 | 用途 | 是否需要公证 |
|---|---|---|
| **Apple Development** | 开发期签名 | 否（仅本机/TestFlight） |
| **Developer ID Application** | App Store 之外分发（DMG / 自托管） | **是** |
| **Apple Distribution** | App Store 上架 | 否（App Store 替你公证） |
| **Mac Installer Distribution** | App Store 上架的 .pkg | 否 |

### 公证流程（命令行）

现代流程已统一到 `notarytool`（旧的 `altool` 已弃用）：

```bash
# 一次性：把凭证存到 Keychain
xcrun notarytool store-credentials "MarkUp-Notary" \
  --apple-id "wangharp@gmail.com" \
  --team-id "TEAMID" \
  --password "app-specific-pwd"

# 每次构建后
codesign --deep --force --options runtime --timestamp \
  --sign "Developer ID Application: Your Name" MarkUp.app
ditto -c -k --keepParent MarkUp.app MarkUp.zip
xcrun notarytool submit MarkUp.zip --keychain-profile "MarkUp-Notary" --wait
xcrun stapler staple MarkUp.app   # ← 关键：让 App 离线也能验证
```

**App-specific password** 在 [appleid.apple.com](https://appleid.apple.com/) 生成，不是你的 Apple ID 主密码。

### Sandbox / Hardened Runtime / Entitlements 选择

| 模式 | 何时用 |
|---|---|
| **Hardened Runtime（必）** | 公证强制要求，所有要分发的 App 都要开 |
| **App Sandbox（看场景）** | App Store 强制；DMG 分发可不开。Markdown 编辑器要访问任意文件夹，开 Sandbox 就必须用 Security-Scoped Bookmarks 或 `com.apple.security.files.user-selected.read-write` |

对你这个项目，**先 Hardened Runtime + 不 Sandbox**（DMG 直接分发），等要上 App Store 再加 Sandbox。

### Xcode 自动签名 vs 命令行签名

- **Xcode 自动签名**：开 "Automatically manage signing"，Xcode 帮你管 Provisioning Profile、自动更新证书。**只对 SwiftUI/AppKit 项目（方案 C）有用**
- **命令行签名**：Tauri / Electron 项目自动用，证书装 Keychain，CI 里走环境变量

如果你选 C（原生），开 Xcode 自动签名，省一半烦恼。如果选 A/B，老老实实写 CI script。

---

## 最终建议（基于你的画像）

> 自用 + Mac + 高性能 + Markdown 编辑器 + 愿意学新东西但不想踩太多坑 + 未来可能开源

### 决策树

```
你时间预算 < 1 个月想跑起原型？
├─ 是 → 选 A (Tauri 2.x)
└─ 否 → 你愿意学 Swift/AppKit 吗？
        ├─ 愿意 → 选 C (SwiftUI + WKWebView + Milkdown)  ← 真正的最优
        └─ 不愿意 → 选 A (Tauri 2.x)
```

### 推荐路径：**A → C 渐进**

1. **第一阶段（0-2 个月）**：用 Tauri 2.x + React + Milkdown，快速做出可用的 MVP，自用先跑起来。验证你对"理想 Markdown 编辑器"的需求假设
2. **第二阶段（如果你真心想做下去）**：等需求收敛、UX 想清楚之后，**用 Swift 重写 native 版**。这时候你不是从零开始 — 编辑器内核（Milkdown）可以连皮带骨拿过来塞进 WKWebView，真正要重写的只是 shell（窗口、文件树、设置、菜单、文件 IO）

这条路绕一圈，但避免了"想清楚之前过早投入 Swift 学习成本"和"想清楚之后被 Tauri 性能拖死"两头不讨好的局面。

### 如果只能选一个，二选一明确判断

- **A vs B → 选 A（Tauri）**。B 的体积/内存与"高性能"目标直接冲突，且 Markdown 编辑器赛道 Electron 的霸主地位主要靠生态，不靠技术。Tauri 在 Markdown 赛道无明星案例本身既是风险也是机会
- **A vs C → 短期 A，长期 C**。如果你只做一次决定不再变，且 mac-only 没有跨平台压力 → 直接 C

### Trade-off 一览

| | A: Tauri | B: Electron | C: SwiftUI 原生 | D: RN macOS |
|---|---|---|---|---|
| 性能 | ★★★★ | ★★ | ★★★★★ | ★★★ |
| 体积 | ★★★★★ | ★ | ★★★★★ | ★★★ |
| 启动速度 | 学习曲线低，前端复用 | 最低，生态最熟 | 最陡，但收益最大 | 比 C 还痛苦 |
| Mac 原生体验 | ★★ | ★★ | ★★★★★ | ★★ |
| 跨平台 | ★★★★ | ★★★★★ | ★ (mac-only) | ★★★ |
| Markdown 赛道案例 | 几乎无 | 全部主流 | Bear/iA Writer/Ulysses | 无 |
| 上 App Store | 难 | 难 | 顺 | 难 |
| 自动更新 | 需要 Sparkle 插件 | electron-updater 完整 | Sparkle 原生 | 麻烦 |
| 适合你的程度 | ★★★★（短期最优） | ★★ | ★★★★★（长期最优） | ★ |

---

## 关键参考链接

### Tauri
- [Tauri 2 macOS Code Signing](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri 2 macOS Application Bundle](https://v2.tauri.app/distribute/macos-application-bundle/)
- [Tauri 2 Updater Plugin](https://v2.tauri.app/plugin/updater/)
- [Tauri Performance on macOS Issue #11822](https://github.com/tauri-apps/tauri/issues/11822)
- [Wry (WebView lib)](https://github.com/tauri-apps/wry)
- [tauri-plugin-sparkle-updater](https://github.com/ahonn/tauri-plugin-sparkle-updater)
- [Awesome Tauri](https://github.com/tauri-apps/awesome-tauri)

### Electron
- [@electron/notarize](https://github.com/electron/notarize)
- [electron-builder code signing](https://www.electron.build/code-signing-mac.html)

### SwiftUI / Native
- [swift-markdown](https://github.com/swiftlang/swift-markdown)
- [MarkupEditor (SwiftUI + WKWebView + ProseMirror)](https://github.com/stevengharris/MarkupEditor)
- [Milkdown](https://github.com/Milkdown/milkdown)
- [Sameesunkaria/OutlineView](https://github.com/Sameesunkaria/OutlineView)
- [Security-Scoped Bookmarks (SwiftLee)](https://www.avanderlee.com/swift/security-scoped-bookmarks-for-url-access/)
- [Sparkle Project](https://sparkle-project.org/)

### React Native macOS
- [microsoft/react-native-macos](https://github.com/microsoft/react-native-macos)
- [Expo desktop discussion](https://github.com/expo/expo/discussions/22273)

### Apple Developer
- [Apple Developer Program](https://developer.apple.com/programs/)
- [Membership Comparison](https://developer.apple.com/support/compare-memberships/)
- [notarytool man page](https://keith.github.io/xcode-man-pages/notarytool.1.html)

### Benchmarks
- [Tauri vs Electron 2026 (PkgPulse)](https://www.pkgpulse.com/blog/electron-vs-tauri-2026)
- [tech-insider 2026 benchmark](https://tech-insider.org/tauri-vs-electron-2026/)
- [gethopp.app real-world comparison](https://www.gethopp.app/blog/tauri-vs-electron)
