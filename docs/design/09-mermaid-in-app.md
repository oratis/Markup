# 设计 09 · 应用内渲染 Mermaid

- **日期**: 2026-08-22
- **状态**: 已采纳，已实现（见 §7）
- **配套**: 出血系统见 [设计 08](./08-wide-tables.md)
- **一句话**: README 一直写着 Read 模式会渲染 Mermaid 图，其实没有——图在应用里只是一段源码，只有导出的 HTML 才真渲染。这一轮补上 nodeView，顺带让宽的图接上出血系统。

---

## 1. 问题：一个宣传了很久但不存在的功能

`@milkdown/plugin-diagram` 一直在 `Editor.tsx` 里注册着，但它**只给 schema，不给 view**。它的 `toDOM` 造的是：

```js
const dom = document.createElement("div");
dom.dataset.type = "diagram";
dom.textContent = code;      // ← mermaid 源码，就这样显示出来
```

运行时实测：编辑区里 `<svg>` 数量为 0。所以 Read 和 Edit 里，一个 ```mermaid 块就是一段纯文本。

而 README 写的是："**Read**（默认）：你的 Markdown 渲染成文档——KaTeX 公式、**Mermaid 图**、语法高亮的代码、GFM 表格与任务列表。" 这句话对导出的 HTML 成立（Rust 侧 `commands.rs` 把 ```mermaid 转成 `<pre class="mermaid">`，再从 CDN 拉 mermaid v11 渲染），对应用内不成立。

触发这一轮的是一个更小的需求："代码块和 Mermaid 图也用同一套出血"。代码块能做；Mermaid **不能**——不是不想复用变量，是**没有图可以出血**。给一段短源码加负边距，每一项机械检查都会通过，用户什么也看不出来，而 PR 会看起来像交付了。所以前置条件是先把图渲染出来。

## 2. 为什么值得单独做，而不是塞进出血那一轮

它不是 CSS 复用，是一条新的异步渲染路径，要处理：竞态、错误隔离、主题、原子节点的源码可达性、依赖版本。这些每一条都能自己制造 bug。所以单独一个 PR、单独一份文档、单独一组 e2e。

## 3. 依赖：先把 mermaid 统一到 v11

装了两份 mermaid：

| 来源 | 版本 | 谁在用 |
|---|---|---|
| `package.json` 的 `mermaid: ^11.4.0` | 11.14.0 | 改前：**没有人**（`src/` 里零 import） |
| `@milkdown/plugin-diagram` 的 `mermaid: ^10.9.0` | 10.9.5 | 改前：真正被打进包的那份 |
| `commands.rs` 的 CDN | v11 | 导出/预览的 HTML |

如果 nodeView 直接 `import("mermaid")` 拿到 11.14.0，包里就会同时有 v10 和 v11 两套图渲染引擎。所以加 `pnpm.overrides`：

```json
"pnpm": { "overrides": { "mermaid": "^11.4.0" } }
```

plugin-diagram 对 mermaid 的全部用法只有一句 `mermaid.initialize({...})`（`lib/index.es.js:56`），v11 完全兼容，实测无碍。统一到 v11 还有两个好处：

- **`suppressErrorRendering`**（v11 才有）——见 §4.3；
- 应用内和导出页用同一个大版本，图不会两边长得不一样。

## 4. 设计细则

### 4.1 结构

```
div.mk-diagram-wrap          ← 出血 + 横滚；position: relative
├── div.mk-diagram-figure    ← flex 居中
│   └── <svg>                ← mermaid 渲染结果
└── button.mk-diagram-source-toggle   ← 悬停显形，切换图/源码
```

节点是 `atom: true, isolating: true`，源码在 `attrs.value` 而不在 content 里，所以**没有 contentDOM**——这点必须照做，给了 contentDOM 就是让 ProseMirror 去管一段它并不拥有的 DOM。

### 4.2 出血：图不拉伸，只是"有更多地方可长"

和表格/代码块不同，**不给 SVG 设 `min-width`**。mermaid 输出的 `<svg>` 自带一个行内 `max-width: <自然宽度>px`，正好是我们要的封顶：

| 图的自然宽度 | 结果 |
|---|---|
| 比容器窄 | 按自然尺寸画，居中。小图不会被拉成一条横幅。 |
| 比容器宽 | 缩放到容器宽度。 |

出血在这里买到的是**容器更宽**，于是宽图在被迫缩小之前有更多余地——一张五节点的流程图在 1440px 窗口下能画到约 1000px 而不是被压进 720px。这就是"同一套出血"对图的正确含义。

### 4.3 错误必须关在节点里

这是这个功能最大的风险。`e2e/render-resilience.spec.ts` 存在的原因，就是当年一个 KaTeX 的未捕获异常把整个应用变成白屏。mermaid 的失败方式更脏：默认情况下语法错误不但抛异常，还会往 `document.body` 里塞一张它自己的错误图。

三层防护：

1. `initialize({ suppressErrorRendering: true })`——不许它往 body 里画东西（v11 才有，见 §3）；
2. `await mermaid.parse(src, { suppressErrors: true })`，返回 `false` 就不进 render；
3. 整个渲染包在 `try/catch` 里，失败时**降级成源码 + 一行说明**，而不是空白。

e2e 里除了断言应用还活着，还断言 `body > svg` 数量为 0，以及 `pageerror` 为空。

