#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""欠账快照。在 诗人传/ 下运行。

分三档报，因为把「还没核实的事实缺口」和「查到底了只等定稿的事」混在一起
统计会虚报欠账数：

    已清    —— `- [x]`
    待核    —— `- [ ]`，真正还需要动手的
    成书前  —— `- [ ]` 且带 **【成书前】** 标记，只能等定稿或主编拍板
"""
import re, glob, os, sys

PRESS = "【成书前"   # 兼容「【成书前】」与「【成书前·主编事项…】」两种写法

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

BUCKETS = [
    ("成书前·主编定夺", ["【成书前"]),
    ("复核未通过（上一轮打错了勾）", ["复核未通过", "複核未通過"]),
    ("纸本不可及（近人年谱/方志，网上无全文）", ["纸本", "年谱", "年譜", "校注", "笺注", "箋注", "无电子", "無電子", "未能取得电子"]),
    ("已试过检索、确实查不到", ["检索路线", "檢索路線", "试过", "已取", "未检得", "未檢得", "查不到"]),
]


def why(argv):
    """把还没打勾的条目按「为什么没清」分桶。

    **清完不等于全部打勾。** 剩下的分三种：主编才能定的、纸本才查得到的、
    真查不到的。把它们混在一个数字里，看起来像还欠 500 条，其实性质完全不同。
    """
    import collections
    tally = collections.Counter()
    samples = collections.defaultdict(list)
    other, untouched = [], []
    for f in sorted(glob.glob("**/*.md", recursive=True)):
        t = open(f, encoding="utf-8").read()
        # 该章清过没有？一条勾都没有的，它的条目还是初稿原样，
        # 「没写明原因」是理所当然，不该混进「清过却没留路线」那一档。
        cleared_here = sum(len(re.findall(r"^- \[x\]", m, flags=re.M))
                           for m in re.findall(r"<!--\s*欠账:(.*?)-->", t, flags=re.S))
        for m in re.finditer(r"<!--\s*欠账:(.*?)-->", t, flags=re.S):
            for item in re.findall(r"^- \[ \]\s*(.*)$", m.group(1), flags=re.M):
                hit = None
                for name, keys in BUCKETS:
                    if any(k in item for k in keys):
                        hit = name
                        break
                if hit:
                    tally[hit] += 1
                    if len(samples[hit]) < 2:
                        samples[hit].append((os.path.basename(f), item[:80]))
                elif cleared_here:
                    other.append((os.path.basename(f), item[:80]))
                else:
                    untouched.append((os.path.basename(f), item[:80]))
    tot = sum(tally.values()) + len(other) + len(untouched)
    print(f"未打勾的 {tot} 条，按「为什么没清」分：\n")
    for name, _ in BUCKETS:
        n = tally[name]
        if not n:
            continue
        print(f"  {n:4d}  {name}")
        for fn, it in samples[name]:
            print(f"        例：{fn} — {it}")
    if untouched:
        chs = sorted({fn for fn, _ in untouched})
        print(f"\n  {len(untouched):4d}  所在的章还没清过（条目仍是初稿原样）：{'、'.join(chs)}")
    if other:
        print(f"\n  {len(other):4d}  清过、却没写明为什么没清——**只有这一档是问题**（违反「留检索路线」这条规矩）")
        for fn, it in other[:6]:
            print(f"        例：{fn} — {it}")
    print("\n注：一条可能同时属于多类，按上表次序归第一个命中的桶。")


def main():
    if "--why" in sys.argv:
        return why(sys.argv)
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
