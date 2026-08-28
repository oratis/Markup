#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""诗目销账 + 编年表草稿。在 诗人传/ 下运行。

读三处：
  1. 各章正文里的引诗块——规范第 13 条的固定格式：
         > 《题目》　年号年（公元）· 岁数 · 地点
  2. 各章 frontmatter 的 `poems:` 字段——这一章声称嵌入了哪些诗
  3. 提纲/诗目.md 的分章清单——每章的「必嵌」

报四件事：正文引了但 frontmatter 没登记的、frontmatter 登记了但正文没引的、
必嵌而正文没引的、以及按正文引诗块生成的编年表草稿（`--table` 时打印）。

**正文是唯一的事实来源。** frontmatter 与诗目都是对正文的声明，不一致时改声明。
"""
import re, glob, os, sys

MAP = "提纲/诗目.md"
POEM_HEAD = re.compile(r"^>\s*《(.+?)》\s*(.*)$")


def frontmatter(t):
    m = re.match(r"---\n(.*?)\n---\n", t, flags=re.S)
    return m.group(1) if m else ""


def declared(fm):
    m = re.search(r"^poems:\s*\[(.*?)\]", fm, flags=re.M)
    return [x.strip() for x in m.group(1).split(",") if x.strip()] if m else []


def quoted(t):
    """正文里的引诗块。返回 [(题, 系年行)]。"""
    body = re.sub(r"^---.*?\n---\n", "", t, flags=re.S)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    out = []
    for ln in body.splitlines():
        m = POEM_HEAD.match(ln.strip())
        if m:
            out.append((m.group(1).strip(), m.group(2).strip(" 　")))
    return out


def chnum(p):
    m = re.match(r"(\d+)", os.path.basename(p))
    return int(m.group(1)) if m else 0


def required(chapter):
    """从诗目.md 取某章的必嵌清单。"""
    if not os.path.exists(MAP):
        return None
    t = open(MAP, encoding="utf-8").read()
    m = re.search(rf"^### 第 {chapter} 章[^\n]*\n(.*?)(?=^### |\Z)", t, flags=re.S | re.M)
    if not m:
        return None
    req = []
    for row in m.group(1).splitlines():
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        if len(cells) >= 2 and cells[1] == "必":
            req.append(cells[0])
    return req


def norm(s):
    """比对用：去括注、去「·」之后的副题、去「其N」、去「N首」、去「并序」。
    《秋兴八首·其一》《秋兴八首（节）》《秋兴》都归为「秋兴」——宁可松一点，别让销账卡在题目写法上。"""
    s = re.sub(r"[（(].*?[）)]", "", s)
    s = s.split("·")[0]
    s = re.sub(r"其[一二三四五六七八九十]+$", "", s)
    s = re.sub(r"[一二三四五六七八九十百]+首$", "", s)
    s = re.sub(r"并序$", "", s)
    return s.strip()


def update_map(results):
    """按正文实况重写诗目总表的「已嵌」「状态」两列。results: {章号: (必嵌数, 已嵌必嵌数)}"""
    t = open(MAP, encoding="utf-8").read()
    def fix(m):
        n = int(m.group(1))
        if n not in results: return m.group(0)
        req, got = results[n]
        mark = "☑" if req and got >= req else "☐"
        return f"| {n} | {m.group(2)} | {req} | {got} | {mark} |"
    new = re.sub(r"^\| (\d+) \| ([^|]+?) \| (\d+) \| (\d+) \| ([☐☑]) \|$", fix, t, flags=re.M)
    open(MAP, "w", encoding="utf-8").write(new)
    print("诗目总表已按正文实况刷新。")


def main():
    table = "--table" in sys.argv
    update = "--update" in sys.argv
    results = {}
    files = [a for a in sys.argv[1:] if not a.startswith("--")] or \
        sorted(glob.glob("第*卷*/[0-9]*.md"), key=chnum)
    if not files:
        sys.exit("没有找到任何正文文件（本脚本要在 诗人传/ 下运行）")
    for p in files:
        t = open(p, encoding="utf-8").read()
        n = chnum(p)
        q = quoted(t)
        qt = [norm(x) for x, _ in q]
        d = [norm(x) for x in declared(frontmatter(t))]
        req = required(n)
        print(f"== 第 {n} 章 {os.path.basename(p)}：正文引诗 {len(q)} 首，frontmatter 登记 {len(d)} 首")
        miss_fm = [x for x in qt if x not in d]
        miss_body = [x for x in d if x not in qt]
        if miss_fm: print("   正文引了、frontmatter 未登记：" + "、".join(miss_fm))
        if miss_body: print("   frontmatter 登记了、正文未引：" + "、".join(miss_body))
        if req is None:
            print("   （诗目里没有这一章的清单）")
        else:
            miss_req = [x for x in req if norm(x) not in qt]
            results[n] = (len(req), len(req) - len(miss_req))
            if miss_req: print("   必嵌而未引：" + "、".join(miss_req))
            else: print(f"   必嵌 {len(req)} 首全部在正文里。")
        undated = [x for x, h in q if "不详" in h or not re.search(r"\d{3,4}", h)]
        if undated: print("   系年不详（如实标出即可）：" + "、".join(undated))
        if table:
            print("\n   | 年 | 岁 | 诗 | 地点 | 处境 | 系年依据 / 争议 |\n   |---|---|---|---|---|---|")
            for title, head in q:
                yr = re.search(r"（(\d{3,4})）", head)
                age = re.search(r"(\S+?)岁", head)
                place = head.split("·")[-1].strip() if "·" in head else ""
                print(f"   | {yr.group(1) if yr else '—'} | {age.group(1) if age else '—'} | {title} | {place} |  |  |")
            print()
    if update and results:
        update_map(results)


if __name__ == "__main__":
    main()
