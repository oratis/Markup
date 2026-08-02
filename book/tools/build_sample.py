#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成给出版社的试读本（HTML → 交给 headless Chrome 打印成 PDF）。

在 book/ 下运行：
    python3 tools/build_sample.py [输出 HTML 路径]

选篇理由写在 SAMPLE 里，改选篇只改那张表。排版口径与屏幕阅读稿不同：
这里是印刷品，要分页、要页眉页脚、不要交互。
"""
import re, sys, os, html

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_html import md_to_html, parse            # 复用同一套 Markdown 转换
from measure import count, sections


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
            out.append("\u201c" if opening else "\u201d")
            opening = not opening
        else:
            out.append(ch)
            if ch == "\n" and not in_code:
                pass
    return "".join(out)

# ── 选篇 ──────────────────────────────────────────────────────────────
SAMPLE = [
    ("序章-最后的问题.md", "序章", "最后的问题",
     "全书的立意与声音。四千字，读完就知道这本书想干什么。"),
    ("第一时代-寓言/01-偃师的木偶.md", "第 1 章", "偃师的木偶",
     "开篇。从《列子》里那个会眨眼的木偶讲到今天，"
     "并示范本书处理传说的办法——「订正」区块。"),
    ("第二时代-计算/08-机器会思考吗.md", "第 8 章", "机器会思考吗",
     "图灵把一个吵了三百年的哲学问题，改写成一场可以打赌的游戏；"
     "并在同一篇论文里把九种反对意见逐条答完——那份清单至今没有第十条。"),
    ("第二时代-计算/10-感知机.md", "第 10 章", "感知机",
     "全书最完整的一出悲剧：第一台会学习的机器，"
     "和一本书如何把一个方向按停了十几年。"),
    ("第四时代-注意力/22-你只需要注意力.md", "第 22 章", "你只需要注意力",
     "今天所有大模型的骨架是怎么来的。"
     "全书技术密度最高的一章，用一个能在纸上算完的例子讲透。"),
    ("第五时代-涌现/27-涌现还是幻觉.md", "第 27 章", "涌现，还是幻觉",
     "当下最热的那场争论：能力是从规模里自己长出来的，还是我们的尺子刻度太粗。"
     "本书的做法是把双方最强的论证并排放好，不替读者选边。"),
]

PITCH = """《要有光》是一部人工智能史话：**用讲故事的方式，把这门学科三千年的来路写成一本普通人读得下去的书**，
同时把它的基本概念——什么是学习、什么是神经网络、什么是注意力——讲到不需要任何数理背景也能懂。

写法是人物与科学进展混写。全书五个时代、31 章，加序章与终章共 33 篇，约 28.6 万字，初稿已完成。

**它和市面上同类书的区别在两处。**

一是**较真**。书里每一个日期、数字与引文都回到过一手文献；
凡流传广而站不住的说法，正文里用独立的「订正」区块单独处理——布拉格魔像其实是十九世纪的产物、
《感知机》那句献辞并非写在 1969 年初版上，而是作者在罗森布拉特去世的次年手写补的、
AlphaGo 与 AlphaGo Zero 被混为一谈了十年。核不实的一律把措辞降格，宁可标着，也不写死。
查不到就说查不到：书末列着几处至今没能坐实的地方，以及各自卡在哪里。

二是**不装懂**。最后几章讲的是仍在进行的争论——涌现是真的还是尺子的错觉、
模型到底懂不懂。这本书的做法是把双方最强的论证并排放好，然后老实告诉读者：这件事目前还没有定论。
凡属作者自己的跨时代对照与推断，正文里都标出来，不混进有出处的事实里。"""

def build(out_path):
    linkmap = {}          # 试读本内不做跨章跳转，链接一律降为纯文本
    parts = []

    # 封面
    parts.append(f"""
<section class="cover">
  <div class="deco">要 有 光</div>
  <h1>要有光</h1>
  <p class="sub">人 工 智 能 史 话</p>
  <p class="tag">试读本 · 序章与五章</p>
  <p class="meta">一部写给普通读者的人工智能通史<br>兼一本不用公式也能读懂的 AI 概念入门</p>
</section>""")

    # 出版说明
    picks = "".join(
        f'<li><b>{html.escape(t)} · {html.escape(n)}</b>（{count(p):,} 字）—— {html.escape(curly(why))}</li>'
        for p, t, n, why in SAMPLE)
    parts.append(f"""
<section class="front">
  <h2>关于这本书</h2>
  {md_to_html(curly(PITCH), linkmap)}
  <h2>本试读本收录</h2>
  <ul class="picks">{picks}</ul>
  <p class="note">六篇合计约 {sum(count(p) for p, *_ in SAMPLE):,} 字，覆盖五个时代里的四个。
  选篇的用意是让每一篇各担一件事：<b>序章</b>交代立意，<b>第 1 章</b>是开篇也是史料态度的样本，
  <b>第 8 章</b>是全书思想上的枢纽，<b>第 10 章</b>展示写人的能力，
  <b>第 22 章</b>展示讲清一个硬概念的能力，<b>第 27 章</b>展示面对未定论争议时的分寸。
  六篇按书中原序排列，可连读。</p>
</section>""")

    # 正文
    for path, label, title, _ in SAMPLE:
        fm, body, _ = parse(path)
        body = curly(re.sub(r"^\s*#\s+.*?\n", "", body, count=1))
        syn = fm.get("synopsis", "")
        parts.append(f"""
<section class="chapter">
  <header class="chh"><div class="label">{html.escape(label)}</div>
  <h1>{html.escape(title)}</h1>
  {f'<p class="syn">{html.escape(curly(syn))}</p>' if syn else ''}</header>
  {md_to_html(body, linkmap)}
</section>""")

    doc = SHELL.replace("{{BODY}}", "".join(parts))
    open(out_path, "w", encoding="utf-8").write(doc)
    print(f"已生成 {out_path}")
    for p, t, n, _ in SAMPLE:
        print(f"  {t} · {n}  {count(p):,} 字 / {sections(p)} 节")


SHELL = r"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>要有光 —— 人工智能史话（试读本）</title>
<style>
@page { size: A4; margin: 22mm 20mm 20mm; }
:root{ --fg:#1c1a17; --dim:#6b645c; --line:#d9d2c6; --accent:#8a5a2b; --corr:#fbf5ea; }
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
.front h2{font-size:12.5pt;margin:6mm 0 3mm;padding-bottom:1.5mm;
 border-bottom:1px solid var(--line);font-weight:600;letter-spacing:.06em}
.front h2:first-child{margin-top:0}
.front h2{page-break-after:avoid}
.picks{padding-left:5mm;margin:0}
.picks li{margin:1.8mm 0;line-height:1.75;font-size:10.2pt}
.note{color:var(--dim);font-size:9.4pt;background:#faf8f4;padding:3.5mm 5mm;
 border-left:2px solid var(--line);margin:4mm 0 0;page-break-inside:avoid}

.chapter{page-break-before:always}
.chh{margin-bottom:9mm;padding-bottom:5mm;border-bottom:2px solid var(--fg)}
.chh .label{font-size:9pt;letter-spacing:.35em;color:var(--accent);margin-bottom:2.5mm}
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

.tw{margin:4mm 0}
table{border-collapse:collapse;width:100%;font-size:9.4pt;line-height:1.6}
th,td{border:1px solid var(--line);padding:1.6mm 2.4mm;text-align:left;vertical-align:top}
th{background:#faf8f4;font-weight:600}
a{color:inherit;text-decoration:none}
span{color:inherit}
</style></head><body>{{BODY}}</body></html>
"""

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "../要有光-试读本.html")
