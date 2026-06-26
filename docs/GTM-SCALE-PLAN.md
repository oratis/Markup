# Markup — GTM Scale Plan（目标：10,000 GitHub ★ + 10,000 日活）

> 这份文档把目标从"发射并积累 star"（见 [GTM-LAUNCH-PLAN.md](./GTM-LAUNCH-PLAN.md)，目标 1–3K★）
> 升级为 **10K★ + 10K DAU** 的规模化增长规划。它**取代**旧 plan 作为主增长文档；
> 旧 plan 的发射素材（HN/PH/sspai 文案、awesome-list 表）仍然有效，作为 Phase 0 的弹药。
> 工程发布机制见 [RELEASE-PLAN.md](./RELEASE-PLAN.md)；产品定位见 [PRODUCT-DIRECTION.md](./PRODUCT-DIRECTION.md)。
>
> 制定日期：2026-06-27 · 起点：8★ / DAU 不可测 / v1.0.1 已发布

---

## 0. 一句话结论（先读这段）

1. **现状不是产品问题，是"子弹上了膛却没扣扳机"。** 1.0 已签名公证、iOS/iPad/MAS 已提审、hero GIF / 发布视频 / 各渠道文案 / 10 个 awesome-list PR 全部就绪 —— 但 **Show HN / Product Hunt / 少数派 这三发主弹从未打出去**。8★ 是"没发射"的结果，不是"发射失败"。
2. **10K★ 可达，但前提是跨平台（Windows/Linux）。** 同梯队的 Markdown/笔记开源项目——Zettlr 13K、Mark Text 58K、Joplin 55K、Logseq 44K、AppFlowy 73K——**无一例外全平台**。10K★ 俱乐部里**没有一个 macOS-only 的 Markdown 编辑器**。macOS-only 的现实天花板约 **2–5K**（MacDown 量级）。
3. **10K DAU 是更难的那个目标，而且今天根本无法测量**（卖点就是"无遥测"）。需要四件事同时成立：移动端放量、跨平台桌面、"原生读任意 GitHub 仓库文档"这个高频杀手场景、以及一套**不破坏隐私承诺的计数办法**。
4. **三个必须下的注：** ① 把已就绪的发射**真正打完**（Phase 0，零新增工程，最高 ROI）；② **上 Windows/Linux**（TAM 总闸）；③ 把**"原生 GitHub 文档阅读器"做成病毒级 hero + 可测量的 DAU 引擎**。

> **需要你拍板的一个分叉**（详见 §3 解锁二）：要 10K/10K，跨平台是**非选项**。
> 若坚持 Apple-only，请把现实目标改写为 **~3–5K★ / ~3–5K DAU**——依然是很好的结果，但不是 10K。

---

## 1. 现状盘点（地基）

| 维度 | 状态 |
|---|---|
| **产品** | v1.0.1：macOS DMG 已签名+公证+自更新；功能完备（reader-first、vault、双链、图谱、Tantivy 全文搜索、Obsidian 兼容 Canvas、**GitHub 双向 round-trip**、高保真 HTML/PDF 导出） |
| **分发** | macOS 直分发 ✓ · Mac App Store 已提审 · iOS/iPad 已提审 · **Windows/Linux 未构建** |
| **营销弹药** | hero GIF ✓ · 社交卡片 ✓ · 37s 发布视频 ✓ · HN/PH/sspai/V2EX/Reddit 文案 ✓ · 10 个 awesome-list PR（1 已合）✓ —— **全部就绪，尚未发射** |
| **指标** | **8★** · ~780 unique cloner（多为 CI）· **DAU 不可测**（无埋点） |

**结论：这是一个分发/执行问题，不是产品问题。** 这是难得的好位置——产品债已还清，增长完全取决于发射与放量。

---

## 2. 两个目标的漏斗拆解（讲清楚要喂多少输入）

### 2a. Star 漏斗——10K 从哪来

