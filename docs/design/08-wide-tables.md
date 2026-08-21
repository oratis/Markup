# 设计 08 · 宽表格：让表格用上屏幕宽度

- **日期**: 2026-08-21
- **状态**: 已采纳，已实现（见 §6）
- **触发**: 在 Read 模式读 8 列的竞品对比表，每格被挤成一列两三个字、一行就是一个字；屏幕两侧 60% 的空白却闲着。
- **一句话**: 正文列宽不动（那是给段落的阅读量度），**表格可以按需"出血"到窗格边缘**；列宽按内容分配而不是平均分；实在放不下再横向滚动，绝不再挤成一字一行。

---

## 1. 问题是怎么来的

截图里的表格有三层原因叠在一起：

1. **列被强制等宽。** Milkdown 自带的 Nord 主题给 `.ProseMirror table` 设了 `table-layout: fixed; width: 100%`。fixed 布局下没有显式列宽时浏览器**平均分**——"赛道"这种两三个字的列和"当前量级"这种 40 字的列拿到一样宽。这是一字一行的主因。
2. **表格被关在正文列里。** 正文列 `--markup-prose-max-width`（默认 720px，可调 480–1200）是为段落设计的阅读量度；8 列表格塞进 720px，每列不到 90px。
3. **中文没有"最小宽度"。** 拉丁文的最小内容宽度是最长的单词，浏览器至少保住一个词；中文每个字都能换行，最小内容宽度是一个字，所以自动布局会一路挤到一字一行也不溢出——永远不会出现滚动条来"救场"。

## 2. 别人怎么做

| 产品 | 宽表格的处理 | 备注 |
|---|---|---|
| Typora | 留在正文列里，表格容器 `overflow-x: auto` 横向滚动 | 列宽按内容 |
| Obsidian | 同上（`.table-wrapper` 横滚）；另有全局"Readable line length"开关，关掉后全文通栏 | 全文通栏伤段落 |
| GitHub | `table { display:block; width:max-content; max-width:100%; overflow:auto }`——按内容定宽、封顶容器、溢出滚动 | 容器本身就有 ~1000px |
| Notion | 每页一个 "Full width" 开关；数据库表可单独全宽 + 横滚 | 按页决定，不是按表 |
| Medium / Substack / CSS-Tricks "full-bleed" | 图片、嵌入可以**出血**到正文列之外（负 margin / grid 三列轨道） | 正文列不动，宽元素单独放宽 |

结论：Markdown 编辑器普遍只做"列内横滚"，这在 2000px 宽的屏幕上显然浪费——正文列 800px，两侧各 600px 空白，表格还在里面滚。出版类产品的 full-bleed 思路更对：**段落保持阅读量度，宽元素单独出血**。

## 3. 方案比较

| 方案 | 做法 | 优点 | 缺点 | 取舍 |
|---|---|---|---|---|
| A. 只改列宽算法 | `table-layout: auto` | 一行改动，立刻改善等宽问题 | 8 列塞 720px 仍然挤 | **做，但不够** |
| B. 列内横滚（Typora/Obsidian） | 包一层 `overflow-x: auto` | 最稳妥，无布局风险 | 大屏上两侧大片空白，表格在中间滚 | 作为兜底 |
| C. 表格出血到窗格（full-bleed） | 表格容器负 margin 撑出正文列，最多到窗格边缘留 32px 沟 | 真正"适配屏幕"；段落量度不变 | 需要知道窗格宽度，纯 CSS 要靠容器查询单位 | **推荐** |
| D. 全局/按文档通栏 | 类似 Obsidian 的开关或 frontmatter `full-width: true` | 简单 | 段落跟着通栏，伤阅读；且多数文档只有一两张宽表 | 不做（现有 ⌘ 调列宽已覆盖"我就想通栏"的人） |
| E. 按表格给列宽提示 | 在 Markdown 里写列宽（非标准） | 精确 | 污染源文件、不可移植 | 不做 |

**决策：A + C，B 兜底。** 三者是叠加关系，不冲突。

## 4. 设计细则

### 4.1 三档行为

设正文列宽 `C`，窗格宽 `P`，出血沟 `G = 32px`，可出血量 `B = max(0, (P − C)/2 − G)`（每侧）。

| 表格的"内容宽度"（见 4.3） | 行为 |
|---|---|
| `≤ C` | 和今天一样：占满正文列（`min-width: C`），不出血。小表格外观不变。 |
| `C < w ≤ C + 2B` | 表格长到 `w`，**居中**，两侧对称越出正文列。 |
| `> C + 2B` | 表格占满 `C + 2B`；列按内容比例压缩，但每列不低于下限（4.4）；若下限之和仍放不下，容器横向滚动。 |

窗格很窄（`P − C` 不够留沟）时 `B = 0`，退化成 Typora 行为。

### 4.2 知道窗格有多宽：容器查询单位

出血量要用"窗格宽度"算，而表格是 `.editor` 的子元素，`%` 解析的是 `.editor` 的内容盒，拿不到窗格宽。把 `.milkdown` 声明为 `container-type: inline-size`，子孙里的 `100cqw` 就是窗格宽，纯 CSS 解决，不用 ResizeObserver：

```css
.milkdown { container-type: inline-size; }
.milkdown .editor .mk-table-wrap {
  --mk-pad:   max(24px, calc((100cqw - var(--markup-prose-max-width)) / 2)); /* 和 .editor 的 padding 同式 */
  --mk-bleed: max(0px, calc(var(--mk-pad) - 32px));
  margin-inline: calc(-1 * var(--mk-bleed));
  overflow-x: auto;
}
```

