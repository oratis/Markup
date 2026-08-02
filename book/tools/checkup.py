#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全书总检。接手这个项目后跑的第一个命令。

    python3 tools/checkup.py

一屏之内回答：书有多大、有没有硬违例、有没有断链、字数同步没有、欠账剩多少。

**这个脚本取代了 HANDOFF 里原来那两段 heredoc。** 那两段有两处过时得很危险：
一是用了旧的字数口径（没去 Markdown 记号，全书虚增近一万字）；
二是把「≥8000 字、3–5 节」当成规范违例来报——2026-08 规范已经把这两条下限
取消了（下限正是让 33 篇长成同一个形状的原因）。靠人粘贴 heredoc 的东西
迟早会跟规范脱节，所以改成命令。
"""
import re, sys, os, glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import count, sections, body, _chapters
import ai_tics


def broken_links():
    out = []
    for f in glob.glob("**/*.md", recursive=True):
        if f.startswith("tools/"): continue
        txt = open(f, encoding="utf-8").read()
        for m in re.finditer(r"\]\(((?!https?:|mailto:)[^)#]+\.md)[^)]*\)", txt):
            tgt = os.path.normpath(os.path.join(os.path.dirname(f), m.group(1)))
            if not os.path.exists(tgt):
                out.append((f, m.group(1)))
    return out


def residual_placeholders(paths):
    n = 0
    for p in paths:
        n += len(re.findall(r"\[\[待核实\]\]", body(p)))
    return n


def word_drift(paths):
    bad = []
    for p in paths:
        raw = open(p, encoding="utf-8").read()
        m = re.search(r"^---\n.*?^words:\s*(\d+)\s*$", raw, flags=re.S | re.M)
        if m and int(m.group(1)) != count(p):
            bad.append((p, int(m.group(1)), count(p)))
    return bad


def debts():
    done = open_ = press = 0
    for p in glob.glob("**/*.md", recursive=True):
        if p.startswith("tools/"): continue
        for blk in re.findall(r"<!--\s*欠账:(.*?)-->", open(p, encoding="utf-8").read(), re.S):
            for st, txt in re.findall(r"^- \[([ x])\]\s*(.*?)(?=\n- \[|\n*\Z)", blk, re.S | re.M):
                # 判定口径与 debt_report.py 一致：用 in，不用 startswith。
                # 条目常写成 `**【成书前】**`，startswith 会被前面的粗体记号挡掉。
                if st == "x": done += 1
                elif "【成书前" in txt: press += 1
                else: open_ += 1
    return done, open_, press


def main():
    paths = _chapters()
    tot = sum(count(p) for p in paths)
    secs = [sections(p) for p in paths]

    print(f"\n{'═'*58}\n  《要有光——人工智能史话》总检\n{'═'*58}\n")
    print(f"  规模      {len(paths)} 篇 · {tot:,} 字")
    print(f"  节数分布  {dict(sorted((s, secs.count(s)) for s in set(secs)))}"
          f"   ← 不该整齐")

    rows = [ai_tics.scan(p) for p in ai_tics.chapters()]
    dated = sum(1 for r in rows if r["dated"])
    print(f"  年份开场  {dated}/{len(rows)}   ← 不该整齐")

    print(f"\n{'─'*58}")
    bad = ai_tics.check(rows)

    print()
    bl = broken_links()
    rp = residual_placeholders(paths)
    wd = word_drift(paths)
    d, o, pr = debts()

    def line(label, val, ok):
        print(f"  {'✓' if ok else '✗'} {label:<22}{val}")

    line("断链", f"{len(bl)} 处", not bl)
    line("正文残留 [[待核实]]", f"{rp} 处", not rp)
    line("frontmatter 字数", f"{len(wd)} 篇未同步", not wd)
    line("硬违例", f"{bad} 处", not bad)
    print(f"  · 欠账                  已清 {d} · 待核 {o} · 成书前 {pr}"
          f"（{d*100//max(d+o+pr,1)}%）")

    if bl:
        print("\n  断链明细：")
        for f, t in bl[:10]: print(f"    {f} → {t}")
    if wd:
        print("\n  字数未同步（跑 python3 tools/measure.py --sync）：")
        for p, a, b in wd[:12]: print(f"    {p}  {a:,} → {b:,}")

    print(f"\n{'═'*58}\n")
    return 1 if (bad or bl or rp) else 0


if __name__ == "__main__":
    sys.exit(main())
