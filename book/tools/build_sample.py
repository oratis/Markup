#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成给出版社的试读本（HTML → 交给 headless Chrome 打印成 PDF）。

在 book/ 下运行：
    python3 tools/build_sample.py [输出 HTML 路径]

试读本的结构分四段：
    一、关于这本书          —— 立意与写法，四百字
    二、全书导览            —— 五个时代、七条母题、三十三篇章目一览（一句话 + 人物 + 实测字数）
    三、七个节点            —— 序章 + 六章正文，每章对应这段历史上的一个转折年份
    四、全书概况            —— 规模、完成度、配套材料、对标、排版前待定

选篇理由写在 SAMPLE 里，改选篇只改那张表；章目一览与全书概况的数字全部从
文件实测，不手写。排版口径与屏幕阅读稿不同：这里是印刷品，要分页、要页眉
页脚、不要交互。
"""
import re, sys, os, html, glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_html import md_to_html, parse, collect   # 复用同一套 Markdown 转换与文件收集
from measure import count, sections
from debt_report import scan as scan_debts


def curly(text):
    """把 ASCII 直引号按出现次序配成中文弯引号。

    书稿里用的是直引号（4,000 余处），纯文本里没问题，**印刷品上是错的**。
    只在渲染时转换，不动源文件——引号体例是全书性的排版决策，该由作者定。
    代码段内不转。已验过全书直引号成对且无跨段落单。
    """
    out, opening, in_code = [], True, False
    for ch in text:
        if ch == "`":
            in_code = not in_code
            out.append(ch)
        elif ch == '"' and not in_code:
            out.append("“" if opening else "”")
            opening = not opening
        else:
            out.append(ch)
    return "".join(out)

# ── 选篇 ──────────────────────────────────────────────────────────────
# (路径, 章标, 标题, 节点年份, 选它的理由)
# 按「节点」选：除序章外，每一篇对应这段历史上的一个转折年份；六个年份连起来，
# 正是从「问题被提出」（1950）到「问题到期」（2020 年代）的那条线。
SAMPLE = [
    ("序章-最后的问题.md", "序章", "最后的问题", "1956",
     "全书的立意与声音。四千字，读完就知道这本书想干什么，以及它为什么叫这个名字。"
     "编辑通常只看头两千字就决定要不要往下读——序章正是为这两千字写的。"),
    ("第二时代-计算/08-机器会思考吗.md", "第 8 章", "机器会思考吗", "1950",
     "图灵把一个吵了三百年的哲学问题，改写成一场可以打赌的游戏；"
     "并在同一篇论文里把九种反对意见逐条答完——那份清单至今没有第十条。"
     "全书思想上的枢纽，第 29 章会回到这里。"),
    ("第三时代-网络/19-三个人的坚持.md", "第 19 章", "三个人的坚持", "2012",
     "一个基金会、一个数据集、两块打游戏的显卡，2012 年一起收网。"
     "被主流判死二十年的那条路如何翻盘——全书的第一个高潮，也是写人的能力的样本。"),
    ("第四时代-注意力/22-你只需要注意力.md", "第 22 章", "你只需要注意力", "2017",
     "八个人删掉了循环，只留下注意力：今天所有大模型的骨架是怎么来的。"
     "全书技术密度最高的一章，用一个能在纸上算完的例子讲透。"),
    ("第四时代-注意力/24-尺度定律.md", "第 24 章", "尺度定律", "2020",
     "一张跨越七个数量级的直线图，把「更大就是更好」从直觉变成公式，从公式变成投资决策——"
     "今天的产业结构就是从这一页纸上长出来的。附「参数量已经追平人脑」的订正。"),
    ("第五时代-涌现/26-对齐.md", "第 26 章", "对齐", "2022",
     "11 月 30 日，一个只有一个输入框的网页上线。底下的模型两年前就存在，新的只是一套让它听话的办法——"
     "这一章讲清楚：它解决的为什么是形式问题，而不是能力问题。"),
    ("第五时代-涌现/29-让它想久一点.md", "第 29 章", "让它想久一点", "2024",
     "第一次，模型变强不靠把模型做得更大：把算力从训练挪到思考，数学奥赛拿了金牌。"
     "离今天最近的一个节点（写到 2026 年夏），也是本书处理未定论争议的样本——双方并列，不裁决；"
     "末节回到第 8 章，对模仿游戏做一次告别。"),
]

PITCH = """《要有光》是一部人工智能史话：**用讲故事的方式，把这门学科三千年的来路写成一本普通人读得下去的书**，
同时把它的基本概念——什么是学习、什么是神经网络、什么是注意力——讲到不需要任何数理背景也能懂。

