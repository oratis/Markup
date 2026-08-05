#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""文风体检。在 book/ 下运行。

量三个东西，都是《写作规范》里有明文额度、而且机器数得准的：

    粗体占比   `**` 内非空白字符 ÷ 正文非空白字符。无明文额度，实践值 10–15%。
               超过 25% 就该看一眼——加粗到那个密度等于没有重点。
    括号旁白   长于 25 字的全角括号句。规范第 28 条：每节 ≤2。
    「我们」   规范第 6 条：每章五六次封顶。

**这三个数是用来定位问题的，不是用来拉平的。** 两条教训：

1. 「我们」的计数分不清叙述者的口头禅和论证的主语。第 8 章 22 次里有 20 处
   是图灵那个论证的骨架（"我们判断别人在思考，用的本来就是同一个办法"），
   删了论证就散了。派活时必须写明要区分两类。
2. 粗体最低的章（第 10 章 8%）不该再降，该看的是有没有该强调却没强调的
   转折句。把最健康的一章也"改进"一遍是批量任务最容易犯的错。
"""
import re, glob, os, sys, statistics

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import body, count, sections


def audit(path):
    b = body(path)
    chars = len(re.sub(r"\s", "", b))
    bold = sum(len(x) for x in re.findall(r"\*\*(.+?)\*\*", b))
    return {
        "words": count(path),
        "secs": sections(path),
        "bold": bold * 100 // max(1, chars),
        "aside": len(re.findall(r"（[^）]{25,}）", b)),
        "we": len(re.findall("我们", b)),
    }


def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else None


def main():
    files = (["序章-最后的问题.md"]
             + sorted(glob.glob("第*时代*/[0-9]*.md"), key=chnum)
             + ["终章-要有光.md"])
    print(f"{'篇':22s} {'字数':>6s} {'粗体':>5s} {'旁白':>4s} {'我们':>4s} {'节':>2s}  提示")
    bolds = []
    for f in files:
        a = audit(f)
        bolds.append(a["bold"])
        tips = []
        if a["bold"] >= 25: tips.append("粗体过密")
        if a["aside"] > a["secs"] * 2: tips.append(f"旁白超限（上限 {a['secs']*2}）")
        elif a["aside"] < a["secs"]: tips.append("旁白偏少")
        if a["we"] > 6: tips.append("「我们」偏多（先分辨是不是论证主语）")
        elif a["we"] < 3: tips.append("「我们」偏少，史话的声音弱了")
        floor = 4000 if ("序章" in f or "终章" in f) else 8000
        if a["words"] < floor: tips.append(f"低于字数下限 {floor}")
        if not (3 <= a["secs"] <= 5): tips.append("节数越界")
        print(f"{os.path.basename(f)[:20]:22s} {a['words']:6d} {a['bold']:4d}% "
              f"{a['aside']:4d} {a['we']:4d} {a['secs']:2d}  {' / '.join(tips)}")
    print(f"\n粗体中位数 {statistics.median(bolds)}% · 最高 {max(bolds)}%")


if __name__ == "__main__":
    main()
