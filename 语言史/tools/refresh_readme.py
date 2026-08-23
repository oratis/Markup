# -*- coding: utf-8 -*-
"""从文件实测重刷 README 看板的字数表与总字数。永远不要手写字数。

在 语言史/ 下运行：python3 tools/refresh_readme.py
"""
import re, glob, os, sys

TARGET = 215000
FRONT = ("序章-绵羊和马.md", "序章 · 绵羊和马")
BACK = ("终章-星号的另一边.md", "终章 · 星号的另一边")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import count, sections   # 全书统一口径：不把 Markdown 记号算成正文


def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else None


rows = []
tot = 0

if os.path.exists(FRONT[0]):
    c, s = count(FRONT[0]), sections(FRONT[0])
    rows.append((0, f"| [{FRONT[1]}]({FRONT[0]}) | {c:,} | {s} |")); tot += c

for p in sorted(glob.glob("第*卷*/[0-9]*.md"), key=lambda x: chnum(x)):
    n = chnum(p)
    c, s = count(p), sections(p); tot += c
    title = re.sub(r"^\d+-", "", os.path.basename(p)[:-3])
    rows.append((n, f"| [{n} · {title}]({p}) | {c:,} | {s} |"))

if os.path.exists(BACK[0]):
    c, s = count(BACK[0]), sections(BACK[0])
    rows.append((99, f"| [{BACK[1]}]({BACK[0]}) | {c:,} | {s} |")); tot += c

if not rows:
    rows = [(0, "| （尚未开写） | 0 | 0 |")]

table = "| 篇 | 字数 | 节 |\n|---|---:|:--:|\n" + "\n".join(r for _, r in sorted(rows))

readme = open("README.md", encoding="utf-8").read()
pat = r"\| 篇 \| 字数 \| 节 \|\n\|[-|: ]+\|\n(?:\|.*\n)+"
assert re.search(pat, readme), "看板表未匹配——README 结构变了，先看一眼"
new = re.sub(pat, table + "\n", readme, count=1)

pat2 = r"当前正文字数：约 \*\*[\d,\s]+ / [\d,\s]+\*\*"   # 目标数带千位逗号，[\d\s] 配不上
assert re.search(pat2, new), "总字数那一行未匹配——先看一眼 README 是不是被改过"
new = re.sub(pat2, f"当前正文字数：约 **{tot:,} / {TARGET:,}**", new, count=1)

open("README.md", "w", encoding="utf-8").write(new)
print(f"看板已刷新：{len([r for r in rows if r[1].count('|') > 2])} 篇，合计 {tot:,} 字（目标 {TARGET:,}）")
