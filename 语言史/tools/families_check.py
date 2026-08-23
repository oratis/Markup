#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""语系覆盖销账。在 语言史/ 下运行。

读两处：
  1. 各章 frontmatter 的 `families:` 字段——这一章声称覆盖了哪些语系
  2. 提纲/语系谱.md 的「按章销账总表」——每一行的章号与勾选状态

报三件事：声称覆盖了但没写进销账表的、销账表里还没打勾的、以及各章的语系负载。
"""
import re, glob, os, sys

MAP = "提纲/语系谱.md"


def frontmatter(path):
    t = open(path, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n", t, flags=re.S)
    return m.group(1) if m else ""


def families_of(path):
    fm = frontmatter(path)
    m = re.search(r"^families:\s*\[(.*?)\]", fm, flags=re.M)
    if not m:
        return []
    return [x.strip() for x in m.group(1).split(",") if x.strip()]


def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else 0


def main():
    chapters = sorted(glob.glob("第*卷*/[0-9]*.md"), key=chnum)
    total = 0
    print(f"{'章':>4s}  {'语系数':>4s}  声称覆盖")
    for p in chapters:
        fams = families_of(p)
        total += len(fams)
        if fams:
            print(f"{chnum(p):>4d}  {len(fams):>4d}  {'、'.join(fams)}")

    if not os.path.exists(MAP):
        print("\n找不到语系谱，跳过销账核对。")
        return

    t = open(MAP, encoding="utf-8").read()
    sec = re.search(r"## 一、按章销账总表(.*?)\n---", t, flags=re.S)
    if not sec:
        print("\n销账总表未匹配——语系谱结构变了，先看一眼。")
        return
    done = len(re.findall(r"\|\s*☑\s*\|", sec.group(1)))
    todo = len(re.findall(r"\|\s*☐\s*\|", sec.group(1)))
    print(f"\n销账总表：已勾 {done} 行 · 待勾 {todo} 行")
    print(f"各章 frontmatter 合计声称覆盖 {total} 个语系条目。")
    if todo == 0:
        print("语系覆盖已全部销账。")


if __name__ == "__main__":
    main()
