#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""跨章与章内一致性检查。在 诗人传/ 下运行。

单章的 agent 天生看不见三类错，它们只在把二十四章并排放着的时候才现形：

  1. **同一个人，各章生卒不同。** 张九龄在王维章是 678–740，在孟浩然章可能被写成
     673–740；两处都通不过对方的检验，而各自那一章读起来毫无破绽。
  2. **同一首诗，两章系了不同的年。** 穿线的诗（《奉赠王中允维》《江南逢李龟年》）
     会在两章各出现一次。
  3. **章内三处不一致**：引诗块的年份 / 「本章诗作编年」表的年份 / 章末年表块。
     清账时改了正文没改表，是这轮最危险的中断状态。

三处数据来源：各章 <!-- 人物: --> 块、正文里行内的「名（生–卒）」、提纲/人物谱.md 的主角表。
本脚本只读，不改任何文件。
"""
import re, glob, os, sys
from collections import defaultdict

ROSTER = "提纲/人物谱.md"

# 名（1234–1567） / 名（?–740） / 名（前340–前278） / 名（1799–1877）
INLINE = re.compile(
    r"([一-龥]{2,5})（"
    r"((?:前\s?)?\d{3,4}\s?[?？]?|[?？])"
    r"\s?[–—\-]\s?"
    r"((?:前\s?)?\d{3,4}\s?[?？]?|[?？])"
    r"）"
)
POEM_HEAD = re.compile(r"^>\s*《(.+?)》\s*(.*)$")
LIFESPAN = re.compile(r"(?:前?\d{3,4}\??|\?)-(?:前?\d{3,4}\??|\?)")
ORDINAL = re.compile(r"·其[一二三四五六七八九十]+$")


def norm_title(t):
    """去括注、去尾部「·其N」；保留《永遇乐·京口北固亭怀古》这类真副题。"""
    t = re.sub(r"[（(][^）)]*[）)]", "", t).strip()
    return ORDINAL.sub("", t).strip()
# 通名：这些"姓+氏"在不同章里指的是不同的人（李商隐妻王氏 / 陆游妻王氏），
# 跨章比对时一律不算冲突，只在同一章内比。
GENERIC = re.compile(r"^[一-龥]氏$")
YEAR = re.compile(r"(前?\s?\d{3,4})")


def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else (0 if "序" in p else 99)


def files():
    out = []
    if os.path.exists("序章-年谱.md"):
        out.append("序章-年谱.md")
    out += sorted(glob.glob("第*卷*/[0-9]*.md"), key=chnum)
    if os.path.exists("终章-江月何年初照人.md"):
        out.append("终章-江月何年初照人.md")
    return out


def raw(path):
    return open(path, encoding="utf-8").read()


def body(text):
    t = re.sub(r"^---.*?\n---\n", "", text, flags=re.S)
    return re.sub(r"<!--.*?-->", "", t, flags=re.S)


def norm_life(s):
    """生卒串归一：去括注与空白、全角问号、破折号统一。

    人物块的生卒格里常带「（生卒待核）」这类批注，那不是年份差异；
    但**批注本身是信号**——正文若把同一组数字当事实写着，就是骨架层
    断言了无出处之事，见写作规范 §四·19。
    """
    s = re.sub(r"[（(][^）)]*[）)]", "", s)
    s = s.strip().replace("？", "?").replace(" ", "")
    s = re.sub(r"[–—\-]", "-", s)
    return s


def block_rows(text, name):
    m = re.search(rf"<!--\s*{name}:\s*\n(.*?)-->", text, flags=re.S)
    if not m:
        return []
    rows = []
    for ln in m.group(1).splitlines():
        ln = ln.strip()
        if not ln.startswith("|") or re.match(r"^\|[\s:|-]+\|$", ln):
            continue
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if cells and cells[0] in ("名", "年"):
            continue
        rows.append(cells)
    return rows


def collect_people():
    """→ {人名: {归一生卒: [出处, ...]}}"""
    people = defaultdict(lambda: defaultdict(list))

    # 1) 各章人物块
    for p in files():
        t = raw(p)
        for r in block_rows(t, "人物"):
            if len(r) < 2:
                continue
            nm, life = r[0], norm_life(r[1])
            if life and life not in ("—", "-", "?-?"):
                people[nm][life].append(f"{os.path.basename(p)}·人物块")

    # 2) 正文行内
    for p in files():
        for nm, a, b in INLINE.findall(body(raw(p))):
            life = norm_life(a + "-" + b)
            if life != "?-?":
                people[nm][life].append(f"{os.path.basename(p)}·正文")

    # 3) 人物谱主角表
    if os.path.exists(ROSTER):
        for ln in raw(ROSTER).splitlines():
            if not ln.startswith("|"):
                continue
            cells = [c.strip() for c in ln.strip("|").split("|")]
            if len(cells) >= 4 and re.match(r"^\d+$", cells[0]):
                nm, life = cells[1], norm_life(cells[3])
                if LIFESPAN.fullmatch(life):
                    people[nm][life].append("人物谱·主角表")
    return people


def poem_id(title, first_line):
    """诗的身份 = 完整题目（保留副题）+ 首句前六字。

    **词牌不是题目。** 《如梦令》李清照有、纳兰有；《破阵子》李煜有、辛弃疾有；
    《金缕曲》纳兰一人就有两首。只按题目比对会把它们并成一首，报出一堆假的
    「同诗异年」。首句是唯一可靠的指纹。
    """
    fl = re.sub(r"[^一-龥]", "", first_line)[:6]
    return norm_title(title) + ("｜" + fl if fl else "")


def collect_poem_years():
    """→ {诗身份: {年: [章, ...]}}，年取引诗块首行里的公历数字。"""
    poems = defaultdict(lambda: defaultdict(list))
    for p in files():
        lines = body(raw(p)).splitlines()
        for i, ln in enumerate(lines):
            m = POEM_HEAD.match(ln.strip())
            if not m:
                continue
            title, head = m.group(1).strip(), m.group(2)
            # 往下找第一行真正的诗句（跳过空的 > 行）
            first = ""
            for nxt in lines[i + 1:i + 6]:
                c = nxt.strip().lstrip(">").strip()
                if c and not c.startswith("《"):
                    first = c
                    break
            ym = re.search(r"（(\d{3,4})）|(前\s?\d{3,4})", head)
            yr = (ym.group(1) or ym.group(2)).replace(" ", "") if ym else "系年不详"
            poems[poem_id(title, first)][yr].append(os.path.basename(p))
    return poems


def chapter_internal(path):
    """章内三处的年份是否打架。返回 (问题列表, 编年表行数, 成功对上引诗块的行数)。

    **必须回报匹配率。** 如果编年表的诗题与引诗块的写法对不上，比对会一条都做不成，
    而屏幕上照样打印「（无）」——这个项目已经在"空输出当通过"上栽过一次。
    """
    t = raw(path)
    b = body(t)
    probs = []

    # 引诗块：诗题 → 年
    rows = matched = 0
    unmatched = []
    quoted, lines = {}, b.splitlines()
    for i, ln in enumerate(lines):
        m = POEM_HEAD.match(ln.strip())
        if not m:
            continue
        title = norm_title(m.group(1))
        ym = re.search(r"（(\d{3,4})）|(前\s?\d{3,4})", m.group(2))
        quoted[title] = (ym.group(1) or ym.group(2)).replace(" ", "") if ym else None

    # 编年表：诗题 → 年（第 1 列年、第 3 列诗）
    front = ("序章" in path) or ("终章" in path)
    sec = re.search(r"## 本章诗作编年(.*?)(?=\n<!--|\Z)", b, flags=re.S)
    if sec:
        for ln in sec.group(1).splitlines():
            ln = ln.strip()
            if not ln.startswith("|") or re.match(r"^\|[\s:|-]+\|$", ln):
                continue
            cells = [c.strip() for c in ln.strip("|").split("|")]
            if len(cells) < 3 or cells[0] in ("年",):
                continue
            ym = YEAR.search(cells[0])
            yr = ym.group(1).replace(" ", "") if ym else None
            # 编年表自带「（点一句）」「（未引）」「（正文引六句）」等标注的，
            # 本来就不设引诗块，不算对不上。
            if re.search(r"点一句|未引|正文引|只点", cells[2]):
                continue
            for title in [norm_title(x) for x in re.split(r"[、／/]", cells[2]) if x.strip()]:
                rows += 1
                if title in quoted:
                    matched += 1
                    if yr and quoted[title] and yr != quoted[title]:
                        probs.append(f"《{title}》引诗块作 {quoted[title]}，编年表作 {yr}")
                elif not front:
                    unmatched.append(title)
    elif not front:
        probs.append("找不到「本章诗作编年」表")

    if not front:
        if not block_rows(t, "年表"):
            probs.append("缺 <!-- 年表: --> 块")
        if not block_rows(t, "人物"):
            probs.append("缺 <!-- 人物: --> 块")
    if unmatched:
        probs.append("编年表这些行在正文里找不到同名引诗块（题目写法不一，比对做不成）："
                     + "、".join(unmatched[:8]) + ("…" if len(unmatched) > 8 else ""))
    return probs, rows, matched


def comment_integrity(files):
    """注释块完整性：`<!--` 与 `-->` 必须成对，且欠账块里不能出现字面的结束标记。

    这不是洁癖。第 15 章的考据员在欠账条目里写了一个字面的 `-` `-` `>`，
    HTML 注释被提前截断，**1870 字欠账被 style_audit 当成了正文**，
    虚报成 13212 字、粗体 2.2%。机器指标被静默污染，而三个脚本都照报干净。
    **凡是靠注释圈定的区块，都要单独验一次配对。**
    """
    import re as _re
    bad = []
    for f in files:
        t = open(f, encoding="utf-8").read()
        o, c = len(_re.findall(r"<!--", t)), len(_re.findall(r"-->", t))
        if o != c:
            bad.append((f, f"<!-- {o} 个，--> {c} 个，不配对"))
            continue
        # 欠账块内不应再出现 --> （出现即说明块被提前截断）
        for m in _re.finditer(r"<!--\s*欠账:(.*?)-->", t, flags=_re.S):
            nxt = t.find("-->", m.start() + 4)
            if nxt != -1 and nxt < m.end() - 3:
                bad.append((f, "欠账块内出现提前的 -->"))
    return bad


def main():
    print("=" * 72)
    print("一、同一个人，各章生卒不一致")
    print("=" * 72)
    people = collect_people()
    hard, soft, generic = {}, {}, {}
    for nm, v in people.items():
        if len(v) <= 1:
            continue
        digits = {re.sub(r"[?]", "", k) for k in v}
        target = generic if GENERIC.match(nm) else (hard if len(digits) > 1 else soft)
        target[nm] = v

    def dump(d, label):
        print(f"\n-- {label}（{len(d)}）")
        if not d:
            print("   （无）")
        for nm in sorted(d):
            print(f"\n{nm}：")
            for life, where in sorted(d[nm].items(), key=lambda x: -len(x[1])):
                seen = sorted(set(where))
                print(f"    {life:22s} ← {'、'.join(seen[:6])}{' 等' if len(seen) > 6 else ''}")

    dump(hard, "年份真的不同——必须改")
    dump(soft, "只是写法不一（?、格式）——统一即可")
    dump(generic, "通名同姓，多半不是同一个人——人工确认")
    bad = hard

    print()
    print("=" * 72)
    print("二、同一首诗，两章系了不同的年")
    print("=" * 72)
    poems = collect_poem_years()
    multi = {t: v for t, v in poems.items() if len(v) > 1}
    if not multi:
        print("（无）")
    for t in sorted(multi):
        print(f"\n《{t}》：")
        for yr, chs in sorted(multi[t].items()):
            print(f"    {yr:12s} ← {'、'.join(sorted(set(chs)))}")

    print()
    print("=" * 72)
    print("三、章内三处不一致（引诗块 / 编年表 / 块）")
    print("=" * 72)
    n = tot_rows = tot_matched = 0
    for p in files():
        probs, rows, matched = chapter_internal(p)
        tot_rows += rows
        tot_matched += matched
        if probs:
            n += len(probs)
            print(f"\n{os.path.basename(p)}：")
            for x in probs:
                print(f"    {x}")
    if n == 0:
        print("（无）")
    rate = (tot_matched * 100 // tot_rows) if tot_rows else 0
    print(f"\n对比覆盖：编年表 {tot_rows} 行，其中 {tot_matched} 行对上了正文的引诗块（{rate}%）。"
          + ("  ← 覆盖率低于八成，上面的「无」不可信" if rate < 80 else ""))

    print()
    ci = comment_integrity(files())
    print("\n" + "=" * 72)
    print("四、注释块完整性（欠账 / 人物 / 年表）")
    print("=" * 72 + "\n")
    if ci:
        for f, why in ci:
            print(f"  {f}：{why}")
    else:
        print("（无）")
    print()
    print(f"合计：人名年份真冲突 {len(hard)} 处（写法不一 {len(soft)}、通名 {len(generic)}）"
          f" · 同诗异年 {len(multi)} 处 · 章内不一致 {n} 处")
    return 0


if __name__ == "__main__":
    sys.exit(main())
