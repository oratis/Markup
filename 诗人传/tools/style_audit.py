#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""文风体检。在 诗人传/ 下运行。

量五个东西，都是《写作规范》里有明文额度、而且机器数得准的：

    粗体占比   `**` 内非空白字符 ÷ 正文非空白字符。小说里粗体几乎不该出现，>3% 就报。
    教辅腔     规范第 16 条禁语表（表达了 / 抒发了 / 体现了 / 意境 / 千古名句 …），一处就报。
    「我们」   规范第 7 条：全章 ≤3。那是史话的声音，不是小说的。
    破折号     全角破折号占正文字符的千分比。姊妹书去模板轮把它从 4.9‰ 压到 3.0‰，超过 4‰ 报。
    字数 / 节  规范第 26、2 条：正文 8 000–11 000（序终 3 500–5 000）、六到九节。上下限都查。

**这些数是用来定位问题的，不是用来拉平的。**

姊妹书的教训原样带过来：(1) 这个脚本从别的书拷来时文件名没改，崩在第一个文件上，而调用命令带
着 `2>/dev/null`，于是三次把"没输出"读成"没问题"。**空输出不是通过，空输出是没跑。**
(2) 只查单边阈值的脚本，在偏差换方向那一刻就失效。上下限都要查。
(3) 单章指标看不见"每章都这么写"——看最后一行的全书汇总，不要只看分章表。
"""
import re, glob, os, sys, statistics

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure import prose, count, sections   # 一律量正文（去章末编年表），与 count() 同口径

PROLOGUE = "序章-年谱.md"
EPILOGUE = "终章-江月何年初照人.md"

BANNED = ["表达了", "抒发了", "体现了", "反映了", "寄托了", "诗人通过", "全诗",
          "意境", "情景交融", "脍炙人口", "千古名句", "传诵千古", "不朽", "家喻户晓",
          "耐人寻味", "言有尽而意无穷"]

# 文学史术语（规范第 9 条），叙事里不该出现
TERMS = ["山水田园", "盛唐气象", "沉郁顿挫", "豪放派", "婉约派", "边塞诗派", "诗圣", "诗仙", "诗佛"]


def audit(path):
    # 全部指标都按 prose() 量——编年表是数据不是叙事，
    # 清账轮会不断往它的「系年依据」栏加字，混进来会把粗体、破折号一起虚高。
    b = prose(path)
    chars = len(re.sub(r"\s", "", b))
    bold = sum(len(x) for x in re.findall(r"\*\*(.+?)\*\*", b))
    banned = [w for w in BANNED if w in b]
    terms = [w for w in TERMS if w in b]
    dashes = b.count("——")
    nb = re.sub(r"^#.*$", "", b, flags=re.M)   # 章标题本身不算互指
    xref = len(re.findall(r"第\s?[0-9一二三四五六七八九十]+\s?章|下一章|上一章|见第", nb))
    legend = len(re.findall(r"后来的书上说|后来的人说|后来人们说|后来的人都说|后来有人说", b))
    # 开场：正文第一段（去掉章标题与节标题之后的第一个非空行）
    paras = [ln.strip() for ln in re.sub(r"^#.*$", "", b, flags=re.M).splitlines() if ln.strip()]
    opener = paras[0] if paras else ""
    bare_open = bool(re.match(r"^[^。]{0,12}[0-9一二三四五六七八九十○〇]+\s?年[^。]{0,16}。$", opener)) or \
                bool(re.match(r"^[^，。]{1,8}，[^，。]{1,8}。$", opener))
    return {
        "xref": xref, "legend": legend, "bare_open": bare_open,
        "words": count(path),
        "secs": sections(path),
        "bold": bold * 100 / max(1, chars),
        "banned": banned,
        "terms": terms,
        "we": len(re.findall("我们", b)),
        "dash": dashes * 1000 / max(1, chars),
    }


def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else None


def all_files():
    files = sorted(glob.glob("第*卷*/[0-9]*.md"), key=chnum)
    if os.path.exists(PROLOGUE): files = [PROLOGUE] + files
    if os.path.exists(EPILOGUE): files = files + [EPILOGUE]
    return files


def main():
    files = sys.argv[1:] or all_files()
    if not files:
        sys.exit("没有找到任何正文文件（本脚本要在 诗人传/ 下运行）")
    missing = [f for f in files if not os.path.exists(f)]
    if missing:
        sys.exit("找不到：" + "、".join(missing) + "\n（本脚本要在 诗人传/ 下运行）")
    print(f"{'篇':22s} {'字数':>6s} {'粗体':>5s} {'我们':>4s} {'破折‰':>5s} {'节':>2s}  提示")
    bolds, dashes = [], []
    for f in files:
        a = audit(f)
        bolds.append(a["bold"]); dashes.append(a["dash"])
        tips = []
        if a["bold"] > 3: tips.append("粗体过密（小说里几乎不该有）")
        if a["banned"]: tips.append("教辅腔：" + "、".join(a["banned"]))
        if a["terms"]: tips.append("文学史术语：" + "、".join(a["terms"]))
        if a["we"] > 3: tips.append("「我们」超限（≤3）")
        if a["dash"] > 4: tips.append("破折号偏密")
        if a["xref"]: tips.append(f"章号互指 {a['xref']} 处")
        if a["legend"] > 2: tips.append(f"「后来的人说」式引出 {a['legend']} 次（≤2）")
        if a["bare_open"]: tips.append("开场疑似「年份，地点。」裸句")
        front = "序章" in f or "终章" in f
        floor = 3500 if front else 8000
        ceil = 5000 if front else 11000
        if a["words"] < floor: tips.append(f"低于字数下限 {floor}——查是不是漏了纲")
        elif a["words"] > ceil: tips.append(f"超字数上限 {ceil}——查是不是在复述诗")
        if not front and not (6 <= a["secs"] <= 9): tips.append("节数越界（六到九）")
        print(f"{os.path.basename(f)[:20]:22s} {a['words']:6d} {a['bold']:4.1f}% "
              f"{a['we']:4d} {a['dash']:5.1f} {a['secs']:2d}  {' / '.join(tips)}")
    print(f"\n全书：粗体中位 {statistics.median(bolds):.1f}% · 最高 {max(bolds):.1f}% · "
          f"破折号中位 {statistics.median(dashes):.1f}‰ · {len(files)} 篇")


if __name__ == "__main__":
    main()
