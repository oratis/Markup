#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""欠账快照。在 book/ 下运行。

分三档报，因为把「还没核实的事实缺口」和「查到底了只等定稿的事」混在一起
统计会虚报欠账数：

    已清    —— `- [x]`
    待核    —— `- [ ]`，真正还需要动手的
    成书前  —— `- [ ]` 且带 **【成书前】** 标记，只能等定稿或主编拍板
"""
import re, glob, os, sys

PRESS = "【成书前】"

def scan():
    rows = []
    for f in sorted(glob.glob("**/*.md", recursive=True)):
        t = open(f, encoding="utf-8").read()
        done = todo = press = 0
        for m in re.finditer(r"<!--\s*欠账:(.*?)-->", t, flags=re.S):
            blk = m.group(1)
            done += len(re.findall(r"^- \[x\]", blk, flags=re.M))
            for item in re.findall(r"^- \[ \]\s*(.*)$", blk, flags=re.M):
                if PRESS in item: press += 1
                else: todo += 1
        if done or todo or press:
            rows.append((os.path.basename(f), done, todo, press))
    return rows

def key(n):
    m = re.match(r"(\d+)", n)
    return int(m.group(1)) if m else (0 if "序" in n else 99)

def main():
    rows = scan()
    verbose = "-q" not in sys.argv
    D = T = P = 0
    if verbose:
        print(f"{'篇':30s} {'已清':>4s} {'待核':>4s} {'成书前':>5s}")
    for n, d, t, p in sorted(rows, key=lambda r: key(r[0])):
        D += d; T += t; P += p
        if verbose and (t or p):
            print(f"{n[:28]:30s} {d:4d} {t:4d} {p:5d}")
    tot = D + T + P
    print(f"\n合计 {tot} 条：已清 {D}（{D/tot*100:.0f}%）· 待核 {T} · 成书前 {P}")
    if T == 0:
        print("待核为 0 —— 剩下的只等定稿或主编拍板。")

if __name__ == "__main__":
    main()
