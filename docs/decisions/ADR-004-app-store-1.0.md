# ADR-004: 1.0 双端上架 App Store（iOS + Mac App Store）

- **状态**: 已批准（2026-06-14）
- **日期**: 2026-06-14
- **关系**: 取代 [ADR-003](./ADR-003-positioning-and-distribution.md) 第 3 条（"1.0 走直分发优先，MAS 推迟为 1.0 后增量"）的**分发时序**部分。ADR-003 的产品定位（阅读器优先 × 知识库、GitHub 主打叙事）继续有效。

## 上下文

ADR-003（2026-06-10）当时决定 1.0 仅以直分发 DMG 发布，把 Mac App Store 推迟到 1.0 之后，理由是不让账号/审核流程阻塞 1.0。

此后情况变化：

- iOS 已在 TestFlight 稳定迭代（最新 0.2.10 / build 2100），App Store 提交侧仅剩账号操作（截图、列表、提交审核），二进制流水线（EAS → App Store Connect）已验证。
- 桌面端 MAS 脚手架已全部就绪并经沙箱验证：`src-tauri/tauri.mas.conf.json`、`Entitlements.mas.plist`、`scripts/build-mas.sh`、CI 的 `mas` job、持久化安全作用域书签（`tauri-plugin-persisted-scope`），更新器在 MAS 构建中编译关闭。
- 直分发 DMG（已签名公证 + 自动更新）已稳定运行多个版本，可与 MAS 并存。

用户决定：1.0 同时上架 **iOS App Store 与 Mac App Store**，不再推迟 MAS。

## 决策

1. **1.0 双端同时上架 App Store**：iOS 与 macOS 均以 1.0.0 提交各自的 App Store。直分发 DMG 渠道**继续保留**——MAS 与直分发并行，互不取代。
2. **版本统一为 1.0.0**：iOS（`MARKETING_VERSION` 1.0.0 / build 100000）与桌面（`package.json` / `tauri.conf.json` / `Cargo.toml` 均 1.0.0）在 1.0 公开发布里程碑对齐；此后两端各自按 SemVer 独立演进。
3. 据此，**ADR-003 第 3 条"MAS 推迟"作废**；其余条款（定位、GitHub 主打）不变。

## 后果

- **正面**：双端同时获得 App Store 触达；MAS 代码债为零（早已就绪）。
- **代价**：1.0 发布新增账号侧关键路径——MAS 需要 App ID（启用 App Sandbox）、Apple Distribution + Mac Installer Distribution 两张证书、Mac App Store Provisioning Profile，以及 GitHub 的 `MAS_*` secrets；两端都需各自的 App Store Connect 列表与截图。逐项见 [docs/app-store/launch-1.0-checklist.md](../app-store/launch-1.0-checklist.md)。
- **可逆性**：分发是叠加式选择，保留直分发 DMG；若 MAS 审核受阻，不影响 iOS 与直分发渠道。

## 用户确认结果（2026-06-14）

用户指示"开始准备 iOS 和 Mac 版都上架 App Store"，并在两项上明确确认：版本号（两端 1.0.0）、MAS 时序（与 iOS 并行，覆盖 ADR-003）。
