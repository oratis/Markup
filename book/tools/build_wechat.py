#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把一本书的每一章编译成一篇可直接贴进微信公众号编辑器的 HTML。

用法：
    python3 tools/build_wechat.py <书目录> <产出目录> [--start YYYY-MM-DD] [--every N]

书目录里要有 _manuscript.md——篇目顺序、分卷、书名、作者全从它读，所以
《要有光》和《星号之下》共用这一份代码，将来再加一本也不用改。每篇三个产物：
    html/NN-标题.html   —— 正文（全内联样式，微信编辑器粘贴即用）
    meta/NN-标题.json   —— 标题、摘要、作者等填表字段
    meta/index.json     —— 全书清单 + 发布排期

微信编辑器会丢掉 <style> 标签和 class 属性，所以样式必须逐元素内联。
只依赖标准库。Markdown 转换器只覆盖这两本书实际用到的语法子集。
"""
import re, sys, os, glob, html, json, datetime

# ---------------------------------------------------------------- 版式常量

BODY = "font-size:16px;line-height:1.75;color:#3f3f3f;letter-spacing:0.5px;"
RULE = "#e6e6e6"
P = f"margin:0 0 1.5em;{BODY}text-align:justify;"

# 每本一个主色 + 配套的「订正」区块底色。认书目录名，认不出就用金色。
PALETTE = {
    "book":    ("#B8860B", "#fdf8ee"),   # 暗金，取自「要有光」
    "语言史":  ("#3E6B8A", "#f1f6fa"),   # 深靛，取自星号与泥板
    "诗人传":  ("#8C4A42", "#fbf4f2"),   # 赭，取自旧纸上的朱印
}
ACCENT, FIXBG = PALETTE["book"]
EVERY = 3                                # 每几天一篇，main() 按 --every 覆盖

# ---------------------------------------------------------------- 文件收集


def chapter_key(path):
    m = re.match(r"(\d+)", os.path.basename(path))
    return int(m.group(1)) if m else 0


def load_book(bookdir):
    """从 _manuscript.md 读书名、作者和篇目顺序。

    _manuscript.md 的正文长这样，顶格的是序章/终章，缩进的属于上面那一卷：
        - [[序章-绵羊和马]]
        - **第一卷 · 开口**
          - [[01-禁止讨论的题目]]

    返回 (书名, 作者, [(序号, 类型, 卷名, 标题, 路径)])，序号 0=序章、99=终章。
    """
    raw = open(f"{bookdir}/_manuscript.md", encoding="utf-8").read()
    fm = {}
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line and not line.startswith(" "):
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip()
        raw = raw[m.end():]

    # slug → 实际文件路径。篇目散在各卷子目录里，直接全盘扫一次。
    paths = {os.path.basename(p)[:-3]: p
             for p in glob.glob(f"{bookdir}/**/*.md", recursive=True)}

    items, part = [], None
    for line in raw.splitlines():
        if re.match(r"^- \*\*(.+)\*\*\s*$", line):
            part = re.match(r"^- \*\*(.+)\*\*\s*$", line).group(1).strip()
            continue
        m = re.match(r"^(\s*)- \[\[(.+?)\]\]\s*$", line)
        if not m:
            continue
        indent, slug = len(m.group(1)), m.group(2).strip()
        if slug not in paths:
            raise SystemExit(f"_manuscript.md 里的 [[{slug}]] 找不到对应文件")
        if indent == 0:                      # 顶格 = 序章／终章，不属于任何一卷
            kind, label = "front", slug.split("-")[0]
            title = slug.split("-", 1)[1] if "-" in slug else slug
            items.append([0, kind, label, title, paths[slug]])
        else:
            title = re.sub(r"^\d+-", "", slug)
            items.append([chapter_key(slug), "chapter", part, title, paths[slug]])

    fronts = [it for it in items if it[1] == "front"]
    if len(fronts) > 1:
        fronts[-1][0] = 99                   # 最后一篇顶格的是终章
    return fm.get("title", ""), fm.get("author", "oratis"), [tuple(it) for it in items]


def wordcount(bookdir, path, fm):
    """一篇的正文字数。

    三本书的 frontmatter 里 `words:` 都常年是 0——字数看板是各书的
    `refresh_readme.py` 实测重刷的，从不回写 frontmatter。所以这里优先用
    该书自己的 `tools/measure.py`（口径与它的 README 一模一样），
    取不到才退回 frontmatter。
    """
    n = int(fm.get("words", 0) or 0)
    if n:
        return n
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "_measure", os.path.join(bookdir, "tools", "measure.py"))
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        return m.count(path)
    except Exception:
        return 0


def parse(path):
    """读一篇稿子，返回 (frontmatter dict, 正文 markdown)。"""
    raw = open(path, encoding="utf-8").read()
    fm = {}
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip()
        raw = raw[m.end():]
    # 砍掉稿末的校对注释块（<!-- ... -->），那是给作者看的，不进公众号
    raw = re.split(r"\n<!--", raw)[0]
    return fm, raw.strip()


# ---------------------------------------------------------------- 行内标记

def esc(s):
    return html.escape(s, quote=False)


def inline(s):
    """行内标记。先转义，再逐个还原成带内联样式的标签。"""
    s = esc(s)
    stash = []          # [(种类, 内容)]，占位符是 \x00序号\x00

    def keep(kind):
        def f(m):
            stash.append((kind, m.group(1)))
            return f"\x00{len(stash)-1}\x00"
        return f

    # 行内代码先摘走，否则里面的 * _ 会被后面的规则拆开
    s = re.sub(r"`([^`]+)`", keep("code"), s)
    # 再摘反斜杠转义。《星号之下》全书用 \* 写重构形式（\*s、\*-ʔ），
    # 星号就是这本书的核心记号，绝不能被当成强调标记吃掉。
    # 只认 esc() 不碰的那几个标点，所以放在 esc() 之后是安全的。
    s = re.sub(r"\\([*_\[\]`~\\])", keep("lit"), s)

    s = re.sub(r"\[([^\]\[]+)\]\(((?:https?:)[^)]+)\)",
               lambda m: f'<a href="{html.escape(m.group(2))}" '
                         f'style="color:{ACCENT};text-decoration:none;">{m.group(1)}</a>', s)
    # 站内相对链接（指向别的章）在公众号里没有目标，退化成普通文字
    s = re.sub(r"\[([^\]\[]+)\]\((?!https?:)[^)]+\)", r"\1", s)

    s = re.sub(r"\*\*([^*]+)\*\*",
               r'<strong style="font-weight:600;color:#1a1a1a;">\1</strong>', s)
    # 前后不能贴着字母数字，否则会把 a*b*c 这种拆开。这里刻意不用 \w：
    # Python 的 \w 把汉字也算词字符，会让「。*伊朗语支*有」这种紧贴中文的斜体失效。
    s = re.sub(r"(?<![*A-Za-z0-9_])\*([^*\n]+)\*(?![*A-Za-z0-9_])",
               r'<em style="font-style:italic;">\1</em>', s)

    for i, (kind, text) in enumerate(stash):
        rep = text if kind == "lit" else (
            '<code style="font-family:Menlo,Consolas,monospace;font-size:14px;'
            'background:#f5f5f5;color:#c7254e;padding:1px 5px;'
            f'border-radius:3px;">{text}</code>')
        s = s.replace(f"\x00{i}\x00", rep)
    return s


# ---------------------------------------------------------------- 块级转换

def sec_header(text, n):
    """节标题（## 一 / ## 二 …）。中文数字外加一枚序号章戳。"""
    return (f'<section style="margin:2.6em 0 1.6em;text-align:center;">'
            f'<span style="display:inline-block;font-size:15px;font-weight:600;'
            f'color:{ACCENT};letter-spacing:3px;border-top:1px solid {RULE};'
            f'border-bottom:1px solid {RULE};padding:6px 22px;">{esc(text)}</span>'
            f'</section>')


