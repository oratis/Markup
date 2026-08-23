#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""文风体检。在 语言史/ 下运行。

量三个东西，都是《写作规范》里有明文额度、而且机器数得准的：

    粗体占比   `**` 内非空白字符 ÷ 正文非空白字符。无明文额度，实践值 10–15%。
               超过 25% 就该看一眼——加粗到那个密度等于没有重点。
    括号旁白   长于 25 字的全角括号句。规范第 28 条：每节 ≤2。
    「我们」   规范第 6 条：每章五六次封顶。

**这三个数是用来定位问题的，不是用来拉平的。**

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
"""
import re, glob, os, sys, statistics

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import body, count, sections

PROLOGUE = "序章-绵羊和马.md"
EPILOGUE = "终章-星号的另一边.md"


def audit(path):
    b = body(path)
    chars = len(re.sub(r"\s", "", b))
    bold = sum(len(x) for x in re.findall(r"\*\*(.+?)\*\*", b))
    return {
        "words": count(path),
        "secs": sections(path),
        "bold": bold * 100 // max(1, chars),
        "aside": len(re.findall(r"（[^）]{25,}）", b)),
        "we": len(re.findall("我们", b)),
    }


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
    print(f"{'篇':22s} {'字数':>6s} {'粗体':>5s} {'旁白':>4s} {'我们':>4s} {'节':>2s}  提示")
    bolds = []
    for f in files:
        a = audit(f)
        bolds.append(a["bold"])
        tips = []
        if a["bold"] >= 25: tips.append("粗体过密")
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
              f"{a['aside']:4d} {a['we']:4d} {a['secs']:2d}  {' / '.join(tips)}")
    print(f"\n粗体中位数 {statistics.median(bolds)}% · 最高 {max(bolds)}%")


if __name__ == "__main__":
    main()