### 4.4 竞态：generation 计数器

Read 和 Edit 共用一份 DOM，异步的 SVG 替换会发生在光标底下。两个保护：

- `ignoreMutation() => true`——这里的 DOM 变动全是我们自己的替换，绝不能让 ProseMirror 拿去当内容改动重新解析；
- 每次渲染请求 `++generation`，每个 await 之后核对一次；对不上就丢弃。没有这个，一次慢的旧渲染会覆盖掉新的（改源码时很容易复现）。

`destroy()` 里也要 `generation++`，否则在途的渲染会往已经卸载的 DOM 上写。

### 4.5 主题：全局的 initialize + 全量重画

`mermaid.initialize()` 是全局且一次性的，已经画出来的 SVG 不会跟着变色。所以主题切换要做两件事：重新 initialize，再把**所有**挂载中的 view 重画一遍。

主题从哪读？`Editor.tsx` 把 `isDark` 从 WYSIWYG 分支的 props 里剥掉了（只传给 SourceEditor），所以编辑器内部拿不到。与其新拉一条 store 管线，不如读**已经应用在 `<html>` 上的那个 class**（`theme-light` / `theme-dark` / `theme-sepia`）——它已经是唯一事实来源，而且天然覆盖了 `auto` 跟随系统的情况。用一个模块级 `MutationObserver` 盯 `<html>` 的 class 变化。

映射：`theme-dark → "dark"`，`theme-sepia → "neutral"`，其余 → `"default"`。

### 4.6 原子节点的源码可达性

渲染成图之后，图就是一张图——而这个节点本来就是 `contenteditable="false"` 的原子节点，**改前也不能就地编辑**，只能看源码。所以渲染唯一拿走的能力是"就地看源码"。

右上角加一个悬停显形的「源码」按钮补回来，点一下切成源码，再点切回图。真要改还是 ⌘/ 进源码模式——和改前一样。`stopEvent` 要拦住这个按钮上的事件，别让 ProseMirror 当成编辑器输入。

### 4.7 绝对定位的坑

那个角标按钮是 `position: absolute` 的。设计 08 §4.2 记着：`.milkdown` 上的 `container-type: inline-size` 让它成了绝对定位子孙的包含块。所以 wrapper 必须自己 `position: relative`，否则按钮会飞到整个编辑窗格的右上角。**这是那条注记的第一个真实用例。**

## 5. 副作用：一个被异步渲染晃到的测试

welcome 文档里就有一个 Mermaid 块。它现在会异步渲染成 SVG，**文档高度因此变化**。而 `e2e/wide-tables.spec.ts` 的 `pasteMarkdown` 是靠点击编辑区**中心**来放光标的——图渲染完之前点，光标可能落进引用块或列表项，粘进去的表格就嵌套了，量到的是容器宽度（685px）而不是正文列（720px）。

修法是在 `beforeEach` 里等图渲染完再动手，而不是放宽断言。断言是对的，是时序不对。

## 6. 不在本轮

- **让 mermaid 核心也懒加载**。plugin-diagram 是**静态** `import mermaid from "mermaid"` 的，所以只要注册了这个插件，mermaid 核心就跟着 milkdown 块进首屏；各图种（flowchart / sequence / gantt / architecture / cytoscape）倒是按需加载的。实测这一轮的账：

  | | 首屏 JS |
  |---|---|
  | 这两轮之前 | 4,953,178 B (4.72 MiB) |
  | 拆块修好之后（[#234](https://github.com/oratis/Markup/pull/234)，mermaid v10） | 2,094,244 B (2.00 MiB) |
  | **本轮之后**（统一到 v11 且真的渲染） | **2,438,646 B (2.33 MiB)** |

  也就是说，"图真的画出来"这件事花了约 344 KB 首屏（milkdown 块 486 → 1,092 KB，其中 mermaid v11 核心约 605 KB），相对起点仍然净减 50.8%。要把这 605 KB 也挪成懒加载，得绕开 plugin-diagram 的静态 import——要么给它 alias 一个空壳、自己按完整路径动态 import 真身，要么连 schema 和 remark 转换一起自己实现。前者取巧且依赖 mermaid 的内部产物路径，后者是正经做法但工作量另算。留作后续。
- **点图直接改源码**：现在是「看」，不是「改」。真要就地编辑得做一个受控的小编辑器。
- **导出页与应用内的排布差异**：导出页把图封顶在导出列宽（`commands.rs` 的 `pre.mermaid svg { max-width: 100% }`），应用内会出血。要不要统一，等有人提。
- **`mermaid.initialize` 的更多配置**（曲线类型、字号）：先用默认值加 `fontFamily: inherit`。

## 7. 验证

`e2e/mermaid.spec.ts`，7 条：

- Mermaid 块渲染成 `<svg>`，不再是源码；
- welcome 文档在 Read 模式下就把图画出来；
- 宽图出血、左右对称、页面不横向滚动，且 SVG 确实比正文列宽；
- 小图**不**被拉伸（自然尺寸，窄于正文列）；
- 语法错误的图不白屏：应用还在、降级显示源码 + 说明、`body` 下没有游离的 `<svg>`、无 `pageerror`；
- 角标按钮在图与源码之间来回切；
- 切到暗色主题后图被重画（SVG id 变了）。

外加：源码 → WYSIWYG → 源码 的往返实测保住了 ```mermaid 围栏，与改前一致。