QP = ("font-size:15px;line-height:1.8;color:#5a5a5a;letter-spacing:0.5px;"
      "text-align:justify;")

CN_DAYS = {2: "两天", 3: "三天", 4: "四天", 5: "五天", 6: "六天", 7: "周"}


VERSE_HEAD = "　"          # 引诗块首行的全角空格：《题》　纪年（公元）· 岁 · 地点


def is_verse(lines):
    """引诗块的判据是首行的固定格式，不是书名。

    《当时明月》全书 214 个引块**全是诗**，首行一律作
    `《题》　开元五年（717）· 十七岁 · 长安`（也可能是 `《题》（节）　…`
    或 `《题》其一　…`）。两本姊妹书一个这样的块都没有，所以按内容分流
    不会动到它们——重编译逐字节一致。
    """
    return bool(lines) and lines[0].lstrip().startswith("《") and VERSE_HEAD in lines[0]


def verse(lines):
    """引诗块。**诗行不能像散文那样并成一段**——一首绝句会被拼成一行。

    首行拆成题与系年两行：题是读者要认的，系年（哪一年、几岁、在哪里）是这本书
    的主张所在，给它主色。诗行逐行 `<br>` 断开；行短的居中（诗、词），
    出现长行的（《阿房宫赋》《金石录后序》一类文的节引）改左对齐两端对齐，
    否则居中的长行在手机上会碎成锯齿。
    """
    head = lines[0].strip()
    title, _, meta = head.partition(VERSE_HEAD)
    stanzas, buf = [], []
    for ln in lines[1:]:
        if ln.strip():
            buf.append(ln.strip())
        elif buf:
            stanzas.append(buf); buf = []
    if buf:
        stanzas.append(buf)
    longest = max((len(x) for st in stanzas for x in st), default=0)
    prose_mode = longest > 24
    align = "text-align:justify;" if prose_mode else "text-align:center;"
    lh = "1.9" if prose_mode else "2.1"
    body = "".join(
        f'<p style="margin:0 0 {"0" if k == len(stanzas) - 1 else "1em"};'
        f'font-size:16px;line-height:{lh};color:#3f3f3f;letter-spacing:1px;{align}">'
        + "<br>".join(inline(x) for x in st) + "</p>"
        for k, st in enumerate(stanzas))
    return (f'<section style="margin:2.2em 0;padding:18px 18px 20px;background:#fafafa;'
            f'border-left:3px solid {ACCENT};">'
            f'<p style="margin:0 0 3px;font-size:15px;font-weight:600;color:#1a1a1a;'
            f'letter-spacing:1px;text-align:center;">{inline(title.strip())}</p>'
            f'<p style="margin:0 0 14px;font-size:12px;color:{ACCENT};letter-spacing:1px;'
            f'text-align:center;">{inline(meta.strip())}</p>'
            f'{body}</section>')


