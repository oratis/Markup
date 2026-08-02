# -*- coding: utf-8 -*-
"""全书统一的正文字数口径。

规范第 2 条原话是「去 frontmatter、去 HTML 注释、去所有空白后的字符数」。
但它没说 Markdown 标记怎么算，而早先的脚本把 `**` 也数成了正文——
在粗体占比高的章里这会虚增几百字，全书合计近一万字。**加粗记号不是正文。**

2026-08-01 起口径统一为：去 frontmatter、去 HTML 注释、**去 Markdown 强调
与代码记号**、去所有空白，再数字符。
"""
import re

MARKS = re.compile(r"\*\*|\*|`|~~")

def body(path):
    t = open(path, encoding="utf-8").read()
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    return re.sub(r"^---.*?\n---\n", "", t, flags=re.S)

def count(path):
    return len(re.sub(r"\s", "", MARKS.sub("", body(path))))

def sections(path):
    return len(re.findall(r"^## ", body(path), flags=re.M))


# ── CLI ─────────────────────────────────────────────────────────────
# 此前 frontmatter 同步是 HANDOFF.md 里的一段 heredoc，靠人粘贴。
# 十几个 agent 各粘一遍，迟早有人粘错——改成命令。
#     python3 tools/measure.py                 # 只报告，不写
#     python3 tools/measure.py --sync          # 回填 words:
#     python3 tools/measure.py --sync 第五时代-涌现/29-*.md

def _chapters():
    import glob, os
    fs = sorted(glob.glob("*.md") + glob.glob("*/*.md"))
    return [f for f in fs
            if not any(f.startswith(d) for d in ("提纲", "投稿", "tools"))
            and not os.path.basename(f).startswith("_")
            # 凡例是前言性质的体例说明，不算「一篇」，也没有 words: 字段
            and os.path.basename(f) not in ("README.md", "HANDOFF.md", "凡例.md")]


def _main():
    import sys, glob
    args = sys.argv[1:]
    write = "--sync" in args
    pats = [a for a in args if not a.startswith("--")]
    paths = sorted({p for a in pats for p in glob.glob(a)}) if pats else _chapters()

    drift = 0
    for p in paths:
        raw = open(p, encoding="utf-8").read()
        n = count(p)
        m = re.search(r"^(---\n.*?^words:\s*)(\d+)(\s*$)", raw, flags=re.S | re.M)
        if not m:
            print(f"⚠ {p}：frontmatter 里没有 words: 字段")
            continue
        old = int(m.group(2))
        if old == n:
            continue
        drift += 1
        print(f"{'✎' if write else '·'} {p}  {old:,} → {n:,}  （{n-old:+,}）")
        if write:
            open(p, "w", encoding="utf-8").write(raw[:m.start(2)] + str(n) + raw[m.end(2):])

    tot = sum(count(p) for p in paths)
    print(f"\n{len(paths)} 篇 · {tot:,} 字 · {drift} 篇字数未同步"
          + ("（已回填）" if write and drift else "（跑 --sync 回填）" if drift else ""))


if __name__ == "__main__":
    _main()