写法是人物传记与科学进展混写：**一章一场戏**，每章开头一定是一个具体场景——某年某月，某地，
某个人在做一件具体的事——而不是"随着技术的发展"那种背景介绍。全书五个时代、31 章，
加序章与终章共 33 篇，约 30 万字，初稿已完成。"""

# ── 导览 ──────────────────────────────────────────────────────────────
# (目录, 时代名, 跨度, 一句话)。跨度与一句话取自提纲/全书提纲.md §二。
ERAS = [
    ("第一时代-寓言",   "一 · 寓言",   "史前 — 1943", "还没有神经元的时候，人类已经把人工智能想了三千年"),
    ("第二时代-计算",   "二 · 计算",   "1943 — 1993", "用逻辑和符号造智能：辉煌的开局，两场冬天的结局"),
    ("第三时代-网络",   "三 · 网络",   "1969 — 2016", "被一本书埋掉的那条路，如何用四十年爬回来"),
    ("第四时代-注意力", "四 · 注意力", "2014 — 2022", "一个 2017 年的架构，吞掉了所有模态"),
    ("第五时代-涌现",   "五 · 涌现",   "2022 — 至今", "规模带来了没人预订的能力，以及没人准备好的问题"),
]

QUESTION = """一个问题，三千年。**机器能不能思考？**——从偃师把假人献给周穆王，到笛卡尔断言动物只是钟表，
到阿达·洛夫莱斯写下「分析机不能创造任何东西」，到图灵把问题改写成一场模仿游戏，
到今天你对着一个模型说话而它答得像人。

这本书不打算回答这个问题。它要做的是**把三千年的追问排成一条线**，让读者看见：每一代人都以为自己找到了答案，
每一代人的答案都被下一代拆掉，而拆掉之后留下的零件，最后拼成了我们今天见到的东西。