实测基准（来源见 §附录）：
- **front-page Show HN ≈ 500–2,000★ / 48h**；约 **1.4★/upvote**；92% 的影响在 48h 内结束（半衰期 24h）。
- 一次"打爆"的 HN ≈ **1–2K★** 的脉冲。PH top-5 ≈ 几百。少数派 feature ≈ 几百 + 一批中国开发者。

所以 **10K 不是单次发射能给的**，它是：

```
   一次主发射脉冲(HN+PH+sspai 同周)         ≈ 1.5–3K  ★（Phase 0）
 + awesome-lists / AlternativeTo 长尾持续导流  ≈ 1–2K   ★（复利，常年）
 + 跨平台重新打开 Linux/Windows 星海           ≈ 2–4K   ★（解锁二）
 + 内容飞轮(build-in-public/对比页/SEO)+持续发版 ≈ 2–4K   ★（解锁三+§7）
 ───────────────────────────────────────────────────────────
   12 个月 10K★                                  ← 现实但进取
```

**关键基准表（这是整份 plan 最硬的一张牌）：**

| 项目 | ★ | 平台 | 备注 |
|---|---:|---|---|
| AppFlowy | 73K | mac/win/linux/iOS/安卓 | 全平台含移动 |
| AFFiNE | 70K | 全平台 | 全平台含移动 |
| Mark Text | 58K | mac/win/linux | **最接近的"免费 Typora WYSIWYG"对标**；已停维护 |
| Joplin | 55K | 全平台含移动 | |
| SiYuan | 45K | 全平台含移动 | 中文系 |
| Logseq | 44K | mac/win/linux(+移动) | |
| Spacedrive | 38K | **Tauri/Rust 全平台** | 非 md，但 Tauri TAM 参照 |
| Trilium | 37K | 桌面/服务端 | |
| super-productivity | 20K | web/桌面 | |
| **Zettlr** | **13K** | **mac/win/linux** | **"做成了"梯队的地板，仍是跨平台** |
| MacDown | ~9K | **macOS-only** | 跑了十年的 macOS-only 天花板参照 |

> **唯一的结论**：10K+ 俱乐部里没有 macOS-only 的 md 编辑器。跨平台是入场券。

### 2b. DAU 漏斗——10K 需要多大的盘子

用显式假设建模（不是精确预测，是数量级）：

```
目标 DAU                         = 10,000
÷ DAU/MAU 黏性(每日打开的工具≈0.30)  → MAU      ≈ 33,000
÷ 装机→月活留存(免费效率工具≈0.22)   → 活跃装机  ≈ 150,000
× 下载→活跃装机的衰减(≈0.3–0.4)      → 累计下载  ≈ 400K–700K
```

**含义：** 10K DAU 本质是**盘子（TAM）× 黏性 × 可测量**的问题。这个量级 macOS 直分发单独喂不饱，必须靠：
- **移动端**（iOS/iPad App Store 搜索是巨大的免费 top-of-funnel）
- **跨平台桌面**（Win/Linux）
- **高频使用钩子**（"每天读 repo 文档/笔记"——见解锁三）

**而且有个悖论：卖点是"无遥测"，所以今天 DAU = 0 可见。** 没有计数，"10K DAU"无法证明也无法优化。§8 给出不破坏隐私承诺的解法。

---

## 3. 三个战略解锁（非做不可）

### 解锁一 · 把已上膛的发射打出去（0 新增工程，ROI 最高）

最大的一个解锁**不花一行代码**：所有素材就绪、却从未发射。要做的只是**按正确节奏扣扳机**：

- **软发射 → 主脉冲** 两段式（先低风险攒底+收反馈，再同周打 HN+PH+sspai 让交叉流量叠加）。
- 发射当天**在场 3–4 小时**逐条回帖（HN 的转化高度依赖 maker 在场）。
- 这是 **Week 1** 的事，文案在 [LAUNCH-POSTS.md](./LAUNCH-POSTS.md) 已 paste-ready。

