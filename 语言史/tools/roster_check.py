#!/usr/bin/env python3
"""人物谱覆盖检查。

规范 §19 要求：凡在正文点名的人，人物谱必须有条目。

以前的检查只比对各章 frontmatter 的 `people:` 字段，**查不出正文里点了名而
frontmatter 漏登的人**——2026-08-04 一次全书扫描就这样查出十一处（严实、金力、
本尼迪克特、马蒂索夫、涅夫斯基、勒博尔涅、蒂斯、萨弗兰、约翰逊、迈克尔·科、
米利塔列夫、波特曼、潘迪特、里利、居尔德曼、本顿）。本脚本改为直接扫正文。

判据：正文里以「中文名（拉丁原名…）」形式正式引入的，逐个对人物谱查。
拉丁原名命中原名列、或中文片段以某个谱内中文名结尾，即算已登记。

正则的左边界会连带抓进前面的上下文（「德国的雅各布·格林」），所以用「以谱内
名结尾」而不是等值比较。剩下的输出里语言名、文化名、机构名、地名占多数，
需人工过滤——脚本只负责把候选缩到几十条，不负责判断谁是人。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def roster_rows():
    text = (ROOT / '提纲' / '人物谱.md').read_text(encoding='utf-8')
    rows = []
    for line in text.split('\n'):
        if not line.startswith('|') or set(line) <= set('|- '):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) >= 2 and cells[0] != '中文名':
            rows.append(cells)
    return rows


def chapters():
    paths = sorted(ROOT.glob('第*/*.md')) + sorted(ROOT.glob('序章*.md')) + sorted(ROOT.glob('终章*.md'))
    return [p for p in paths if not p.name.startswith('_')]


def body(path):
    t = path.read_text(encoding='utf-8')
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S)          # 去欠账区块
    t = re.sub(r'^---\n.*?\n---\n', '', t, flags=re.S)     # 去 frontmatter
    return t


INTRO = re.compile(r'([一-鿿·]{2,12})（([A-ZÀ-Þ][A-Za-zÀ-ÿ\.\'\- ]{2,45}?)\s*[,，)）]')


def main():
    rows = roster_rows()
    cn = {r[0] for r in rows}
    lat = {r[1].lower() for r in rows if r[1] not in ('—', '')}

    dups = sorted(n for n in cn if sum(1 for r in rows if r[0] == n) > 1)
    empty = [r[0] for r in rows if len(r) >= 4 and not r[3].strip()]

    seen, hits = set(), []
    for p in chapters():
        for m in INTRO.finditer(body(p)):
            frag, name = m.group(1), m.group(2).strip()
            if name.lower() in lat or any(frag.endswith(c) for c in cn):
                continue
            if name in seen:
                continue
            seen.add(name)
            hits.append((p.name, frag, name))

    print(f'人物谱 {len(rows)} 条 · 重复中文名 {len(dups)} · 速写为空 {len(empty)}')
    if dups:
        print('  重复:', '、'.join(dups))
    if empty:
        print('  空速写:', '、'.join(empty))
    print(f'\n正文正式引入而未登记的候选 {len(hits)} 条'
          f'（语言／文化／机构／地名会混在里面，需人工过滤）：')
    for fname, frag, name in hits:
        print(f'  {fname[:12]:14s} …{frag:14s} ({name})')

    return 1 if (dups or empty) else 0


if __name__ == '__main__':
    sys.exit(main())
