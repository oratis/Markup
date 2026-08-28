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


def items(blk):
    """把一个欠账块拆成条目，**每条连它的缩进续行一起**。

    条目长这样——理由、出处、检索路线都写在续行里：

        - [ ] 弟弟之名无考；《勉爱行》系年须核朱谱
              —— 诗题已定位于《全唐诗》卷三九一……**纸本不可及**

    只读第一行会漏掉整条理由。2026-08-28 那一轮 `--why` 就是这么把 41 条已经
    写明了原因的条目报成「没写明为什么没清」的——**报表自己造出来的欠账**，
    姊妹书在同一个地方栽过两次。
    """
    out, cur = [], None
    for line in blk.splitlines():
        m = re.match(r"^- \[([ xX])\]\s*(.*)$", line)
        if m:
            if cur:
                out.append(cur)
            cur = [m.group(1).lower() == "x", m.group(2)]
        elif cur is not None and line.strip():
            cur[1] += "\n" + line.strip()
    if cur:
        out.append(cur)
    return out


def scan():
    rows = []
    for f in sorted(glob.glob("**/*.md", recursive=True)):
        t = open(f, encoding="utf-8").read()
        done = todo = press = 0
        for m in re.finditer(r"<!--\s*欠账:(.*?)-->", t, flags=re.S):
            for checked, text in items(m.group(1)):
                if checked: done += 1
                elif PRESS in text: press += 1
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
    ("纸本不可及（近人年谱/方志，网上无全文）", ["纸本", "年谱", "年譜", "校注", "笺注", "箋注",
                                    "汇解", "彙解", "集解", "无电子", "無電子", "未能取得电子",
                                    "未上库", "未上庫", "不在库", "不在庫", "不在维基文库", "不在維基文庫"]),
    ("已试过检索、确实查不到", ["检索路线", "檢索路線", "试过", "已取", "未检得", "未檢得", "查不到",
                       "零命中", "通检", "通檢", "逐卷", "无一手", "無一手", "皆无", "皆無",
                       "未见", "未見", "无确据", "無確據", "两说", "兩說", "无考", "無考",
                       # 下面这几个是「已经写明下一步该查哪里」的说法。它们与上面那些同性质：
                       # 条目里给了路线。2026-08-28 收工时有两条真写了路线却落进「没写明」那一档
                       # ——第 14 章甚至写到「只需查一次《长编》卷十五开宝七年的闰月月份即可定」。
                       # 报表漏掉它们，等于把做到位的活报成没做。
                       "未取到", "未取得", "算到底", "只需查", "登记备查", "登記備查",
                       "下一位", "只到", "入口更正"]),
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
        cleared_here = sum(1 for blk in re.findall(r"<!--\s*欠账:(.*?)-->", t, flags=re.S)
                           for checked, _ in items(blk) if checked)
        for m in re.finditer(r"<!--\s*欠账:(.*?)-->", t, flags=re.S):
            for checked, item in items(m.group(1)):
                if checked:
                    continue
                hit = None
                for name, keys in BUCKETS:
                    if any(k in item for k in keys):
                        hit = name
                        break
                head = item.split("\n")[0][:80]
                if hit:
                    tally[hit] += 1
                    if len(samples[hit]) < 2:
                        samples[hit].append((os.path.basename(f), head))
                elif cleared_here:
                    other.append((os.path.basename(f), head))
                else:
                    untouched.append((os.path.basename(f), head))
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
