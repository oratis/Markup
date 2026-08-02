#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""事实护栏：改文风的时候，盯住不该动的东西。

这一轮改的是**怎么说**，不是**说什么**。风险在于 agent 为了顺句子，
悄悄丢掉一个年份、改掉一个数字、把引号里的话顺手改顺——
这种损失事后极难发现，因为改完的句子读起来更好。

用法（在 book/ 下）：

    python3 tools/fact_guard.py snap  第五时代-涌现/29-*.md      # 改之前：存一份指纹
    python3 tools/fact_guard.py diff  第五时代-涌现/29-*.md      # 改之后：比对

    python3 tools/fact_guard.py snap --all                       # 全书
    python3 tools/fact_guard.py diff --all

指纹存在 tools/.factsnap/ 下，不入 git。

**diff 报出的每一条增删，都必须是改稿人有意为之并能说出理由的。**
不是"看起来没问题"，是"我知道我删了它，因为……"。
"""
import re, sys, os, json, glob, hashlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import body

SNAPDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".factsnap")

# ── 需要盯住的东西 ──────────────────────────────────────────────────
# 年份：1642 年 / 2026 年 / 公元前 4 世纪 也一并收
YEAR  = re.compile(r"(?:公元前\s*)?[0-9]{3,4}\s*(?:年|世纪)")
# 一切数字（含小数、千分位、百分比、量词后缀），这是最容易被顺手改掉的
NUM   = re.compile(r"[0-9]+(?:[.,][0-9]+)*\s*(?:%|％|万|亿|千|百|倍|次|页|卷|期|层|个|人|台|块|美元|英镑|马克)?")
# 引号里的话：直引号、弯引号、直角引号都收。
# 开头是标点的一律不算——那说明引号配对错位了，截到的是两段无关引文中间的部分。
QUOTE = re.compile(r"[\"“][^\"“”\n，。、；：？！]{1}[^\"“”\n]{3,}?[\"”]|"
                   r"「[^」\n]{4,}?」|『[^』\n]{4,}?』")

# 跨章导航里的章号**不是事实**，是路标。这一轮的活儿就是删路标，
# 若不先摘掉，diff 会被几十条「− [数字] 19」淹掉，真正的事实变动反而看不见。
# 要连「第 19、24 章」「第 3、11 章」这种合并写法一起摘掉——书里到处是。
NAV_NUM = re.compile(r"第\s*[0-9]+(?:\s*[、，,及和与]\s*[0-9]+)*\s*"
                     r"(?:章|节|版|卷|期|页|条|款|届|代)")
# 「订正」区块的标题——这些是全书最值钱的部分，一个都不许丢
CORR  = re.compile(r"^>\s*\*\*订正\s*·\s*(.+?)\*\*", re.M)
# 外文原名括注（Rosenblatt / Perceptrons / arXiv 编号等）
LATIN = re.compile(r"[A-Za-z][A-Za-z''\-\.]{2,}(?:\s+[A-Za-z''\-\.]{2,})*")


def facts(path):
    t = body(path)
    return {
        "year":  sorted(YEAR.findall(t)),
        "num":   sorted(n.strip() for n in NUM.findall(NAV_NUM.sub("", t))),
        "quote": sorted(re.sub(r"\s+", "", q) for q in QUOTE.findall(t)),
        "corr":  sorted(CORR.findall(t)),
        "latin": sorted(set(LATIN.findall(t))),
    }


def key(path):
    return hashlib.md5(path.encode("utf-8")).hexdigest()[:12] + ".json"


def targets(args):
    if "--all" in args:
        fs = sorted(glob.glob("*.md") + glob.glob("*/*.md"))
        return [f for f in fs if not any(f.startswith(d) for d in ("提纲", "投稿", "tools"))
                and not os.path.basename(f).startswith("_")
                and os.path.basename(f) not in ("README.md", "HANDOFF.md")]
    out = []
    for a in args:
        if a.startswith("--"): continue
        out.extend(sorted(glob.glob(a)))
    return out


def snap(paths, rev=None):
    """存指纹。给了 rev 就从那个 git 版本存，否则从工作区当前文件存。

    `--git HEAD` 用于事后补基线：改了正则、或者忘了在动手前 snap，
    只要待改的章还没提交，HEAD 里就是改之前的样子。
    """
    import subprocess, tempfile
    os.makedirs(SNAPDIR, exist_ok=True)
    n = 0
    for p in paths:
        src = p
        if rev:
            r = subprocess.run(["git", "show", f"{rev}:book/{p}"], capture_output=True)
            if r.returncode:
                print(f"  ⚠ {p}：{rev} 里没有这个文件，跳过"); continue
            with tempfile.NamedTemporaryFile("wb", suffix=".md", delete=False) as f:
                f.write(r.stdout); src = f.name
        with open(os.path.join(SNAPDIR, key(p)), "w", encoding="utf-8") as f:
            json.dump({"path": p, "facts": facts(src)}, f, ensure_ascii=False)
        if rev: os.unlink(src)
        n += 1
    print(f"{n} 篇指纹已存入 {SNAPDIR}" + (f"（取自 {rev}）" if rev else ""))


LABEL = {"year": "年份", "num": "数字", "quote": "引文", "corr": "订正区块", "latin": "外文原名"}


def diff(paths):
    bad = 0
    for p in paths:
        fp = os.path.join(SNAPDIR, key(p))
        if not os.path.exists(fp):
            print(f"⚠ {p}：没有改前指纹，无法比对"); bad += 1; continue
        old = json.load(open(fp, encoding="utf-8"))["facts"]
        new = facts(p)
        lines = []
        for k in ("corr", "quote", "year", "num", "latin"):
            o, n = list(old[k]), list(new[k])
            for x in set(o):                       # 按出现次数比，不只比集合
                d = o.count(x) - n.count(x)
                if d > 0: lines.append(f"    − [{LABEL[k]}] {x}" + (f" ×{d}" if d > 1 else ""))
            for x in set(n):
                d = n.count(x) - o.count(x)
                if d > 0: lines.append(f"    + [{LABEL[k]}] {x}" + (f" ×{d}" if d > 1 else ""))
        if lines:
            bad += 1
            print(f"\n▸ {p}  （{len(lines)} 处变动，每一处都要能说出理由）")
            for l in lines[:60]: print(l)
            if len(lines) > 60: print(f"    …… 另有 {len(lines)-60} 处")
        else:
            print(f"✓ {p}  事实层零变动")
    print(f"\n{'─'*60}\n{len(paths)} 篇，{bad} 篇有变动或缺指纹")
    return bad


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("snap", "diff"):
        print(__doc__); sys.exit(1)
    argv = sys.argv[2:]
    rev = None
    if "--git" in argv:
        i = argv.index("--git")
        rev = argv[i + 1] if i + 1 < len(argv) else "HEAD"
        argv = argv[:i] + argv[i + 2:] if rev != "HEAD" or (
            i + 1 < len(argv) and not argv[i + 1].startswith("-")) else argv[:i] + argv[i + 1:]
    ps = targets(argv)
    if not ps:
        print("没有匹配到文件"); sys.exit(1)
    if sys.argv[1] == "snap":
        snap(ps, rev); sys.exit(0)
    sys.exit(1 if diff(ps) else 0)
