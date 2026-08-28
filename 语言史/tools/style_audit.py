#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""文风体检。在 语言史/ 下运行。

量七个东西，都是《写作规范》里有明文额度、而且机器数得准的：

    粗体占比   `**` 内非空白字符 ÷ 正文非空白字符。规范第 32 条：≤8%。
    整句粗体   加粗跨度里出现句号/问号/叹号的处数。规范第 32 条：**必须为 0**。
    括号旁白   长于 25 字的全角括号句。规范第 28 条：每节 ≤2。
    「我们」   规范第 6 条：每章五六次封顶。
    破折号     散文里每千字的个数（列表项与表格里的 `——` 是排版分隔符，不计）。
               规范第 33 条：≤4‰。这个数是量出来的不是拍的——姊妹书《要有光》实测
               4.6‰，本书去模板前 4.9‰，都太高；4‰ 是能压住而不至于把句子改瘸的线。
    「不是X是Y」规范第 33 条：每章 ≤3 处。
    订正区块   规范第 25 条之二：全书上限三处，单章正常为 0。

**这些数是用来定位问题的，不是用来拉平的。**

---

**这个脚本本身有过一次翻车，记在这里当教训。**

它是从姊妹书《要有光》原样拷过来的，而第 45–47 行的文件名（`序章-最后的问题.md`、
`第*时代*/`、`终章-要有光.md`）和第 59 行的字数下限（8000）都没改。它每次都在
第一个文件上抛 FileNotFoundError 崩掉。

**而调用它的人一直写着 `2>/dev/null`**，只看见表头没看见报错，三次把
"表头之下没有行"读成了"没有一章被标记"。

**空输出不是通过，空输出是没跑。** 凡是加了 `2>/dev/null` 的检查，都要先确认
它在正常情况下会输出什么；输出为空时，退出码必须一起看。

**第二次翻车（审校轮）**：脚本原来只查字数下限，不查上限。审校轮批量补完漏掉的
纲之后，失效模式从"写太短"翻成了"写太长"，九章越过 6500，**而脚本照报干净**。

**一个只查单边的阈值，在偏差换方向的那一刻就失效了。** 上限检查已补。

