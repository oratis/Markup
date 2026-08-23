# -*- coding: utf-8 -*-
"""给「成书前才能定」的欠账条目打上 【成书前】 标记。

这类条目已经查到底了，只能等定稿或由主编拍板，把它们和「还没核实的事实缺口」
混在一起统计会虚报欠账数。打标后统计脚本可以分三档报：已清 / 待核 / 成书前。

在 book/ 下运行。幂等：已打标的不会重复打。
"""
import re, glob, os

# 判定为「成书前/编辑决定」的特征词。宁可漏标，不可错标。
PRESS = re.compile(
    r"成书时|成书前|定稿时|定稿前|留待.{0,6}定稿|留给终校|留终校|"
    r"属编务|属主编|待主编|由主编|编辑取舍|编辑决定|署名问题|"
    r"是否具名|具名与否|是否加注|是否点名|术语表定稿"
)
TAG = "**【成书前】** "

def main():
    files = sorted(glob.glob("**/*.md", recursive=True))
    total = 0
    for f in files:
        raw = open(f, encoding="utf-8").read()
        out, changed = [], 0

        def fix_block(m):
            nonlocal changed
            blk = m.group(1)
            lines = blk.split("\n")
            for i, ln in enumerate(lines):
                if not ln.startswith("- [ ] "):
                    continue
                body = ln[6:]
                if body.startswith(TAG):
                    continue
                # 只看本条目自己（含其后的续行）
                j = i + 1
                tail = []
                while j < len(lines) and not lines[j].startswith("- ["):
                    tail.append(lines[j]); j += 1
                whole = body + " " + " ".join(tail)
                if PRESS.search(whole):
                    lines[i] = "- [ ] " + TAG + body
                    changed += 1
            return "<!-- 欠账:" + "\n".join(lines) + "-->"

        new = re.sub(r"<!--\s*欠账:(.*?)-->", fix_block, raw, flags=re.S)
        if changed:
            open(f, "w", encoding="utf-8").write(new)
            print(f"  {os.path.basename(f):30s} 打标 {changed}")
            total += changed
    print(f"合计打标 {total} 条")

if __name__ == "__main__":
    main()
