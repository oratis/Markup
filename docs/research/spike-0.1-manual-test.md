# Spike 0.1 手动验收步骤

编译完成后，会弹出一个原生 macOS 窗口（标题 "Markup"）。按下面顺序逐项验收。

## 1. 启动可见性
- [ ] 窗口可见，1100×720
- [ ] 标题栏自定义（无系统原生 chrome），左上角能看到红/黄/绿三个交通灯按钮
- [ ] 顶部居中显示 "No file"
- [ ] 顶部右侧有 `Open…` 按钮和 "Saved" 状态文字

## 2. Welcome 文档渲染
- [ ] 看到 "Welcome to Markup" 一级标题（大号字）
- [ ] 看到 "Try it out"、"Math (KaTeX)"、"Diagram (Mermaid)"、"Code" 等子标题
- [ ] **粗体** 渲染为粗体（不是 `**text**`）
- [ ] *斜体* 渲染为斜体
- [ ] `行内 code` 渲染为代码字体
- [ ] 列表项有圆点
- [ ] 引用块（"Spike 0.1 verifies..."）有左侧边线和缩进

## 3. KaTeX 数学
- [ ] 行内：`a² + b² = c²` 渲染为公式字形（上标小号）
- [ ] 块级：高斯积分公式渲染为正常的数学排版（积分号、根号、π 都要正确）

**如果数学块显示为源码 / `$...$`**：
- 检查 console 是否有 katex.css 加载错误
- 检查 `@milkdown/plugin-math` 是否启用

## 4. Mermaid 图表
- [ ] 那段 `graph LR` 流程图渲染为 SVG 图（4 个节点 + 连线）

**如果显示为代码块**：
- 看 console 是否有 mermaid 加载错误
- diagram 插件需要 mermaid runtime；首次渲染会异步 load，可能有 1–2s 延迟

## 5. WYSIWYG 编辑
- [ ] 点击 H1 末尾，按 Enter，输入文字。新段落正常。
- [ ] 选中一段文字，⌘B 加粗（如果快捷键未绑定，可能要先实现，spike 阶段不做强要求）
- [ ] 在列表末按 Enter 自动产生新列表项；连按两次 Enter 退出列表
- [ ] 在末尾输入新一行 `## hello` + 回车，应自动转成 H2 标题（GFM 自动转换）

## 6. 打开真实文件
准备一个测试文件：

```bash
cat > /tmp/test.md <<'EOF'
# Test File

This is a test file for **markup** spike 0.1.

- one
- two
- three
EOF
```

- [ ] 点 `Open…` 按钮 → 选 `/tmp/test.md`
- [ ] 编辑器内容替换为 test.md 内容
- [ ] 顶部文件名变 "test.md"
- [ ] 状态变 "Saved"

## 7. 保存回写
- [ ] 在打开的 test.md 末尾追加一行 "新增内容"
- [ ] 状态从 "Saved" 短暂变 "Unsaved changes" → "Saving…" → "Saved"（约 300ms 后）
- [ ] 在终端 `cat /tmp/test.md` 确认改动写入

## 8. ⌘S 手动保存
- [ ] 编辑后立即按 ⌘S，状态直接变 "Saved"，无 300ms 等待

## 9. mtime 防覆盖（可选）
- [ ] 在 markup 里编辑但不保存
- [ ] 用 `vim /tmp/test.md` 改文件并 :w（外部修改）
- [ ] 回 markup 编辑保存 → 应该报 "stale mtime" 错误（状态栏 "Error: ..."）

## 10. DevTools（如果需要 debug）
开发模式下：右键编辑器区域 → "Inspect Element"（或视图菜单），查看 console / network。

## 验收通过的最低标准

**必须全部通过**：1, 2, 5, 6, 7
**应当通过**：3, 4, 8
**可选**：9（mtime 防覆盖只在 spike 后期补）

如果 1/2/5/6/7 任一失败 → spike 0.1 不通过 → 我们一起 debug。
如果 3 或 4 失败 → 不阻塞 spike 0.1，但要在 P1 之前修。