### 解锁二 · 跨平台 Windows/Linux（TAM 总闸）⚠️ 需你拍板

- **技术上几乎免费**：Tauri 天生跨平台，代码里已有 `cfg(not(target_os = "macos"))` 回退；现在 bundle targets 只配了 `["dmg","app"]`。
- **为什么是 THE lever**：开发者星海在 Linux/Windows；§2a 每个 10K+ 竞品都全平台；"macOS only"四个字直接劝退一半 star 来源，并把 DAU 天花板焊死。
- **成本/风险**（要排一个"跨平台 hardening"里程碑承接）：文件监听/路径差异、中文 IME 在 WebView2/WebKitGTK 的表现、各 OS 签名（Windows 代码签名证书、Linux AppImage/deb/flatpak）、渲染差异回归。
- **决策**：要 10K/10K ⇒ 跨平台是非选项。坚持 Apple-only ⇒ 目标降为 3–5K★/3–5K DAU。

### 解锁三 · 独占"原生 GitHub 文档阅读器"（病毒 + 高频 + 可测量）

这是产品里**唯一竞品学不像**的姿态（[PRODUCT-DIRECTION.md](./PRODUCT-DIRECTION.md) 已锚定）。把它最大化成三个增长资产：

1. **Hero 病毒 demo**：「在手机/Mac 上，原生、离线、漂亮地读**任意** GitHub 仓库的 docs/README/wiki」——一条 30s 视频的爆款素材（开发者通勤读源码文档的场景从没被好好满足过）。
2. **高频 DAU 钩子**：开发者每天读 repo 文档；移动端把"读一整套 docs"变成随身场景 = 天然日活。
3. **可分享 artifact = 获客回路**：一键 Preview/Export HTML 已经存在；**进一步**考虑一个 web 渲染端点
   `markup.app/gh/<owner>/<repo>/<path>` —— 把任意 repo 的 md 渲染成漂亮可分享页面（带 Markup 水印 + "用 Markup 原生打开"按钮）。每个被分享的链接 = 反向链接 + SEO + 新用户入口，是一条**复利获客回路**，同时给 DAU 一个免遥测的服务端计数。

> 这个解锁**同时**喂养 star（开发者觉得酷）和 DAU（高频刚需）。

---

## 4. 定位（一条主线，两个受众）

主 hero 一句话保持单一（HN title / PH tagline / repo 描述统一）：

> **Markup — a fast, native, open-source Markdown editor. Read your notes *and any GitHub repo* like a beautiful web page; edit when you want.**

按受众微调侧重：

- **开发者 / HN / Reddit / Lobsters**：主打 *"开源原生的 Typora —— 而且是读任意 GitHub 仓库文档最舒服的方式。"* 锚点：开源 + 原生(Tauri 轻) + GitHub round-trip + Rust/Tantivy。
- **移动 / 少数派 / 小红书 / B站**：主打 *"随身读你的笔记和任意 GitHub 仓库 —— 像读网页一样。"* 锚点：iCloud/Files、离线、阅读优先、中文顺滑。

---

## 5. 分阶段路线 + 里程碑

| 阶段 | 周期 | 核心动作 | ★ 目标 | DAU 目标 |
|---|---|---|---|---|
| **P0 点火** | 第 1–2 周 | 先上 updater-ping 计数（先能看见数字）→ 软发射收反馈 → HN+PH+sspai 同周主脉冲 | **1.5–3K** | 起量、首次可测 |
| **P1 放量** | 第 1–3 月 | Win/Linux beta 上线；iOS/MAS 过审 + ASO；awesome-lists/AlternativeTo 长尾铺开 | **3–4K** | 移动+桌面装机起量，进入千级 |
| **P2 飞轮** | 第 3–6 月 | 内容引擎（build-in-public、对比页、掘金/dev.to 技术长文）；GitHub-reader web 端点上线；programmatic SEO | **5–7K** | 千级稳定可测，向万级爬 |
| **P3 复合** | 第 6–12 月 | 贡献者社区、本地化、持续发版节奏、（评估 scope 内的）轻插件/同步增量 | **10K** | **10K** |

