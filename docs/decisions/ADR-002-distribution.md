# ADR-002: 签名、公证与分发策略

- **状态**: 已批准（2026-05-10）
- **日期**: 2026-05-10
- **依据**: [research/03 §Apple Developer 部分](../research/03-mac-framework-comparison.md)

## 上下文

用户提供 Apple Developer 账号 `wangharp@gmail.com`。需要决定：
- 是否签名？怎么签？
- 是否公证？
- 是否上 Mac App Store？
- 是否启用 Sandbox？

不同档位的需求不一样，避免一开始就背上完整 App Store 合规负担。

## 三档需求

| 档位 | 谁能用 | 启动方式 | 需要做的工作 |
|------|--------|----------|--------------|
| **0. 自用 / 开发期** | 自己一台机 | `tauri dev` 或 ad-hoc 签 | 啥都不用做 |
| **1. 个人发布 / 朋友分享** | 任何 Mac，绕开"未识别开发者"警告 | 双击 DMG | Developer ID 签 + notarytool 公证 |
| **2. Mac App Store 上架** | 通过 App Store 安装 | App Store 下载 | Sandbox + Mac App 证书 + ASC 审核 |

## 决策

### 阶段 0–1：先做"档位 1"（Developer ID + 公证）

**理由**：
- 自用 + 偶尔分享给朋友的最低成本路径
- 不需要 Sandbox，避免 FS 访问权限的复杂度（Markdown 编辑器要读任意目录）
- 流程已经标准化，Tauri 内置 `tauri-action` GitHub Action 可一键完成

### 阶段 2：评估上不上 Mac App Store

如果需要：
- 加 Sandbox（用 Security-Scoped Bookmarks 处理用户授权的目录）
- 走 App Store Connect 审核
- 这部分推迟到 V1.0 后再决定

## 具体配置

### 证书

| 用途 | 证书类型 | 在哪生成 |
|------|----------|----------|
| 应用签名 | **Developer ID Application** | https://developer.apple.com/account → Certificates |
| 安装包签名 | **Developer ID Installer**（DMG/PKG） | 同上 |

下载 .cer 后双击导入"钥匙串访问"。

### Tauri 配置（`src-tauri/tauri.conf.json`）

```jsonc
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: <Name> (TEAMID)",
      "hardenedRuntime": true,
      "entitlements": "src-tauri/Entitlements.plist",
      "minimumSystemVersion": "12.0",
      "category": "public.app-category.productivity"
    }
  }
}
```

### Entitlements（最小集）

```xml
<key>com.apple.security.cs.disable-library-validation</key>
<true/>
<key>com.apple.security.cs.allow-jit</key>
<true/>  <!-- WKWebView JS 引擎需要 -->
```

不开 Sandbox（`com.apple.security.app-sandbox` 不设）→ 自由访问任意路径。

### 公证流程（首次设置后可全自动）

```bash
# 首次：把 App Store Connect API 密钥存到 keychain
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "wangharp@gmail.com" \
  --team-id "<TEAMID>" \
  --password "<app-specific-password>"

# 公证（Tauri 打包后执行；CI 可用 tauri-action 自动化）
xcrun notarytool submit \
  ./src-tauri/target/release/bundle/dmg/markup_<ver>_aarch64.dmg \
  --keychain-profile "AC_PASSWORD" --wait

# 加 staple（盖章，让首次启动可离线验证）
xcrun stapler staple ./src-tauri/target/release/bundle/dmg/markup_<ver>_aarch64.dmg
```

### 自动更新

用 Tauri 官方 [updater plugin](https://v2.tauri.app/plugin/updater/)：
- 静态托管 `latest.json` 到 GitHub Releases 或个人 S3
- App 启动后台检查更新
- 更新包必须签名（updater 会验证签名）

### 多架构

构建 universal binary：
```
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm tauri build --target universal-apple-darwin
```

Apple Silicon 优先；Intel 兼容（`x86_64`）保留以备旧机器。

## App Store 上架的预留接口

代码层面提前准备：
- 文件 IO 全部走 Tauri command 抽象（不直接写绝对路径），方便后期切到 SSB
- 设置项区分"自由路径模式"和"已授权目录模式"
- 不引入需要外部进程或动态库下载的功能（Apple 审核会拒）

## 风险

- **Apple ID 不是付费 Developer Program**：要先确认 wangharp@gmail.com 已加入 $99/年的 Apple Developer Program。如果没加入，只能 ad-hoc 签（仅本机能跑）。
  - **行动项**：开始前请用户确认 Developer Program 状态。
- **应用专用密码（app-specific password）需要在 https://appleid.apple.com 生成**，不是 Apple ID 主密码。
- **首次公证可能因 entitlements 不全或 Hardened Runtime 配置问题失败**：早期空壳 spike（ADR-001 §spike #4）就是为了暴露这类问题。

## 用户确认结果（2026-05-10）

1. ☑ Apple Developer Program 状态 — **已加入**
2. ☑ 走"档位 1（Developer ID + notarytool 公证）"，暂不上 App Store
3. ☑ 构建 target — **`x86_64-apple-darwin`**（开发机为 Intel MBP 16" / Core i7-9750H；自用为先；不构建 universal）。早先回答"仅 Apple Silicon"是基于硬件假设错误，环境检查后纠正
4. ☑ Bundle ID — `com.appkon.markup`
