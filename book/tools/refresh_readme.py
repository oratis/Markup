# -*- coding: utf-8 -*-
"""从文件实测重刷 README 看板的字数表与总字数。永远不要手写字数。"""
import re, glob, os

TITLES = {
    0: ("序章 · 最后的问题", "序章-最后的问题.md"),
    99: ("终章 · 要有光", "终章-要有光.md"),
}

def measure(path):
    t = open(path, encoding="utf-8").read()
    b = re.sub(r"<!--.*?-->", "", re.sub(r"^---.*?\n---\n", "", t, flags=re.S), flags=re.S)
    return len(re.sub(r"\s", "", b)), len(re.findall(r"^## ", b, flags=re.M))

def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else None

rows = []
tot = 0

c, s = measure("序章-最后的问题.md")
rows.append((0, f"| [序章 · 最后的问题](序章-最后的问题.md) | {c:,} | {s} |")); tot += c

for p in sorted(glob.glob("第*时代*/[0-9]*.md"), key=lambda x: chnum(x)):
    n = chnum(p)
    c, s = measure(p); tot += c
    title = re.sub(r"^\d+-", "", os.path.basename(p)[:-3])
    rows.append((n, f"| [{n} · {title}]({p}) | {c:,} | {s} |"))

c, s = measure("终章-要有光.md")
rows.append((99, f"| [终章 · 要有光](终章-要有光.md) | {c:,} | {s} |")); tot += c

table = "| 篇 | 字数 | 节 |\n|---|---:|:--:|\n" + "\n".join(r for _, r in sorted(rows))

readme = open("README.md", encoding="utf-8").read()
pat = r"\| 篇 \| 字数 \| 节 \|\n\|[-|: ]+\|\n(?:\|.*\n)+"
assert re.search(pat, readme), "看板表未匹配——README 结构变了，先看一眼"
new = re.sub(pat, table + "\n", readme, count=1)

new = re.sub(r"当前正文字数：约 \*\*[\d,\s]+ / 320 000\*\*",
             f"当前正文字数：约 **{tot:,} / 320 000**", new, count=1)

open("README.md", "w", encoding="utf-8").write(new)
print(f"看板已刷新：{len(rows)} 篇，合计 {tot:,} 字")