def quote(lines):
    """引文。稿中的『订正』区块单独一种配色；引诗块另走 verse()。"""
    if is_verse(lines):
        return verse(lines)
    body = "\n".join(lines).strip()
    is_fix = body.startswith("**订正")
    bg = FIXBG if is_fix else "#fafafa"
    bar = ACCENT if is_fix else "#d9d9d9"
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    inner = "".join(
        f'<p style="margin:0 0 {"0" if k == len(paras) - 1 else "0.8em"};{QP}">'
        f'{inline(" ".join(p.split(chr(10))))}</p>' for k, p in enumerate(paras))
    return (f'<section style="margin:1.8em 0;padding:14px 18px;background:{bg};'
            f'border-left:3px solid {bar};">{inner}</section>')


def listing(items, ordered):
    tag = "ol" if ordered else "ul"
    lis = "".join(f'<li style="margin:0 0 0.6em;{BODY}">{inline(t)}</li>' for t in items)
    return f'<{tag} style="margin:1.4em 0;padding-left:1.4em;">{lis}</{tag}>'


def codeblock(lines):
    body = esc("\n".join(lines))
    return (f'<section style="margin:1.8em 0;padding:14px 16px;background:#f7f7f7;'
            f'border-radius:4px;overflow-x:auto;"><pre style="margin:0;'
            f'font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.6;'
            f'color:#333;white-space:pre-wrap;word-break:break-all;">{body}</pre></section>')