兼容性：容器查询单位从 Safari 16 起支持（macOS 11 Big Sur 以上的 WKWebView）。应用最低支持 macOS 10.15，Catalina 顶到 Safari 15.6，**没有 cqw**——用 `@supports (width: 1cqw)` 包住出血部分；不支持时只缺"出血"，自动列宽和横滚照旧。`container-type` 带来的布局隔离（layout containment）会让 `.milkdown` 成为 `position: fixed` 子孙的包含块——查过，`.milkdown` 内只有 ProseMirror 生成的 DOM，没有 fixed 元素。

### 4.3 表格的"内容宽度"怎么定：封顶到正文列宽

`width: max-content` 让表格按内容定宽。但中文段落的 max-content 是整段不换行的长度，一格 200 字的备注列会把表格撑到 3000px，再被 `max-width` 压回来时它按比例吃掉几乎全部宽度，把别的列挤回下限。要给**单列**封顶。

`max-width` 写在 `td` 上在 WebKit/Blink 的自动布局里不生效，写在格内的 `<p>` 上生效（块级盒的 max-content 贡献被自己的 `max-width` 截断）。封顶值取**正文列宽 `C`**：

```css
.milkdown .editor .mk-table-wrap :is(td, th) > p {
  max-width: min(var(--markup-prose-max-width), calc(100cqw - 48px)); /* = C */
}
```

为什么是 `C` 而不是一个更小的常数（比如 32em）：

- 封顶 < C 时，小表格被 `min-width: C` 撑满正文列后，某一列可能比封顶还宽，文字到封顶就停，格子右边留白、表头背景却通到底——看起来像坏了。
- 封顶 = C 时，表格被撑到 C 的场合每列必然 ≤ C，封顶永远不会"咬到"；表格比 C 宽的场合每列都在 [下限, 自己的封顶] 之间。没有留白伪影。
- 语义上也顺：**任何一格都不会比一段正文更宽**。

### 4.4 列的下限：不再一字一行

`th, td { min-width: 6.5em }`（border-box，含 12px×2 内边距，约合 5 个汉字）。`min-width` 写在单元格上 WebKit/Blink 都尊重。这是"压缩"和"滚动"的分界：列数 × 6.5em 超过 `C + 2B` 才出现滚动条——1440px 窗口下 13 列。

取 6.5em 是实测的：在触发本设计的那张 8 列表上，把下限从 5.5em 提到 6.5em，最窄的"赛道"列从 99px 涨到 111px（3 字/行 → 5 字/行），最宽的几列各只让出约 5px；再往上（8.5em）列宽开始趋同，等于把"按内容分配"又抹平了。

### 4.5 嵌套的表格不出血

引用块、列表项里的表格属于它的容器，不属于页面——出血会让它挂在引用块的竖线外面。`:is(blockquote, li, td, th) .mk-table-wrap` 把出血归零，这类表格仍有自动列宽和自己的滚动条。

### 4.6 居中与滚动不打架

容器 `display: block; overflow-x: auto`，表格 `margin-inline: auto`：比容器窄时居中；比容器宽时 auto margin 按规范归零，左对齐后横滚，左端不会被居中裁掉（flex + `justify-content: center` 的经典坑）。

### 4.7 Read 与 Edit 一致

Read 模式就是 Milkdown 关掉 contenteditable，DOM 相同，所以一套 CSS 两边通用；按 E 切换时表格不跳。自动列宽在编辑时会随输入微调列宽——Typora/Obsidian 同样如此，可接受。

### 4.8 实现落点

- **NodeView** `src/lib/milkdown/table-view.ts`：给 `table` 节点包一层 `div.mk-table-wrap > table > tbody`（contentDOM = tbody）。这和 prosemirror-tables 自带的 `TableView`（columnResizing 用的 `div.tableWrapper`）结构一致，是 prosemirror-tables 认可的形态；`tableEditing`、CellSelection、`keepTableAlignPlugin` 都不依赖 table 是 `.editor` 的直接子元素。不用 `display: block` 的 GitHub 技巧，因为匿名表格盒没法居中、也没法撑满。
- **CSS** `src/index.css`：`.milkdown` 容器声明；`.mk-table-wrap` 出血 + 横滚；表格 `table-layout: auto; width: max-content; min-width: C; max-width: 100%`；单元格下限；格内 `p` 封顶。
- **注册** `src/components/Editor.tsx`：`.use(tableView)`。

## 5. 不在本轮

- **导出 HTML / 预览**：Rust 侧的导出样式已经用 GitHub 式 `display:block; overflow-x:auto`（`commands.rs`），且导出页没有"窗格"概念，不动。
- **代码块、Mermaid 图的出血**：同一套 `--mk-bleed` 可以复用，等有人抱怨再做。
- **按表格/按文档的手动开关**：先看自动规则够不够用。
- **iOS**：原生 Swift 渲染，不走这条链路。

## 6. 验证

- 8 列中文对比表（本次触发用例）在 1280 / 1440 / 1900px 窗格下的表现；
- 3 列、一列长备注的表：只小幅出血，备注列在 C 处换行，无右侧留白伪影；
- 小表格（README 的 5 列对比表）：外观与改前一致，占满正文列；
- 20 列矩阵：容器内横滚，页面本身不出横向滚动条；
- Read ↔ Edit 切换不跳版；Edit 模式下点选格子、Tab 跳格、列选区正常；
- `@supports` 兜底：禁用 cqw 时仍是自动列宽 + 横滚。
