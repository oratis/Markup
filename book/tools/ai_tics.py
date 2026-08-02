#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""去 AI 味审计：量出「工序痕迹」在正文里的密度。

在 book/ 下运行：
    python3 tools/ai_tics.py            # 全书表格
    python3 tools/ai_tics.py 10 22      # 只看某几章
    python3 tools/ai_tics.py --show 10  # 把第 10 章的命中逐条打出来

这些指标是**定位器，不是指标本身**。粗体审计那次的教训：
「我们」出现 22 次不等于 22 次叙述者插话，其中 20 次是图灵论证的主语。
所以每一项都给出上下文，让人去看，不要照着数字砍。
"""
import re, sys, glob, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import body, count

# ── 各类痕迹的正则 ───────────────────────────────────────────────────
# 1. 自指：叙述者谈论这本书自己
SELFREF = re.compile(r"这本书|本书|本章|这一章|这一节|本节|这几章|前面几章|后面几章")
# 2. 导航：给读者报进度、预告章号
NAV = re.compile(r"第[一二三四五六七八九十百0-9]{1,3}章(?:会|将|要|里|中)?(?:回来|再|还)|"
                 r"留到第|回到第|参见第|请记住|请注意|请给它|下一章|上一章|接下来[要会]讲")
# 3. 母题记账
MOTIF = re.compile(r"母题[一二三四五六七八九十0-9]?|这条线|收网|合上|兑现|回声(?!的)")
# 4. 句法套路
NOTBUT = re.compile(r"不是[^。？！\n]{1,40}?[，,]\s*(?:而)?是")
REALLY = re.compile(r"真正的(?:问题|原因|答案|意义|难处|障碍|区别|变化|新闻|转折)")
MEANING = re.compile(r"(?:这|那)件事的意义|比(?:它)?看起来[大重深难]得多|意义比")
# 5. 排版节奏
DASH = re.compile(r"——")
PAREN = re.compile(r"（[^）\n]{2,60}）")

ARABIC = "零一二三四五六七八九十"


def paras(t):
    return [p.strip() for p in re.split(r"\n\s*\n", t) if p.strip()]


def opener(t):
    """取正文第一段，判断是否「某年，某地，某人在做某事」式开场。"""
    for p in paras(t):
        if p.startswith("#") or p.startswith(">") or p.startswith("<!--"):
            continue
        first = re.split(r"[。？！]", p)[0]
        # 年份开头（1642 年 / 一九四三年 / 公元前）
        dated = bool(re.match(r"^\s*(?:公元前\s*)?(?:[0-9]{3,4}|[一二三四五六七八九十]{2,4})\s*年", first))
        return first[:46], dated
    return "", False


def scan(path):
    t = body(path)
    t = re.sub(r"^\s*#\s+.*?\n", "", t, count=1)      # 去掉章标题行
    secs = re.findall(r"^##\s+(.*)$", t, flags=re.M)
    prose = re.sub(r"^##.*$", "", t, flags=re.M)      # 小节标题不算正文句法
    ps = paras(prose)
    first, dated = opener(t)
    return dict(
        path=path, chars=count(path), secs=len(secs), paras=len(ps),
        selfref=len(SELFREF.findall(prose)),
        nav=len(NAV.findall(prose)),
        motif=len(MOTIF.findall(prose)),
        notbut=len(NOTBUT.findall(prose)),
        really=len(REALLY.findall(prose)),
        meaning=len(MEANING.findall(prose)),
        dash=len(DASH.findall(prose)),
        paren=len(PAREN.findall(prose)),
        stub=sum(1 for p in ps if len(re.sub(r"\s|\*", "", p)) <= 10 and not p.startswith(("|", ">", "-", "<"))),
        first=first, dated=dated,
    )


def chapters():
    fs = sorted(glob.glob("*.md") + glob.glob("*/*.md"))
    out = []
    for f in fs:
        if any(f.startswith(d) for d in ("提纲", "投稿", "tools")): continue
        if os.path.basename(f).startswith("_") or os.path.basename(f) in (
                "README.md", "HANDOFF.md", "凡例.md"): continue   # 凡例是体例说明，不是一篇
        out.append(f)
    # 序章、01..31、终章 的自然顺序
    def key(f):
        m = re.search(r"/(\d\d)-", f)
        return (0, 0) if "序章" in f else ((2, 0) if "终章" in f else (1, int(m.group(1)) if m else 99))
    return sorted(out, key=key)


def label(p):
    b = os.path.basename(p)
    if "序章" in b: return "序"
    if "终章" in b: return "终"
    m = re.match(r"(\d\d)-", b)
    return m.group(1).lstrip("0") if m else b


# ── 硬违例 ──────────────────────────────────────────────────────────
# 上面那些指标是**定位器**：数字高不代表有问题，要去看上下文。
# 下面这几条不一样，是**禁令**——出现即违例，不需要判断。
BANS = [
    ("母题编号进了正文",
     re.compile(r"母题[一二三四五六七八九十0-9]")),
    ("自指计数（数章数）",
     re.compile(r"(?:这本书|本书)[^。？！\n]{0,12}"
                r"(?:讲了|写到|写了|前面)[^。？！\n]{0,8}"
                r"(?:第?[一二三四五六七八九十百]{1,4}|\d{1,2})\s*章")),
    # 「香农第二次出场是 1948 年」——出场/登场是舞台动词，说的是这本书的调度，
    # 不是历史本身。历史人物不会「出场」，只有被人写进书里才会。
    ("自指计数（数出场次数）",
     re.compile(r"第[一二三四五六七八九十0-9]+次(?:出场|登场)|"
                r"(?:出场|登场)[了过]?[一二三四五六七八九十0-9]+[次回]")),
    ("正文在讲这本书怎么写",
     re.compile(r"全书(?:两个|三个)?[^。？！\n]{0,8}(?:技术高峰|高峰之一)|"
                r"按[^。？！\n]{0,10}落笔纪律|"
                r"这一章(?:要)?写得枯燥|"
                r"本(?:章|节)(?:要|不)裁决|我在这一章不裁决")),
]


def check(rows):
    """把禁令过一遍。返回违例条数；0 才算过。"""
    bad = 0
    for r in rows:
        t = re.sub(r"^##.*$", "", body(r["path"]), flags=re.M)
        t = re.sub(r"^\s*#\s+.*?\n", "", t, count=1)
        for name, rx in BANS:
            for m in rx.finditer(t):
                bad += 1
                s = max(0, m.start() - 30); e = min(len(t), m.end() + 30)
                print(f"✗ {label(r['path']):>3} [{name}] …"
                      f"{re.sub(chr(10), ' ', t[s:e])}…")
    print("─" * 60)
    print(f"{'✓ 无违例' if not bad else f'✗ {bad} 处违例'}（检查 {len(rows)} 篇）")
    return bad


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    show = "--show" in sys.argv
    rows = [scan(p) for p in chapters()]
    if args:
        rows = [r for r in rows if label(r["path"]) in args]

    if "--check" in sys.argv:
        sys.exit(1 if check(rows) else 0)

    if show:
        for r in rows:
            t = re.sub(r"^##.*$", "", body(r["path"]), flags=re.M)
            print(f"\n════ {r['path']} ════")
            for nm, rx in (("自指", SELFREF), ("导航", NAV), ("母题", MOTIF),
                           ("不是而是", NOTBUT), ("真正的", REALLY)):
                for m in rx.finditer(t):
                    s = max(0, m.start() - 24); e = min(len(t), m.end() + 24)
                    print(f"  [{nm}] …{re.sub(chr(10), ' ', t[s:e])}…")
        return

    hdr = ("章", "字数", "节", "自指", "导航", "母题", "不是而是", "真正的", "破折号", "括号", "短段", "年份开场")
    print(f"{hdr[0]:<4}{hdr[1]:>7}{hdr[2]:>4}{hdr[3]:>6}{hdr[4]:>6}{hdr[5]:>6}"
          f"{hdr[6]:>9}{hdr[7]:>7}{hdr[8]:>8}{hdr[9]:>6}{hdr[10]:>6}{hdr[11]:>10}")
    print("─" * 82)
    for r in rows:
        # 破折号按每千字归一化，长章不因为长而显得差
        d1k = r["dash"] * 1000 / max(r["chars"], 1)
        print(f"{label(r['path']):<4}{r['chars']:>7,}{r['secs']:>4}{r['selfref']:>6}{r['nav']:>6}"
              f"{r['motif']:>6}{r['notbut']:>9}{r['really']:>7}"
              f"{r['dash']:>5}/{d1k:>4.1f}{r['paren']:>6}{r['stub']:>6}"
              f"{('是' if r['dated'] else '—'):>10}")
    print("─" * 82)
    n = len(rows)
    tot = {k: sum(r[k] for r in rows) for k in
           ("chars", "selfref", "nav", "motif", "notbut", "really", "dash", "paren", "stub")}
    print(f"{'合计':<4}{tot['chars']:>7,}{'':>4}{tot['selfref']:>6}{tot['nav']:>6}{tot['motif']:>6}"
          f"{tot['notbut']:>9}{tot['really']:>7}{tot['dash']:>5}"
          f"{'':>5}{tot['paren']:>6}{tot['stub']:>6}"
          f"{sum(1 for r in rows if r['dated']):>9}篇")
    fives = sum(1 for r in rows if r["secs"] == 5)
    print(f"\n五节章：{fives}/{n}    年份开场：{sum(1 for r in rows if r['dated'])}/{n}"
          f"    破折号：{tot['dash']*1000/tot['chars']:.1f}/千字")
    print("\n各章开场首句：")
    for r in rows:
        print(f"  {label(r['path']):>3}{'✱' if r['dated'] else ' '} {r['first']}")


if __name__ == "__main__":
    main()