def table(rows):
    head, body = rows[0], rows[2:]          # rows[1] 是对齐行
    th = "".join(f'<th style="padding:8px 10px;border:1px solid {RULE};'
                 f'background:#fafafa;font-size:14px;font-weight:600;'
                 f'color:#1a1a1a;">{inline(c)}</th>' for c in head)
    trs = "".join("<tr>" + "".join(
        f'<td style="padding:8px 10px;border:1px solid {RULE};font-size:14px;'
        f'color:#3f3f3f;">{inline(c)}</td>' for c in r) + "</tr>" for r in body)
    return (f'<section style="margin:1.8em 0;overflow-x:auto;">'
            f'<table style="width:100%;border-collapse:collapse;">'
            f'<thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></section>')


def chron(rows):
    """章末「本章诗作编年」。六栏的表在手机上没法看，改成两行一条。

    第一行是这本书的主张本身——年、岁、地点、题；第二行是处境与系年依据，
    压小压灰。**系年依据一栏不丢**：那是「不编年份」这条规矩的凭据。
    """
    body = []
    for r in rows[2:]:                      # rows[0] 表头、rows[1] 对齐行
        cells = (r + [""] * 6)[:6]
        year, age, poem, place, ctx, basis = (c.strip() for c in cells)
        age = f"{age} 岁" if re.fullmatch(r"\d+", age) else age
        crumb = "　·　".join(x for x in (year, age, place) if x and x != "—")
        foot = "　·　".join(x for x in (ctx, basis) if x and x != "—")
        body.append(
            f'<section style="margin:0 0 1.1em;padding:0 0 0 12px;'
            f'border-left:2px solid #e6e6e6;">'
            f'<p style="margin:0 0 2px;font-size:12px;color:{ACCENT};letter-spacing:1px;">'
            f'{inline(crumb)}</p>'
            f'<p style="margin:0 0 2px;font-size:15px;color:#1a1a1a;letter-spacing:0.5px;">'
            f'《{inline(poem)}》</p>'
            + (f'<p style="margin:0;font-size:12px;line-height:1.7;color:#9a9a9a;">'
               f'{inline(foot)}</p>' if foot else "")
            + '</section>')
    return f'<section style="margin:1.6em 0;">{"".join(body)}</section>'


def hr():
    return (f'<section style="margin:2.4em 0;text-align:center;">'
            f'<span style="color:{RULE};font-size:14px;letter-spacing:8px;">◆ ◆ ◆</span>'
            f'</section>')


def md2html(md):
    out, lines, i = [], md.split("\n"), 0
    n_sec = 0
    in_chron = False           # 进了「本章诗作编年」那一节，表要换排法
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()

        if not s:
            i += 1
            continue

        if s.startswith("# "):                       # 章标题 → 归公众号标题栏，正文不重复
            i += 1
            continue

        if s.startswith("## "):
            n_sec += 1
            in_chron = "诗作编年" in s
            out.append(sec_header(s[3:].strip(), n_sec))
            i += 1
            continue

        if s.startswith("### "):
            out.append(f'<p style="margin:2em 0 1em;{BODY}font-size:17px;'
                       f'font-weight:600;color:#1a1a1a;">{inline(s[4:].strip())}</p>')
            i += 1
            continue

        if re.fullmatch(r"-{3,}|\*{3,}", s):
            out.append(hr())
            i += 1
            continue

        if s.startswith("```"):
            i += 1
            buf = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i]); i += 1
            i += 1
            out.append(codeblock(buf))
            continue

        if s.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append(quote(buf))
            continue

        if s.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            if len(rows) > 2:
                out.append(chron(rows) if in_chron else table(rows))
            continue

        m = re.match(r"^([-*])\s+(.*)$", s)
        if m:
            buf = []
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                buf.append(re.sub(r"^\s*[-*]\s+", "", lines[i])); i += 1
            out.append(listing(buf, False))
            continue

        if re.match(r"^\d+\.\s+", s):
            buf = []
            while i < len(lines) and re.match(r"^\s*\d+\.\s+", lines[i]):
                buf.append(re.sub(r"^\s*\d+\.\s+", "", lines[i])); i += 1
            out.append(listing(buf, True))
            continue

        # 普通段落：连续非空行并成一段
        buf = [s]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
                r"^\s*(#{1,6} |>|\||```|[-*]\s|\d+\.\s|-{3,}$)", lines[i]):
            buf.append(lines[i].strip()); i += 1
        out.append(f'<p style="{P}">{inline(" ".join(buf))}</p>')

    return "\n".join(x for x in out if x)