书名来自阿西莫夫 1956 年的短篇《最后的问题》——达特茅斯会议的同一年。宇宙的尽头，
一台吞掉了全部能量与信息的计算机终于算出了如何逆转熵增，于是它说出四个字，重新点亮了宇宙。
**智能，也许就是宇宙对抗无序的方式。** 这是全书的隐喻，也是书名的来处。"""

ERAS_NOTE = """分期不按十年切，按**范式**切——按「这一代人到底认为思考是什么」。每个时代都有一个明确的技术断点作为起止，
而跨度故意重叠：真实的历史里，符号主义的黄昏和反向传播的黎明是同时发生的，注意力机制诞生时深度学习正在巅峰。
每个时代的开头都有一段话交代「此刻另一条线上正在发生什么」。"""

MOTIFS = [
    ("钟摆", "符号 vs 联结、逻辑 vs 学习，七十年里来回摆了四次。终章的结论是：这场争论没有分出胜负，它被合并了。"),
    ("被过早埋葬的思想", "反向传播被独立发现三四次、LSTM 论文被拒、感知机被一本书埋掉十年、注意力起初只是块补丁。"
                  "真正需要解释的不是「为什么没人想到」，而是「为什么想到了也没人听」。"),
    ("命名的力量", "robot、artificial intelligence、deep learning、attention、hallucination——"
              "每一次命名都不是纯技术选择，而每一次都改变了钱和人的流向。"),
    ("预言与打脸", "从西蒙的「十年内下棋冠军」到「这条曲线会拐弯」。最锋利的一次，是所有人都以为它会拐，它没有。"),
    ("算得动了", "每一次突破背后都是同一句大白话：这次终于算得动了。到第 29 章它换了形态——算力从训练挪到了推理。"),
    ("洛夫莱斯的问题", "机器能创造吗？从 1843 年的 Note G 一路问到今天；问题没被回答，但它自己在变形——"
                "到第 30 章，问的已经是创造物属于谁。"),
    ("光与熵", "智能作为对抗无序的方式。序章从阿西莫夫出发，第 7 章落到香农的熵，终章收线：三十一章每一次进步都是这句话的一个实例。"),
]

LOOPS = """**序章**不讲历史，讲问题：用阿西莫夫的宇宙尽头当镜头，然后倒回三千年。**终章**闭三个环——
**阿西莫夫的环**（AC 靠吞下整个宇宙的信息说出「要有光」，今天的模型靠吞下整个互联网），
**洛夫莱斯的环**（把第 4 章那句「分析机不能创造」原文重放一次，然后不给答案），
**布莱切利的环**（第 8 章图灵在那座庄园里解密码，第 31 章各国首脑在同一座庄园里签宣言）。
结尾不抒情收束：这段历史还在写，最后一段把读者留在时间线的断口上。"""

STYLE = """- **一章一场戏。** 每章开头一定是一个具体场景，不是「随着技术的发展」；每章 8 000–12 000 字、3–5 节，章末的钩子指向下一章。
- **科学解释不超过全章三分之一**（技术高峰章可到一半），每个概念只给三样东西：一个比喻、一个能在纸上算完的最小例子、一句「它解决了此前解决不了的什么」。全书公式不到五个。
- **术语第一次出现给中英对照**，此后统一用中文；人物译名全书唯一，见人物谱。
- **不编造。** 场景可以还原，但历史人物的对话、心情、当天的天气不替他们发明；拿不准的地方直说「有一种说法」。
- **「订正」区块。** 凡遇流传广而站不住的说法，正文里用独立区块处理，固定两栏：「流传的说法」与「可查的是」。全书十二处：
  布拉格魔像（第 1 章）、《易经》与二进制（3）、砸雅卡尔织机（4）、「一起放电的细胞连在一起」（6）、香农的熵是怎么得名的（7）、
  毒苹果与《白雪公主》（8）、伏特加与烂肉（11）、「每开掉一个语言学家」（17）、「斯金纳把女儿养在箱子里」（18）、
  「AlphaGo 从零自学围棋」（20）、「参数量已经追平人脑」（24）、「AlphaFold 解决了蛋白质折叠问题」（25）。"""

# ── 概况 ──────────────────────────────────────────────────────────────
COMPARE = """- **对标**：曹天元《上帝掷骰子吗》、吴军《浪潮之巅》；英文可比 Melanie Mitchell《AI 3.0》、Cade Metz《Genius Makers》。
- **差异**：前者多为通史或群像，本书把「较真」做成了体例——「订正」区块与全书的存疑标注是可以直接展示给读者的东西；
  第五时代六章写到 2026 年夏，是同类书里离当下最近的一段。"""

PENDING = """- **引号体例**：正文现为直引号，排版前统一为弯引号或直角引号（本试读本已在渲染时临时转为弯引号，源稿未动）。
- **引文注释体例**：全书引文目前只在行文里交代出处，定体例时一并统一。
- **时效表述**：终章「本书写到 2026 年年中」须在定稿时换成实际日期，全书 42 处时效句已列清单、分三档，照单一次做完。"""


# ── 数据 ──────────────────────────────────────────────────────────────

def outline_lines():
    """从提纲/全书提纲.md §四 取每章的一句话与主要人物。键：章号（序=0，终=99）。"""
    text = open("提纲/全书提纲.md", encoding="utf-8").read()
    sec = text.split("## 四、章目一览", 1)[1].split("\n## ", 1)[0]
    rows = {}
    for ln in sec.split("\n"):
        if not ln.startswith("| "):
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        head = cells[0]
        if head in ("章", "") or head.startswith("-"):
            continue
        if head.isdigit():
            n = int(head)
        elif head == "序":
            n = 0
        elif head == "终":
            n = 99
        else:
            continue
        # 序/终 四列（章 标题 一句话 字数），正文章五列（章 标题 一句话 人物 字数）
        one = cells[2]
        people = cells[3] if len(cells) >= 5 else ""
        rows[n] = (one, people)
    return rows

def chapters():
    """全书 33 篇：(章号, 章标, 标题, 时代目录, 路径, 字数)。序=0，终=99。"""
    out = []
    for anchor, kind, era, title, path in collect():
        if kind == "appendix":
            continue
        n = int(anchor.split("-")[1])
        label, name = title.split(" · ", 1) if n in (0, 99) else (f"第 {n} 章", re.sub(r"^第 \d+ 章 · ", "", title))
        name = re.sub(r"([\u4e00-\u9fff])([A-Za-z])", r"\1 \2", name)   # 万物皆可Transformer → 万物皆可 Transformer
        out.append((n, label, name, os.path.dirname(path), path, count(path)))
    return out

def index_rows(path):
    """人物谱 / 时间线的条目数：数表格数据行。"""
    n = 0
    for ln in open(path, encoding="utf-8"):
        if ln.startswith("| ") and not re.match(r"^\|\s*(中文名|时间|-)", ln):
            n += 1
    return n

def h(s):
    return html.escape(s, quote=False)

def md(s, linkmap):
    return md_to_html(curly(s), linkmap)


# ── 组装 ──────────────────────────────────────────────────────────────

def build(out_path):
    linkmap = {}          # 试读本内不做跨章跳转，链接一律降为纯文本
    chs = chapters()
    lines = outline_lines()
    picked = {p for p, *_ in SAMPLE}
    total = sum(c for *_, c in chs)
    sample_total = sum(count(p) for p, *_ in SAMPLE)
    by_era = {d: [c for c in chs if c[3] == d] for d, *_ in ERAS}
    parts = []

    # 封面
    parts.append(f"""