每阶段都带一个"可见发版"——发版本身就是 Reddit/X/即刻 的再传播弹药（sustain 引擎）。

---

## 6. 渠道打法（spike then sustain）

**脉冲渠道（一次性大波，P0）**——文案见 [LAUNCH-POSTS.md](./LAUNCH-POSTS.md)：
- Show HN（开发者主战场）· Product Hunt（Tue–Thu）· **Lobsters**（新增，dev 浓度高）· 少数派长测 · V2EX 分享创造 · Reddit（r/macapps、r/opensource、r/SideProject、r/tauri，**别一稿到处贴**）· X/Mastodon/Bluesky（@ Tauri 社区求转发）。

**复利渠道（常年导流，是 3K→10K 的桥）**：
- **awesome-lists 长尾**：维护现有 9 个开放 PR；≥50★ 后补 `awesome-rust`；跨平台后补 `awesome-linux`/`awesome-windows`。
- **AlternativeTo**（新增，高意图）：把 Markup 登记为 **Typora / Obsidian / MacDown 的 alternative**——"找 Typora 替代品"的搜索意图直接命中，常年导流。
- **App Store ASO**：iOS+MAS 关键词/截图/本地化优化（listing 已写好，见 [marketing/app-store/listing.md](../marketing/app-store/listing.md)）；App Store 搜索是免费的大漏斗。
- **GitHub topics + star-history flywheel**：社会证明回路。

**中国移动盘**（DAU 的重要增量）：小红书/B站 的"原生读 GitHub 文档/Obsidian 平替"短视频 + 即刻开源圈 + 掘金技术长文。

---

## 7. 内容 / SEO / 飞轮引擎（从 3K 到 10K 的真正桥梁）

单次发射给脉冲，**持续增长靠这台引擎**：

- **Build-in-public 技术长文**（本身就能上 HN/掘金，并吸开发者+star）：Tauri 沙箱踩坑、中文 IME 攻坚、**GitHub round-trip 设计**、Canvas 兼容 Obsidian 的逆向、Tantivy 万文件 1 秒索引。每篇 = 一个新的发射点。
- **高意图对比页 SEO**：`Markup vs Typora`、`Obsidian alternative for macOS`、`read GitHub README offline`、`markdown reader iOS` —— 这些是常年有人搜的词，落地页吃自然流量。
- **真正的产品站**（GitHub Pages）：现在 `homepageUrl` 指向 releases 页，转化与 SEO 都弱；做一个独立 landing（hero 视频 + 下载矩阵 + 对比表）。
- **web 渲染端点回路**（解锁三）：每个被分享的 `markup.app/gh/...` 链接都是反向链接 + 新用户入口 + 免遥测用量信号。

---

## 8. 测量与埋点（否则"10K DAU"无法证明也无法优化）

**悖论**：卖点是"无账号、无遥测、无追踪"。下面的解法**都不破坏这个承诺**：

1. **自更新 ping 作为活跃装机代理 —— ✅ 已落地（零基础设施）**：updater endpoint 是 `releases/latest/download/latest.json`，**每次检查更新都会下载它，而 GitHub 本来就按资产记 `download_count`**。所以连计数端点都不用建——这个数字已经在被记录。已加 [`scripts/metrics-snapshot.sh`](../scripts/metrics-snapshot.sh) + 每日 [`metrics.yml`](../.github/workflows/metrics.yml)，把 stars / updater-ping / dmg 下载 逐日落到 `metrics-data` 分支；口径与方法见 [`docs/metrics/README.md`](./metrics/README.md)。**这是匿名的活跃装机下界，零新增追踪、零 PII。**（真·唯一日活需要在 feed 前加计数端点，属升级路径，需先定托管——见 metrics/README「Upgrade path」。）
2. **App Store Connect 分析（免费、Apple 提供、无需 SDK）**：iOS+MAS 的 active devices / installs / 转化，开箱即用、不碰隐私。
3. **web 渲染端点的服务器日志**（解锁三）：天然用量信号。
4. **（可选）opt-in 聚合**：若要真·DAU，可加**单条匿名每日 ping（无 ID、仅国家级粒度）**，附**显眼的 opt-out** 和公开的隐私声明；或自托管 Plausible 式聚合。**要做就透明地做**，写进 PRIVACY.md。