# ---------------------------------------------------------------- 文章包装

def label(num, kind, era, title):
    if kind == "front":
        return era, f"{era} · {title}"
    return era, f"第 {num} 章 · {title}"


def head_block(era, num, kind, synopsis, seq, total, series):
    idx = "序章" if num == 0 else ("终章" if num == 99 else f"第 {num} 章")
    # 序章/终章的卷名就是它自己，别印成「序章 | 序章」
    crumb = "　|　".join(([era] if era != idx else []) + [idx, f"全书第 {seq}/{total} 篇"])
    return (
        f'<section style="margin:0 0 1.6em;text-align:center;">'
        f'<p style="margin:0 0 6px;font-size:12px;color:#9a9a9a;letter-spacing:3px;">'
        f'{esc(series)}</p>'
        f'<p style="margin:0;font-size:12px;color:{ACCENT};letter-spacing:2px;">'
        f'{esc(crumb)}</p>'
        f'</section>'
        f'<section style="margin:0 0 2.2em;padding:14px 18px;background:#fbfbfb;'
        f'border-top:1px solid {RULE};border-bottom:1px solid {RULE};">'
        f'<p style="margin:0;font-size:14px;line-height:1.7;color:#6b6b6b;'
        f'letter-spacing:0.5px;">{inline(synopsis)}</p></section>'
    )


def tail_block(tags, nxt, seq, total, title):
    parts = [hr()]
    for cap, val in tags:                 # 本章人物 / 涉及语系，有才印
        parts.append(
            f'<p style="margin:0 0 1.2em;font-size:13px;line-height:1.8;color:#9a9a9a;">'
            f'<span style="color:{ACCENT};">{esc(cap)}　</span>{esc(val)}</p>')
    if nxt:
        parts.append(
            f'<section style="margin:1.6em 0;padding:14px 18px;background:#fbfbfb;'
            f'border-left:3px solid {ACCENT};">'
            f'<p style="margin:0 0 6px;font-size:12px;color:{ACCENT};letter-spacing:2px;">'
            f'下一篇</p>'
            f'<p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1a1a1a;">'
            f'{esc(nxt[0])}</p>'
            f'<p style="margin:0;font-size:14px;line-height:1.7;color:#6b6b6b;">'
            f'{inline(nxt[1])}</p></section>')
    parts.append(
        f'<p style="margin:2em 0 0;font-size:12px;line-height:1.9;color:#b0b0b0;'
        f'text-align:center;">《{esc(title)}》共 {total} 篇，'
        f'每{"天" if EVERY == 1 else CN_DAYS.get(EVERY, str(EVERY) + "天")}更新一篇。<br>'
        f'这是第 {seq} 篇。</p>')
    return "".join(parts)