<section class="cover">
  <div class="deco">要 有 光</div>
  <h1>要有光</h1>
  <p class="sub">人 工 智 能 史 话</p>
  <p class="tag">试读本 · 全书导览与七篇</p>
  <p class="meta">一部写给普通读者的人工智能通史<br>兼一本不用公式也能读懂的 AI 概念入门</p>
</section>""")

    # 一、关于这本书
    parts.append(f"""
<section class="front flow">
  <div class="kicker">一</div>
  <h2>关于这本书</h2>
  {md(PITCH, linkmap)}
</section>""")

    # 二、全书导览
    era_rows = "".join(
        f"<tr><td><b>{h(name)}</b></td><td class=n>{h(span)}</td>"
        f"<td class=n>{by_era[d][0][0]}–{by_era[d][-1][0]}</td>"
        f"<td>{h(curly(one))}</td><td class=r>{sum(c for *_, c in by_era[d]):,}</td></tr>"
        for d, name, span, one in ERAS)
    era_table = f"""<div class="tw"><table class="eras">
<thead><tr><th>时代</th><th>跨度</th><th>章</th><th>一句话</th><th class=r>字数</th></tr></thead>
<tbody>
<tr><td><b>序章</b></td><td class=n>—</td><td class=n>—</td><td>{h(curly(lines[0][0]))}</td><td class=r>{chs[0][5]:,}</td></tr>
{era_rows}
<tr><td><b>终章</b></td><td class=n>—</td><td class=n>—</td><td>{h(curly(lines[99][0]))}</td><td class=r>{chs[-1][5]:,}</td></tr>
</tbody></table></div>"""
    motifs = "".join(f"<li><b>{h(k)}</b>——{h(curly(v))}</li>" for k, v in MOTIFS)
    parts.append(f"""
<section class="front">
  <div class="kicker">二</div>
  <h2>全书导览</h2>
  <h3>这本书要回答什么</h3>
  {md(QUESTION, linkmap)}
  <div class="keep">
  <h3>五个时代</h3>
  {md(ERAS_NOTE, linkmap)}
  {era_table}
  </div>
  <h3>贯穿全书的七条母题</h3>
  <p>史话之所以是「话」而不是编年表，靠的是反复回归的线索。这七条每一条至少在四个时代里出现，出现时要让读者认出「又是它」：</p>
  <ol class="motifs">{motifs}</ol>
  <h3>开头、结尾与三个回环</h3>
  {md(LOOPS, linkmap)}
  <h3>体例</h3>
  {md(STYLE, linkmap)}
</section>""")

    # 章目一览（单独起页：三十三行的表）
    def ch_row(n, label, name, d, path, c):
        one, people = lines.get(n, ("", ""))
        star = "★ " if path in picked else ""
        return (f"<tr class=\"{'pick' if path in picked else ''}\">"
                f"<td class=n>{star}{h(label if n in (0, 99) else str(n))}</td>"
                f"<td class=t>{h(name)}</td><td>{h(curly(one))}</td>"
                f"<td class=p>{h(people)}</td><td class=r>{c:,}</td></tr>")
    body_rows = []
    body_rows.append(ch_row(*chs[0]))
    for d, name, span, _ in ERAS:
        body_rows.append(f'<tr class="era"><td colspan="5">第{name}（{h(span)}）</td></tr>')
        body_rows.extend(ch_row(*c) for c in by_era[d])
    body_rows.append(ch_row(*chs[-1]))
    parts.append(f"""
