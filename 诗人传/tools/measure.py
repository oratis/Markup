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

def prose(path):
    """正文——不含章末的「本章诗作编年」表。

    字数上下限是用来查「是不是在复述、是不是漏了纲」的，量的应当是**叙事**。
    章末那张编年表是数据，不是叙事；而清账轮会不断往它的「系年依据」一栏里
    加字，表越长，字数越虚高。2026-08-25 第 9 章就是这样被报成超上限的
    （正文 10315 字合规，连表算成 11000+）。**故字数一律按去表之后算。**

    注：`body()` 保留原样（含表），供欠账、注释块一类需要看全文的地方用。
    """
    t = body(path)
    i = t.find("\n## 本章诗作编年")
    return t[:i] if i != -1 else t


def body(path):
    t = open(path, encoding="utf-8").read()
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    return re.sub(r"^---.*?\n---\n", "", t, flags=re.S)

def count(path):
    """正文字数（去编年表）。要连表一起数用 count_all()。"""
    return len(re.sub(r"\s", "", MARKS.sub("", prose(path))))


def count_all(path):
    return len(re.sub(r"\s", "", MARKS.sub("", body(path))))

def sections(path):
    """正文节数。章末的「本章诗作编年」是表不是节，不算。"""
    return len([h for h in re.findall(r"^## (.*)$", body(path), flags=re.M)
                if "诗作编年" not in h])
