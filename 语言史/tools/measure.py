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

def body(path):
    t = open(path, encoding="utf-8").read()
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    return re.sub(r"^---.*?\n---\n", "", t, flags=re.S)

def count_text(text):
    """同一口径，但接收正文字符串而非路径。

    给已经自己读过文件、去过 frontmatter 与注释的调用者用（build_html.py 就是）。
    **不要在别处另写一套数法**——2026-08-04 发现 build_html.py 正是这样漏掉了
    Markdown 记号那一步，与 README 的总字数差了 11 148 字（234 920 对 223 772），
    而这个差额恰好就是本文件开头记的那笔「全书合计近一万字」。
    """
    return len(re.sub(r"\s", "", MARKS.sub("", text)))


def count(path):
    return count_text(body(path))

def sections(path):
    return len(re.findall(r"^## ", body(path), flags=re.M))