<section class="front">
  <h2>章目一览</h2>
  <p class="legend">三十三篇按书中原序。「一句话」是每章的叙事任务，字数为正文实测；★ 为本试读本收录的篇目。</p>
  <div class="tw"><table class="toc">
  <thead><tr><th>章</th><th>标题</th><th>一句话</th><th>主要人物</th><th class=r>字数</th></tr></thead>
  <tbody>{"".join(body_rows)}</tbody>
  </table></div>
</section>""")

    # 三、本试读本收录
    picks = "".join(
        f'<li><span class="yr">{h(y)}</span><b>{h(t)} · {h(n)}</b>（{count(p):,} 字）—— {h(curly(why))}</li>'
        for p, t, n, y, why in SAMPLE)
    parts.append(f"""
<section class="front">
  <div class="kicker">三</div>
  <h2>本试读本收录：七个节点</h2>
  <p>选篇按「节点」选。除序章外，每一篇对应这段历史上的一个转折年份：1950 年问题被改写成一场游戏，
  2012 年被判死的那条路翻盘，2017 年一个架构吞掉所有模态，2020 年「更大就是更好」被写成公式，
  2022 年它走进所有人的手机，2024 年它学会了想久一点——然后回到 1950 年那道题，宣布它到期了。
  六个年份连起来，就是全书的骨架；早期三个时代的来路，见前面的导览与章目一览。</p>
  <ul class="picks">{picks}</ul>
  <p class="note">七篇合计约 {sample_total:,} 字，按书中原序排列，可连读。第 22、24 两章是全书技术密度最高的段落，
  也是「不用公式也能读懂」这句话的检验点；第 8、29 两章首尾相扣——图灵 1950 年那次换题，到 2020 年代自己成了需要被换掉的问题。</p>
</section>""")

    # 正文
    for path, label, title, year, _ in SAMPLE:
        fm, body, _ = parse(path)
        body = curly(re.sub(r"^\s*#\s+.*?\n", "", body, count=1))
        syn = fm.get("synopsis", "")
        parts.append(f"""
<section class="chapter">
  <header class="chh"><div class="label">{h(label)}<span class="node">节点 · {h(year)}</span></div>
  <h1>{h(title)}</h1>
  {f'<p class="syn">{h(curly(syn))}</p>' if syn else ''}</header>
  {md_to_html(body, linkmap)}
</section>""")

    # 四、全书概况
    target = {"第一时代-寓言": 47000, "第二时代-计算": 70000, "第三时代-网络": 79000,
              "第四时代-注意力": 52000, "第五时代-涌现": 64000}
    size_rows = "".join(
        f"<tr><td>第{h(name)}</td><td class=n>{len(by_era[d])}</td>"
        f"<td class=r>{sum(c for *_, c in by_era[d]):,}</td><td class=r>{target[d]:,}</td></tr>"
        for d, name, *_ in ERAS)
    size_table = f"""<div class="tw"><table class="sizes">
<thead><tr><th>部分</th><th>篇数</th><th class=r>字数（实测）</th><th class=r>目标</th></tr></thead>
<tbody>
<tr><td>序章</td><td class=n>1</td><td class=r>{chs[0][5]:,}</td><td class=r>4,000</td></tr>
{size_rows}
<tr><td>终章</td><td class=n>1</td><td class=r>{chs[-1][5]:,}</td><td class=r>5,000</td></tr>
<tr class="sum"><td>合计</td><td class=n>{len(chs)}</td><td class=r>{total:,}</td><td class=r>320,000</td></tr>
</tbody></table></div>"""
    D = T = P = 0
    for _, d, t, p in scan_debts():
        D += d; T += t; P += p
    over = [(n, c) for n, _, _, _, _, c in chs if c > 12000]
    over_note = ("；" + "、".join(f"第 {n} 章 {c:,} 字" for n, c in over) + "略超上限（补的都是真内容，未压缩）") if over else ""
    status = f"""- **初稿全部完成**：33 篇（序章 + 31 章 + 终章），已过一轮逐章事实核查与一轮文风打磨，第 1–17 章另过一轮逐章精校。
