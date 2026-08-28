#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重刷《参考资料》里「各章系年的默认依据」那张表。在 诗人传/ 下运行。

一首诗系在哪一年、从哪一家，实际写在各章「本章诗作编年」的说明行里，散在二十二个文件中。
《参考资料》开篇说「骨架层的每一条都要能追到这里」，那就不能靠手抄——**手抄的表迟早跟
说明行对不上**，跟字数看板、状态看板是同一个道理。

用法：python3 tools/refresh_refs.py
"""
import re, glob, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import body

OUT = "提纲/参考资料.md"
HEAD = "| 章 | 诗人 | 系年的默认依据（与之不同处，正文与编年表逐条注明） |\n|---:|---|---|"


def chnum(p):
    return int(re.match(r"(\d+)", os.path.basename(p)).group(1))


def poet(path):
    """frontmatter 的 poet 字段。第 10 章是合传，两个名字。"""
    t = open(path, encoding="utf-8").read()
    m = re.search(r"^poet:\s*(.+)$", t, flags=re.M)
    return m.group(1).strip() if m else "—"


def basis(path):
    """章末编年表的说明行，压成一格。

    说明行的写法不统一——有的把生年与系年写成两句，有的只写一句，
    有的后面还跟着一大段本表实况。取「系年／骨架」那一句，生年若另成一句一并留。
    """
    b = body(path)
    i = b.find("## 本章诗作编年")
    if i < 0:
        return "—"
    line = ""
    for l in b[i:i + 1500].splitlines()[1:]:
        if l.strip() and not l.startswith("|"):
            line = l.strip()
            break
    line = re.split(r"，与之不同处注明", line)[0]
    line = re.sub(r"^岁数按虚岁[，。]?\s*", "", line)
    sents = [x for x in re.split(r"(?<=。)", line) if x.strip()]
    if not sents:
        return "—"
    pick = next((x for x in sents if "系年" in x or "骨架" in x), sents[0])
    born = next((x for x in sents if x.startswith("生年") and x is not pick), None)
    return "；".join(x.rstrip("。") for x in ([born] if born else []) + [pick])


def main():
    rows = [f"| {chnum(p)} | {poet(p)} | {basis(p)} |"
            for p in sorted(glob.glob("第*卷*/[0-9]*.md"), key=chnum)]
    if not rows:
        sys.exit("没有找到正文文件（本脚本要在 诗人传/ 下运行）")
    table = HEAD + "\n" + "\n".join(rows)
    s = open(OUT, encoding="utf-8").read()
    pat = r"\| 章 \| 诗人 \|.*?\n\|[-|: ]+\|\n(?:\|.*\n)+"
    if not re.search(pat, s):
        sys.exit(f"{OUT} 里找不到那张表——结构变了，先看一眼")
    open(OUT, "w", encoding="utf-8").write(re.sub(pat, table + "\n", s, count=1))
    print(f"《参考资料》的系年依据表已按 {len(rows)} 章的编年表说明行重刷")


if __name__ == "__main__":
    main()
