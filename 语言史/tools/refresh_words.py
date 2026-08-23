# -*- coding: utf-8 -*-
"""把各章 frontmatter 的 words: 回填为实测值。

审校轮与清欠账轮都只改正文、没人回填这个字段，而此前没有任何脚本会刷它——
2026-08-03 实测 35 篇里 16 篇对不上，最大差 1 241 字。
字数口径统一取 measure.count，与 style_audit / refresh_readme 同源。
"""
import re, glob, sys
from measure import count

def main():
    files = sorted(p for p in glob.glob('**/*.md', recursive=True)
                   if not p.startswith('提纲') and '_manuscript' not in p
                   and 'HANDOFF' not in p and '_卷细纲' not in p and 'README' not in p)
    changed = 0
    for p in files:
        t = open(p, encoding='utf-8').read()
        m = re.search(r'^words:\s*(\d+)\s*$', t, re.M)
        if not m:
            print(f"  ! {p} 无 words 字段"); continue
        old, new = int(m.group(1)), count(p)
        if old == new: continue
        t = t[:m.start()] + f"words: {new}" + t[m.end():]
        open(p, 'w', encoding='utf-8').write(t)
        print(f"  {p.split('/')[-1]:<30} {old:>6} → {new:<6} ({new-old:+})")
        changed += 1
    print(f"\n回填 {changed} 篇 / 共 {len(files)} 篇")
    return 0

if __name__ == '__main__':
    sys.exit(main())