- **事实核查**：全书标出 {D+T+P} 条须回到一手来源的事实，已清 {D} 条（{D/(D+T+P)*100:.1f}%）。余 {T+P} 条：
  {T} 条是第 29 章一处反方意见的出处（按争论纪律，补不出也不删）；{P} 条是终章的定稿日，只能等定稿。
- **篇幅纪律**：每章 8 000–12 000 字、3–5 节{over_note}。"""
    people_n, timeline_n = index_rows("提纲/人物谱.md"), index_rows("提纲/时间线.md")
    support = f"""- **人物谱**：{people_n} 人，含译名、原名、生卒年、一句速写与出场章；译名全书唯一。在世者只给生年；查不到的写「未见记载」，不倒推。
- **时间线**：{timeline_n} 条编年条目，与正文互校——叙事按范式分期而时间线按年排，两者对不上的地方正是需要「此刻另一条线」过渡段的地方。
- **参考资料**：分层书目与一手文献清单，每章引用的日期、数字、引文可回溯。
- **全稿**：三十三篇随时可以提供，另有单文件 HTML 阅读稿（含目录、订正框与全书人物谱、时间线）。"""
    parts.append(f"""
<section class="front facts">
  <div class="kicker">四</div>
  <h2>全书概况</h2>
  <h3>规模</h3>
  {size_table}
  <p class="legend">字数口径：正文净字数——去掉 frontmatter、注释、Markdown 记号与全部空白后的字符数。提纲、细纲与人物谱、时间线另计约 5 万字，不在内。</p>
  <h3>完成度</h3>
  {md(status, linkmap)}
  <h3>配套材料</h3>
  {md(support, linkmap)}
  <h3>对标与差异</h3>
  {md(COMPARE, linkmap)}
  <h3>排版前待定</h3>
  {md(PENDING, linkmap)}