def article(item, seq, total, nxt, series, title):
    num, kind, era, ttl, path = item
    fm, md = parse(path)
    era_name, disp = label(num, kind, era, ttl)
    body = md2html(md)
    def names(key):     # frontmatter 里是 [甲, 乙, 丙]，逗号后那个空格不能带进正文
        return "、".join(x.strip() for x in fm.get(key, "").strip("[]").split(",") if x.strip())
    tags = [(cap, names(key))
            for key, cap in (("poet", "本章诗人"), ("people", "本章人物"),
                             ("families", "涉及语系"), ("poems", "本章诗作"))
            if names(key)]
    inner = (head_block(era_name, num, kind, fm.get("synopsis", ""), seq, total, series)
             + body + tail_block(tags, nxt, seq, total, title))
    return (f'<section style="{BODY}max-width:100%;">{inner}</section>'), fm, disp


# ---------------------------------------------------------------- 主流程

def main():
    global ACCENT, FIXBG, EVERY
    argv = sys.argv[1:]
    start = datetime.date(2026, 8, 11)          # 首篇发布日
    every = 3                                   # 每几天一篇
    for flag, cast in (("--start", lambda s: datetime.date.fromisoformat(s)),
                       ("--every", int)):
        if flag in argv:
            i = argv.index(flag)
            val = cast(argv[i + 1])
            start, every = (val, every) if flag == "--start" else (start, val)
            del argv[i:i + 2]
    pos = [a for a in argv if not a.startswith("--")]
    if len(pos) < 2:
        sys.exit("用法：build_wechat.py <书目录> <产出目录> [--start YYYY-MM-DD] [--every N]")
    bookdir, outdir = pos[0].rstrip("/"), pos[1].rstrip("/")

    EVERY = every
    ACCENT, FIXBG = PALETTE.get(os.path.basename(bookdir), PALETTE["book"])
    os.makedirs(f"{outdir}/html", exist_ok=True)
    os.makedirs(f"{outdir}/meta", exist_ok=True)

    title, author, items = load_book(bookdir)
    prefix = title.split("——")[0]               # 「星号之下——语言史话」→「星号之下」
    series = title.replace("——", " · ")
    total = len(items)
    fms = [parse(p)[0] for *_, p in items]

    index = []
    for seq, item in enumerate(items, 1):
        num, kind, era, ttl, path = item
        nxt = None
        if seq < total:
            n2, _k2, _e2, t2, _ = items[seq]
            n2disp = ("序章 · " + t2) if n2 == 0 else (
                "终章 · " + t2) if n2 == 99 else f"第 {n2} 章 · {t2}"
            nxt = (n2disp, fms[seq].get("synopsis", ""))
        htmlout, fm, disp = article(item, seq, total, nxt, series, title)

        slug = f"{seq:02d}-{ttl}"
        open(f"{outdir}/html/{slug}.html", "w", encoding="utf-8").write(htmlout)

        pub = start + datetime.timedelta(days=every * (seq - 1))
        meta = {
            "seq": seq, "chapter": num, "kind": kind, "era": era,
            "title": ttl, "display": disp,
            "mp_title": f"{prefix} {seq:02d} | {ttl}",
            "digest": fm.get("synopsis", "")[:118],
            "author": author,
            "words": wordcount(bookdir, path, fm),
            "people": fm.get("people", ""),
            "families": fm.get("families", ""),
            "publish_date": pub.isoformat(),
            "source": path,
            "html": f"html/{slug}.html",
            "cover": f"covers/{slug}.jpg",
        }
        json.dump(meta, open(f"{outdir}/meta/{slug}.json", "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)
        index.append(meta)

    json.dump(index, open(f"{outdir}/meta/index.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    # 排期表随正文一起重出。定时群发只有后台 UI 有，这张表是照着点的那张；
    # 从前它是手抄的，`--start` 一改就跟 index.json 对不上了。
    with open(f"{outdir}/排期表.txt", "w", encoding="utf-8") as fh:
        for m in index:
            fh.write(f"{m['publish_date']}  {m['mp_title']}\n")

    tw = sum(m["words"] for m in index)
    print(f"《{title}》{total} 篇 · 合计 {tw:,} 字 → {outdir}")
    print(f"排期：{index[0]['publish_date']} 起，每 {every} 天一篇，"
          f"末篇 {index[-1]['publish_date']}")


if __name__ == "__main__":
    main()
