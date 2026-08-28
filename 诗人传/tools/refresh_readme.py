# -*- coding: utf-8 -*-
"""从文件实测重刷 README 看板的字数表与总字数。永远不要手写字数。

在 诗人传/ 下运行：python3 tools/refresh_readme.py
"""
import re, glob, os, sys

TARGET = 220000
FRONT = ("序章-年谱.md", "序章 · 年谱")
BACK = ("终章-江月何年初照人.md", "终章 · 江月何年初照人")

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


def status_of(path):
    """frontmatter 的 status 字段。缺字段就当 draft——写了正文没写状态，
    比「没开写」更接近实情。"""
    head = open(path, encoding="utf-8").read().split("---", 2)
    m = re.search(r"^status:\s*(\S+)", head[1], flags=re.M) if len(head) > 2 else None
    return m.group(1) if m else "draft"


def status_board():
    """按卷统计 outline / draft / revise / done。

    **状态和字数一样，不要手写。** 二十四篇的状态在各自的 frontmatter 里，
    手抄的看板迟早跟它们对不上——这一版之前就对不上过：全书清完欠账、
    过完修订轮之后，看板上还写着 24 篇 draft。
    """
    STAGES = ("outline", "draft", "revise", "done")
    groups = [("序 / 终章", [f for f in (FRONT[0], BACK[0]) if os.path.exists(f)])]
    # 目录名排序会按汉字码位来，「一三二五四」——按卷次排。
    CN = {c: i for i, c in enumerate("〇一二三四五六七八九", 0)}
    dirs = [d for d in glob.glob("第*卷-*") if os.path.isdir(d)]
    for d in sorted(dirs, key=lambda d: CN.get(os.path.basename(d)[1], 99)):
        name = re.sub(r"^第(.+?)卷-", r"\1 · ", os.path.basename(d))
        groups.append((name, sorted(glob.glob(f"{d}/[0-9]*.md"))))
    lines = ["| 卷 | 章数 | outline | draft | revise | done |",
             "|---|:---:|:---:|:---:|:---:|:---:|"]
    tots = dict.fromkeys(STAGES, 0)
    n_all = 0
    for name, fs in groups:
        c = dict.fromkeys(STAGES, 0)
        for f in fs:
            st = status_of(f)
            c[st] = c.get(st, 0) + 1
            tots[st] = tots.get(st, 0) + 1
        n_all += len(fs)
        lines.append(f"| {name} | {len(fs)} | " + " | ".join(str(c[s]) for s in STAGES) + " |")
    lines.append(f"| **合计** | **{n_all}** | "
                 + " | ".join(f"**{tots[s]}**" for s in STAGES) + " |")
    return "\n".join(lines)


readme = open("README.md", encoding="utf-8").read()
pat = r"\| 篇 \| 字数 \| 节 \|\n\|[-|: ]+\|\n(?:\|.*\n)+"
assert re.search(pat, readme), "看板表未匹配——README 结构变了，先看一眼"
new = re.sub(pat, table + "\n", readme, count=1)

spat = r"\| 卷 \| 章数 \| outline \| draft \| revise \| done \|\n\|[-|: ]+\|\n(?:\|.*\n)+"
assert re.search(spat, new), "状态看板未匹配——README 结构变了，先看一眼"
new = re.sub(spat, status_board() + "\n", new, count=1)

new = re.sub(r"当前正文字数：约 \*\*[\d,\s]+ / [\d,\s]+\*\*",
             f"当前正文字数：约 **{tot:,} / {TARGET:,}**", new, count=1)

open("README.md", "w", encoding="utf-8").write(new)
print(f"看板已刷新：{len([r for r in rows if r[1].count('|') > 2])} 篇，合计 {tot:,} 字（目标 {TARGET:,}）")
print("状态看板已按各篇 frontmatter 的 status 重算")