**先把"DAU"定义清楚**（App 打开？updater 检查？）让 10K 这个数**可证伪**。
**仪表盘**（每周看一次）：stars(star-history) · downloads(GH API) · updater pings · ASC active devices · web 端点命中。

---

## 9. 风险与反模式（别把唯一的机会烧了）

- **刷票/水军 HN·PH** ⇒ 封禁，一次性烧掉发射窗口。**不要。** 只用真实分发。
- **死守 macOS-only** ⇒ 数学上到不了 10K（§2a）。这是头号增长风险。
- **发射当天带 P0 bug** ⇒ 发射前冻结 main + 跑 5 分钟冒烟（IME / 打开 vault / 导出 / 自更新）。
- **一稿到处贴** ⇒ 中文社区(sspai/V2EX/小红书)与英文社区(HN/Reddit/Lobsters)文化节奏不同，逐个改写。
- **r/ObsidianMD 等敏感社区硬碰** ⇒ 只作为互补工具、尊重地提，别挑竞争。
- **为 DAU 牺牲"无遥测"信任** ⇒ 只用 §8 的 proxy + 透明 opt-in，别偷偷加 SDK。
- **跨平台后维护成本上升** ⇒ 提前搭 CI 矩阵 + 用贡献者社区承接。

---

## 10. 未来 7 天行动（具体、可勾选）

> 外向动作（开 awesome-list/AlternativeTo PR、发任何帖）**发射前需你点头**；下面标 🔵 的是需你确认/亲自做的对外动作，⚙️ 是可由 Claude 会话推进的内部工程/素材。

1. ✅ ⚙️ **updater-ping 计数已落地** —— `scripts/metrics-snapshot.sh` + 每日 `metrics.yml` → `metrics-data` 分支。当前基线：8★ / 7 updater-ping / 234 DMG 下载。
2. 🔵 **发布视频上 YouTube**，链接回填 README + 各渠道文案。
3. ⚙️ **冻结 main + 跑 5 分钟冒烟**（IME/打开 vault/导出 HTML/自更新）。
4. 🔵 **软发射**：r/macapps、V2EX 分享创造、Tauri Discord、即刻 —— 收早期反馈并快速修。
5. ⚙️/🔵 **AlternativeTo 登记**（Typora/Obsidian/MacDown alternative）+ 跟进 9 个开放 awesome-list PR。
6. 🔵 **定 Show HN + PH 同周日期**（Tue–Thu，US 上午），备好在场 3–4h。
7. ⚙️ **起跨平台 spike 分支**：在 Windows/Linux runner 上 `pnpm tauri build`，看 WebView2/WebKitGTK 渲染与 IME，产出一份"跨平台 hardening"待办。

---

## 附录 · 基准与假设来源

- Show HN 转化（500–2,000★/48h、~1.4★/upvote、半衰期 24h）：Daniel King《Show HN by the Numbers》（188K 帖 14 年数据分析）。
- 竞品 ★（2026-06，GitHub API 实测）：AppFlowy 73K · AFFiNE 70K · Mark Text 58K · Joplin 55K · SiYuan 45K · Logseq 44K · Spacedrive 38K · Trilium 37K · super-productivity 20K · Zettlr 13K。
- DAU 漏斗的留存/黏性系数为**行业数量级假设**，非 Markup 实测——上线 §8 计数后用真实数据回填、重订目标。