**第三次补指标（2026-08-09 去模板轮）**：前两版只量粗体的**总量**，量不出它的**形状**。
全书粗体中位数被压到 16% 的同时，1 390 处整句加粗一处没少——**密度合格，习惯照旧**。
同一轮还查出三十篇格式逐字相同的「订正」区块、三十三篇同一个句式的开头。
**凡是"每章都这么写"的东西，per-chapter 的阈值一个也拦不住**，所以这一版把
整句粗体、破折号密度、「不是X是Y」、订正区块数一并纳入，并在末尾打全书汇总。
"""
import re, glob, os, sys, statistics

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import body, count, sections

PROLOGUE = "序章-绵羊和马.md"
EPILOGUE = "终章-星号的另一边.md"


def audit(path):
    b = body(path)
    chars = len(re.sub(r"\s", "", b))
    spans = re.findall(r"\*\*((?:[^*\n]|\\\*)+?)\*\*", b)
    bold = sum(len(x) for x in spans)
    first = next((l.strip() for l in b.split("\n")
                  if l.strip() and not l.strip().startswith("#") and l.strip() != "---"), "")
    # 破折号只数散文里的。列表项的 `- **词** —— 释义` 与表格里的是排版分隔符，不是句法
    prose = "\n".join(l for l in b.split("\n")
                      if not l.lstrip().startswith(("-", "|", "*", ">")))
    pchars = len(re.sub(r"\s", "", prose))
    return {
        "words": count(path),
        "secs": sections(path),
        "bold": bold * 100 // max(1, chars),
        "sent": sum(1 for s in spans if re.search(r"[。！？]", s)),
        "aside": len(re.findall(r"（[^）]{25,}）", b)),
        "we": len(re.findall("我们", b)),
        "dash": prose.count("——") * 1000 / max(1, pchars),
        "neg": len(re.findall(r"不是[^。！？\n]{0,26}?[，、]\s*(?:而)?是", b)),
        "fix": len(re.findall(r"^> \*\*订正", b, flags=re.M)),
        # 章首「年份，地点。」独立成行——三十五篇里曾有三十三篇这么开头
        "stamp": bool(len(first) <= 34 and first.endswith("。")
                      and re.match(r"^(大约)?\s*(公元前)?\s*\d{3,4}\s*年", first)),
    }


STARS = 78          # 上一次核定的正文重构星号数（2026-08-28 两轮合并后复核）


def stars():
    """正文里的重构星号 `\*`。**这是这本书的命门**——星号是书名，任何批量改动之后先数它。

    要命的是「正文」怎么算。2026-08-28 合并那天先报成 80，查下来是把
    `第*卷*/_卷细纲.md` 也数进去了——两卷细纲里各有一个 `\*`，而细纲是工作底稿、
    不是正文（`_manuscript.md` 的 `ignore` 里写着）。**所以这里按 `_manuscript.md`
    的篇目清单数，不按目录里有什么 .md 数。**
    """
    try:
        raw = open("_manuscript.md", encoding="utf-8").read()
    except OSError:
        return None, 0
    slugs = re.findall(r"\[\[(.+?)\]\]", raw)
    paths = {os.path.basename(p)[:-3]: p for p in glob.glob("**/*.md", recursive=True)}
    n = 0
    for sl in slugs:
        if sl not in paths:
            continue
        t = open(paths[sl], encoding="utf-8").read()
        t = re.sub(r"^---.*?\n---\n", "", t, flags=re.S)
        t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
        n += len(re.findall(r"\\\*", t))
    return n, len(slugs)


def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else None


def all_files():
    return ([PROLOGUE]
            + sorted(glob.glob("第*卷*/[0-9]*.md"), key=chnum)
            + [EPILOGUE])


def main():
    files = sys.argv[1:] or all_files()
    missing = [f for f in files if not os.path.exists(f)]
    if missing:
        sys.exit("找不到：" + "、".join(missing) + "\n（本脚本要在 语言史/ 下运行）")
    print(f"{'篇':22s} {'字数':>6s} {'粗体':>5s} {'整句':>4s} {'旁白':>4s} "
          f"{'我们':>4s} {'——‰':>5s} {'不是':>4s} {'节':>2s}  提示")
    bolds, rows = [], []
    for f in files:
        a = audit(f)
        rows.append(a)
        bolds.append(a["bold"])
        tips = []
        if a["bold"] > 8: tips.append("粗体过密（上限 8%）")
        if a["sent"]: tips.append(f"整句加粗 {a['sent']} 处——改句子，不要加记号")
        if a["fix"]: tips.append(f"订正区块 {a['fix']} 处（§25之二：能融进叙事就融进去）")
        if a["dash"] > 4: tips.append(f"破折号 {a['dash']:.1f}‰（上限 4‰）")
        if a["neg"] > 3: tips.append(f"「不是X是Y」{a['neg']} 处（每章 ≤3）")
        if a["aside"] > a["secs"] * 2: tips.append(f"旁白超限（上限 {a['secs']*2}）")
        elif a["aside"] < a["secs"]: tips.append("旁白偏少")
        if a["we"] > 6: tips.append("「我们」偏多（先分辨是不是论证主语）")
        elif a["we"] < 3: tips.append("「我们」偏少，史话的声音弱了")
        front = "序章" in f or "终章" in f
        floor = 3500 if front else 4500
        ceil = 5000 if front else 6500
        if a["words"] < floor: tips.append(f"低于字数下限 {floor}")
        elif a["words"] > ceil: tips.append(f"超字数上限 {ceil}——查是不是在复述")
        if not (3 <= a["secs"] <= 5): tips.append("节数越界")
        print(f"{os.path.basename(f)[:20]:22s} {a['words']:6d} {a['bold']:4d}% "
              f"{a['sent']:4d} {a['aside']:4d} {a['we']:4d} {a['dash']:5.1f} "
              f"{a['neg']:4d} {a['secs']:2d}  {' / '.join(tips)}")

    # 全书级：单章阈值看不见的那一类——"每章都这么写"
    stamps = sum(r["stamp"] for r in rows)
    print(f"\n粗体中位数 {statistics.median(bolds)}% · 最高 {max(bolds)}%"
          f" · 整句加粗合计 {sum(r['sent'] for r in rows)}"
          f" · 订正区块合计 {sum(r['fix'] for r in rows)}（全书上限 3）"
          f" · 「不是X是Y」合计 {sum(r['neg'] for r in rows)}")
    print(f"章首「年份，地点。」独立成行：{stamps}/{len(rows)} 篇"
          + ("  ← 超过 15 篇就是模板，不是场景（§1 反模板条款）" if stamps > 15 else ""))
    n, total = stars()
    if n is not None:
        print(f"正文重构星号 `\\*`：{n}（按 _manuscript.md 的 {total} 篇篇目清单数）"
              + ("" if n == STARS else f"  ← 上一次核定是 {STARS}，**批量改动之后先查这一项**"))


if __name__ == "__main__":
    main()