</section>""")

    doc = SHELL.replace("{{BODY}}", "".join(parts))
    open(out_path, "w", encoding="utf-8").write(doc)
    print(f"已生成 {out_path}")
    for p, t, n, y, _ in SAMPLE:
        print(f"  {t} · {n}（{y}）  {count(p):,} 字 / {sections(p)} 节")
    print(f"  试读本正文合计 {sample_total:,} 字；全书 {len(chs)} 篇 {total:,} 字；"
          f"欠账 {D+T+P} 条已清 {D}；人物谱 {people_n} 人；时间线 {timeline_n} 条")


SHELL = r"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>要有光 —— 人工智能史话（试读本）</title>
<style>
@page { size: A4; margin: 22mm 20mm 20mm; }
:root{ --fg:#1c1a17; --dim:#6b645c; --line:#d9d2c6; --accent:#8a5a2b; --corr:#fbf5ea; --soft:#faf8f4; }
*{box-sizing:border-box}
body{margin:0;color:var(--fg);background:#fff;
 font-family:"Songti SC","Source Han Serif SC","Noto Serif CJK SC",serif;
 font-size:10.8pt;line-height:1.85;text-align:justify}

.cover{height:245mm;display:flex;flex-direction:column;justify-content:center;
 align-items:center;text-align:center;page-break-after:always;position:relative}
.cover .deco{position:absolute;top:14mm;left:0;right:0;font-size:9pt;letter-spacing:1.2em;
 color:var(--line)}
.cover h1{font-size:44pt;margin:0;letter-spacing:.24em;font-weight:400}
.cover .sub{font-size:14pt;letter-spacing:.5em;color:var(--dim);margin:6mm 0 0}
.cover .tag{margin:26mm 0 0;font-size:10pt;letter-spacing:.3em;color:var(--accent);
 border:1px solid var(--accent);padding:2mm 6mm;border-radius:2mm}
.cover .meta{margin-top:12mm;font-size:10pt;color:var(--dim);line-height:2}

.front{page-break-after:always}
.front.flow{page-break-after:auto}
.facts{page-break-before:always}
.front .kicker{font-size:9pt;letter-spacing:.35em;color:var(--accent);margin:0 0 1mm}
.front h2{font-size:14pt;margin:0 0 4mm;padding-bottom:1.5mm;
 border-bottom:1px solid var(--fg);font-weight:600;letter-spacing:.06em;page-break-after:avoid}
.front h3{font-size:11pt;margin:6mm 0 2mm;font-weight:600;letter-spacing:.08em;
 color:var(--accent);page-break-after:avoid}
.front p,.front p:first-of-type{text-indent:0}
.picks{padding-left:5mm;margin:0;list-style:none}
.picks li{margin:2.2mm 0;line-height:1.75;font-size:10.2pt;position:relative;padding-left:14mm}
.picks .yr{position:absolute;left:0;top:0;width:12mm;color:var(--accent);font-size:9pt;
 letter-spacing:.08em;font-variant-numeric:tabular-nums}
.motifs{padding-left:6mm;margin:0}
.motifs li{margin:1.4mm 0;line-height:1.7;font-size:10.2pt}
.note{color:var(--dim);font-size:9.4pt;background:var(--soft);padding:3.5mm 5mm;
 border-left:2px solid var(--line);margin:4mm 0 0;page-break-inside:avoid}
.legend{color:var(--dim);font-size:9.2pt;margin:0 0 3mm}

.chapter{page-break-before:always}
.chh{margin-bottom:9mm;padding-bottom:5mm;border-bottom:2px solid var(--fg)}
.chh .label{font-size:9pt;letter-spacing:.35em;color:var(--accent);margin-bottom:2.5mm}
.chh .node{margin-left:5mm;padding-left:5mm;border-left:1px solid var(--line);color:var(--dim);letter-spacing:.2em}
.chh h1{font-size:22pt;margin:0;font-weight:400;letter-spacing:.04em}
.chh .syn{margin:4mm 0 0;color:var(--dim);font-size:9.8pt;line-height:1.75}

h2.sec{font-size:11pt;font-weight:400;color:var(--dim);letter-spacing:.35em;
 margin:9mm 0 5mm;text-align:center;page-break-after:avoid}
h2.sec::before,h2.sec::after{content:"—— ";color:var(--line)}
h2.sec::after{content:" ——"}
p{margin:0 0 3.6mm;text-indent:2em}
p:first-of-type{text-indent:2em}
strong{font-weight:700}
em{font-style:normal;color:var(--dim)}
code{font-family:"SF Mono",Menlo,monospace;font-size:.86em}
hr{border:0;border-top:1px solid var(--line);width:22%;margin:6mm auto}
ul,ol{margin:0 0 3.6mm;padding-left:7mm}
li{margin:1.2mm 0}
blockquote{margin:4mm 0;padding:0 0 0 5mm;border-left:2px solid var(--line);color:#3a352e}
blockquote p{text-indent:0;margin:1.5mm 0}

aside.correction{margin:5mm 0;background:var(--corr);border:1px solid #ddc9a4;
 border-left-width:3px;padding:4mm 5mm 1mm;page-break-inside:avoid}
aside.correction .ctag{font-size:8pt;letter-spacing:.3em;color:var(--accent);margin-bottom:1mm}
aside.correction .ctitle{font-weight:700;margin-bottom:2.5mm}
aside.correction p{text-indent:0;font-size:10pt;margin:1.8mm 0}

.tw{margin:3mm 0 4mm}
table{border-collapse:collapse;width:100%;font-size:9.4pt;line-height:1.6}
th,td{border:1px solid var(--line);padding:1.6mm 2.4mm;text-align:left;vertical-align:top}
th{background:var(--soft);font-weight:600}
td.n,th.n{white-space:nowrap}
td.r,th.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
table.eras td:nth-child(4){width:50%}
table.eras,table.sizes,.keep{page-break-inside:avoid}
table.toc{font-size:8.7pt;line-height:1.5}
table.toc th,table.toc td{padding:1.2mm 1.8mm}
table.toc td.t{white-space:nowrap;font-weight:600}
table.toc td.p{color:var(--dim);font-size:8.2pt}
table.toc tr{page-break-inside:avoid}
table.toc tr.era td{background:var(--soft);color:var(--accent);letter-spacing:.15em;font-size:8.6pt;padding:1.6mm 1.8mm}
table.toc tr.pick td{background:#fdf9f1}
table.sizes{width:70%}
table.sizes tr.sum td{font-weight:700;border-top:2px solid var(--fg)}
a{color:inherit;text-decoration:none}
span{color:inherit}
</style></head><body>{{BODY}}</body></html>
"""

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "../要有光-试读本.html")
