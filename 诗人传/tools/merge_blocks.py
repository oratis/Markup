#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把各章末尾的 `<!-- 人物: -->` 与 `<!-- 年表: -->` 注释块合并进人物谱与时间线。在 诗人传/ 下运行。

每章只动自己的文件，共享索引由本脚本从各章抽取——这样多个 agent 并行写章时不会互相覆盖。
人物谱的「三、配角（按出场章）」与时间线的「二、分章年表」两节由本脚本整体重写，
用 `<!-- AUTO:xxx -->` … `<!-- /AUTO:xxx -->` 标记圈定；标记之外的内容不动。
"""
import re, glob, os

def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else 0

def block(text, name):
    m = re.search(rf"<!--\s*{name}:\s*\n(.*?)-->", text, flags=re.S)
    if not m: return []
    rows = []
    for ln in m.group(1).splitlines():
        ln = ln.strip()
        if not ln.startswith("|") or re.match(r"^\|[\s:|-]+\|$", ln): continue
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if cells and cells[0] in ("名", "年"): continue
        rows.append(cells)
    return rows

def title_of(p):
    return re.sub(r"^\d+-", "", os.path.basename(p)[:-3])

def poet_of(text):
    m = re.search(r"^poet:\s*(.+)$", text, flags=re.M)
    return m.group(1).strip() if m else ""

def replace_region(path, name, body):
    t = open(path, encoding="utf-8").read()
    pat = re.compile(rf"<!-- AUTO:{name} -->.*?<!-- /AUTO:{name} -->", flags=re.S)
    new = f"<!-- AUTO:{name} -->\n{body}\n<!-- /AUTO:{name} -->"
    assert pat.search(t), f"{path} 里没有 AUTO:{name} 标记"
    open(path, "w", encoding="utf-8").write(pat.sub(lambda m: new, t, count=1))

def main():
    chapters = sorted(glob.glob("第*卷*/[0-9]*.md"), key=chnum)
    people_out, time_out = [], []
    np = nt = 0
    for p in chapters:
        t = open(p, encoding="utf-8").read()
        n, title, poet = chnum(p), title_of(p), poet_of(t)
        ppl, tl = block(t, "人物"), block(t, "年表")
        if ppl:
            people_out.append(f"\n### 第 {n} 章 · {title}（{poet}）\n\n| 名 | 生卒 | 速写 |\n|---|---|---|")
            for r in ppl:
                r = (r + ["", ""])[:3]
                people_out.append(f"| {r[0]} | {r[1]} | {r[2]} |")
            np += len(ppl)
        if tl:
            time_out.append(f"\n### 第 {n} 章 · {title}（{poet}）\n\n| 年 | 岁 | 事 |\n|---|---|---|")
            for r in tl:
                r = (r + ["", ""])[:3]
                time_out.append(f"| {r[0]} | {r[1]} | {r[2]} |")
            nt += len(tl)
    replace_region("提纲/人物谱.md", "配角", "\n".join(people_out).strip() or "（尚无）")
    replace_region("提纲/时间线.md", "分章", "\n".join(time_out).strip() or "（尚无）")
    print(f"已合并：{len(chapters)} 章 · 配角 {np} 条 · 年表 {nt} 条")

if __name__ == "__main__":
    main()
