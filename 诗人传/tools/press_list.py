#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把全书的【成书前】条目抽成一份主编决策清单。在 诗人传/ 下运行。

**清账清不掉这些，不是没查，是它们不该由考据员定。** 两说并存、全书口径、
某一节留不留——这些要作者拍板。把它们从九百多条欠账里挑出来单独成册，
作者才看得见自己真正要做的决定有多少。

用法：python3 tools/press_list.py        # 写出 提纲/主编待决.md
"""
import re, glob, os, sys

OUT = "提纲/主编待决.md"
PRESS = "【成书前"


def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else (0 if "序章" in p else 99)


def files():
    fs = sorted(glob.glob("第*卷*/[0-9]*.md"), key=chnum)
    if os.path.exists("序章-年谱.md"): fs = ["序章-年谱.md"] + fs
    if os.path.exists("终章-江月何年初照人.md"): fs = fs + ["终章-江月何年初照人.md"]
    return fs


def title(p):
    t = open(p, encoding="utf-8").read()
    m = re.search(r"^poet:\s*(.+)$", t, flags=re.M)
    poet = m.group(1).strip() if m else ""
    name = re.sub(r"^\d+-", "", os.path.basename(p)[:-3])
    n = chnum(p)
    head = f"第 {n} 章 · {name}" if 1 <= n <= 90 else name
    return f"{head}（{poet}）" if poet else head


def items(p):
    t = open(p, encoding="utf-8").read()
    out = []
    for m in re.finditer(r"<!--\s*欠账:(.*?)-->", t, flags=re.S):
        for it in re.findall(r"^- \[ \]\s*(.*)$", m.group(1), flags=re.M):
            if PRESS in it:
                out.append(re.sub(r"\s+", " ", it).strip())
    return out


def main():
    rows, total = [], 0
    for p in files():
        its = items(p)
        if not its:
            continue
        total += len(its)
        rows.append((p, title(p), its))
    body = [
        "---", "status: draft", "type: 主编待决", "---", "",
        "# 主编待决",
        "",
        f"**{total} 条。** 这些不是没查出来的欠账，是**不该由考据员定的**——两说并存该取哪一说、"
        "全书口径要不要统一、某一处细节留不留。它们由 `tools/press_list.py` 从各章欠账区块里抽出，"
        "**不要在这里改**；定了之后回到该章的欠账条目上落笔。",
        "",
        "抽取口径：章末 `<!-- 欠账: -->` 区块里带 `【成书前` 标记且仍是 `- [ ]` 的条目。",
        "",
    ]
    for p, t, its in rows:
        body.append(f"## {t}")
        body.append("")
        body.append(f"<sub>{p} · {len(its)} 条</sub>")
        body.append("")
        for it in its:
            body.append(f"- {it}")
        body.append("")
    open(OUT, "w", encoding="utf-8").write("\n".join(body))
    print(f"已写出 {OUT}：{len(rows)} 章 · {total} 条")


if __name__ == "__main__":
    main()
