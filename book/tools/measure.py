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

def count(path):
    return len(re.sub(r"\s", "", MARKS.sub("", body(path))))

def sections(path):
    return len(re.findall(r"^## ", body(path), flags=re.M))
