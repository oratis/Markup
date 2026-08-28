#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 诗人传/ 下的稿件编译成一份自包含的单文件 HTML 阅读稿。

用法（工作目录必须是 诗人传/）：
    python3 tools/build_html.py [输出路径]

默认输出到 ../当时明月-全书.html（不放进仓库，1MB 量级的生成物不该进 git）。
只依赖标准库。Markdown 转换器只覆盖本书实际用到的语法子集。
"""
import re, sys, os, glob, html, json

# ---------------------------------------------------------------- 文件收集

def chapter_key(path):
    m = re.match(r"(\d+)", os.path.basename(path))
    return int(m.group(1)) if m else 0

def collect():
    items = []  # (anchor, kind, era, title, path)
    if os.path.exists("序章-年谱.md"):
        items.append(("ch-0", "front", "序", "序章 · 年谱", "序章-年谱.md"))
    eras = [
        ("第一卷-江畔", "第一卷 · 江畔"),
        ("第二卷-长安", "第二卷 · 长安"),
        ("第三卷-贬途", "第三卷 · 贬途"),
        ("第四卷-南渡", "第四卷 · 南渡"),
        ("第五卷-余响", "第五卷 · 余响"),
    ]
    for d, label in eras:
        for p in sorted(glob.glob(f"{d}/[0-9]*.md"), key=chapter_key):
            n = chapter_key(p)
            title = re.sub(r"^\d+-", "", os.path.basename(p)[:-3])
            items.append((f"ch-{n}", "chapter", label, f"第 {n} 章 · {title}", p))
    if os.path.exists("终章-江月何年初照人.md"):
        items.append(("ch-99", "front", "终", "终章 · 江月何年初照人", "终章-江月何年初照人.md"))
    for p, label in [("提纲/全书提纲.md", "全书提纲"), ("提纲/诗目.md", "诗目"),
                     ("提纲/写作规范.md", "写作规范"),
                     ("提纲/人物谱.md", "人物谱"), ("提纲/时间线.md", "时间线"),
                     ("提纲/参考资料.md", "参考资料")]:
        if os.path.exists(p):
            items.append((f"apx-{label}", "appendix", "附录", label, p))
    return items

# ---------------------------------------------------------------- Markdown

def esc(s):
    return html.escape(s, quote=False)

def inline(s, linkmap):
    """行内标记。先转义，再逐个还原成标签。"""
    s = esc(s)
    # 链接 [text](target)
    def link(m):
        text, target = m.group(1), m.group(2)
        if target.startswith(("http://", "https://")):
            return f'<a href="{html.escape(target)}" target="_blank" rel="noopener">{text}</a>'
        base = os.path.basename(target.split("#")[0])
        anchor = linkmap.get(base)
        return f'<a href="#{anchor}">{text}</a>' if anchor else f"<span>{text}</span>"
    s = re.sub(r"\[([^\]\[]+)\]\(([^)]+)\)", link, s)
    # 代码段先摘出来存起来。否则 `**` 这种"用代码块引用星号"的写法会被后面的
    # 粗体规则拆开，生成 <strong> 与 <code> 交叉的非法嵌套。
    spans = []
    def stash(m):
        spans.append(m.group(1))
        return f"\x00{len(spans)-1}\x00"
    s = re.sub(r"`([^`]+)`", stash, s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\*\w])\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"\x00(\d+)\x00", lambda m: f"<code>{spans[int(m.group(1))]}</code>", s)
    return s

def render_table(rows, linkmap):
    out = ['<div class="tw"><table>']
    head, body = rows[0], rows[2:]
    out.append("<thead><tr>" + "".join(f"<th>{inline(c, linkmap)}</th>" for c in head) + "</tr></thead>")
    out.append("<tbody>")
    for r in body:
        out.append("<tr>" + "".join(f"<td>{inline(c, linkmap)}</td>" for c in r) + "</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)

def split_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]

def md_to_html(md, linkmap, poem_mode=False):
    lines = md.split("\n")
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]
        st = ln.strip()

        if not st:
            i += 1; continue

        # 分隔线（--- 与 *** 都用过）
        if re.fullmatch(r"(-{3,}|\*{3,}|_{3,})", st):
            out.append('<hr>'); i += 1; continue

        # 标题
        m = re.match(r"^(#{1,4})\s+(.*)$", st)
        if m:
            lvl = len(m.group(1))
            txt = inline(m.group(2), linkmap)
            if lvl == 2:
                out.append(f'<h2 class="sec"><span>{txt}</span></h2>')
            else:
                out.append(f"<h{lvl}>{txt}</h{lvl}>")
            i += 1; continue

        # 表格
        if st.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i+1].strip()):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(split_row(lines[i])); i += 1
            out.append(render_table(rows, linkmap)); continue

        # 引用块（订正区块也是引用块）
        if st.startswith(">"):
            buf = []
            while i < len(lines) and (lines[i].strip().startswith(">") or
                                      (lines[i].strip() == "" and i+1 < len(lines) and lines[i+1].strip().startswith(">"))):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i])); i += 1
            inner = md_to_html("\n".join(buf), linkmap)
            first = buf[0] if buf else ""
            cls = "correction" if "订正" in first else ("poem" if first.lstrip().startswith("《") else "quote")
            if cls == "correction":
                m2 = re.match(r"\s*\*\*订正\s*·\s*(.+?)\*\*", first)
                label = esc(m2.group(1)) if m2 else "订正"
                rest = md_to_html("\n".join(buf[1:]), linkmap)
                out.append(f'<aside class="correction"><div class="ctag">订正</div>'
                           f'<div class="ctitle">{label}</div>{rest}</aside>')
            elif cls == "poem":
                inner = md_to_html("\n".join(buf), linkmap, poem_mode=True)
                out.append(f'<blockquote class="poem">{inner}</blockquote>')
            else:
                out.append(f'<blockquote>{inner}</blockquote>')
            continue

        # 列表
        if re.match(r"^\s*([-*+]|\d+\.)\s+", ln):
            ordered = bool(re.match(r"^\s*\d+\.\s+", ln))
            items, cur = [], None
            while i < len(lines):
                l2 = lines[i]
                if re.match(r"^\s*([-*+]|\d+\.)\s+", l2):
                    if cur is not None: items.append(cur)
                    cur = re.sub(r"^\s*([-*+]|\d+\.)\s+", "", l2)
                elif l2.strip() and l2.startswith(("  ", "\t")) and cur is not None:
                    cur += "\n" + l2.strip()
                elif not l2.strip() and i+1 < len(lines) and re.match(r"^\s*([-*+]|\d+\.)\s+", lines[i+1]):
                    pass
                else:
                    break
                i += 1
            if cur is not None: items.append(cur)
            tag = "ol" if ordered else "ul"
            lis = "".join(f"<li>{inline(x, linkmap)}</li>" for x in items)
            out.append(f"<{tag}>{lis}</{tag}>")
            continue

        # 段落
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(
                r"^\s*(#{1,4}\s|\||>|[-*+]\s|\d+\.\s)", lines[i]) and not re.fullmatch(
                r"(-{3,}|\*{3,}|_{3,})", lines[i].strip()):
            buf.append(lines[i].strip()); i += 1
        if buf:
            # 引诗块里的诗行要保留换行（CSS white-space:pre-line），其余段落照旧合并
            sep = "\n" if poem_mode else " "
            out.append(f'<p>{inline(sep.join(buf), linkmap)}</p>')
    return "".join(out)

# ---------------------------------------------------------------- 稿件解析

def parse(path):
    raw = open(path, encoding="utf-8").read()
    fm = {}
    m = re.match(r"^---\n(.*?)\n---\n", raw, flags=re.S)
    body = raw
    if m:
        for line in m.group(1).split("\n"):
            if ":" in line:
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip()
        body = raw[m.end():]
    debts = []
    for dm in re.finditer(r"<!--\s*欠账:(.*?)-->", body, flags=re.S):
        blk = dm.group(1)
        for item in re.findall(r"^- \[([ x])\]\s*(.*?)(?=\n- \[|\n*\Z)", blk, flags=re.S | re.M):
            debts.append((item[0] == "x", re.sub(r"\s+", " ", item[1]).strip()))
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    body = re.sub(r"^\s*#\s+.*?\n", "", body, count=1)  # 章标题由 chh 单独渲染，去掉正文里那份
    return fm, body, debts

def wc(body):
    return len(re.sub(r"\s", "", body))

# ---------------------------------------------------------------- 组装

def build(outpath):
    items = collect()
    linkmap = {os.path.basename(p): a for a, _, _, _, p in items}
    linkmap["README.md"] = "top"

    chapters, toc = [], []
    tot_words = tot_open = tot_done = 0
    era_now = None

    for anchor, kind, era, title, path in items:
        fm, body, debts = parse(path)
        n = wc(body)
        secs = len(re.findall(r"^## ", body, flags=re.M))
        open_n = sum(1 for d, _ in debts if not d)
        done_n = sum(1 for d, _ in debts if d)
        if kind != "appendix":
            tot_words += n; tot_open += open_n; tot_done += done_n

        if era != era_now:
            toc.append(f'<li class="era">{esc(era)}</li>'); era_now = era
        toc.append(f'<li><a href="#{anchor}" data-a="{anchor}">{esc(title)}'
                   f'<span class="tw2">{n:,}</span></a></li>')

        meta = []
        if kind != "appendix":
            meta.append(f"{n:,} 字")
            if secs: meta.append(f"{secs} 节")
            if fm.get("status"): meta.append(fm["status"])
            if open_n or done_n: meta.append(f"欠账 {done_n} 清 / {open_n} 未清")
        syn = fm.get("synopsis", "")

        dl = ""
        if debts:
            rows = "".join(
                f'<li class="{"d" if d else "o"}"><span class="mk">{"✓" if d else "○"}</span>'
                f'<span>{inline(t, linkmap)}</span></li>' for d, t in debts)
            dl = (f'<details class="debt"><summary>本篇欠账（{done_n} 清 / {open_n} 未清）</summary>'
                  f'<ul>{rows}</ul></details>')

        chapters.append(
            f'<article id="{anchor}" class="ch {kind}">'
            f'<header class="chh"><div class="era">{esc(era)}</div>'
            f'<h1>{esc(title)}</h1>'
            + (f'<p class="syn">{inline(syn, linkmap)}</p>' if syn else "")
            + (f'<div class="meta">{" · ".join(esc(x) for x in meta)}</div>' if meta else "")
            + "</header>"
            + md_to_html(body, linkmap) + dl + "</article>")

    nav = json.dumps([a for a, k, _, _, _ in items])
    stats = f"{len([i for i in items if i[1]!='appendix'])} 篇 · {tot_words:,} 字 · 欠账 {tot_done} 清 / {tot_open} 未清"

    doc = HTML_SHELL.replace("{{TOC}}", "".join(toc)) \
                    .replace("{{BODY}}", "".join(chapters)) \
                    .replace("{{STATS}}", stats) \
                    .replace("{{NAV}}", nav)
    with open(outpath, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"已生成 {outpath}  {os.path.getsize(outpath)/1024/1024:.2f} MB")
    print(f"  {stats}")


HTML_SHELL = r"""<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>当时明月 —— 中国诗人列传</title>
<style>
:root{
  --bg:#faf8f4; --fg:#22201d; --dim:#77706a; --line:#e2dcd2; --card:#fff;
  --accent:#8a5a2b; --mark:#b8860b; --corr-bg:#fdf6ec; --corr-line:#d9a441;
  --fs:18px; --lh:1.95; --measure:34em;
}
html[data-t="dark"]{
  --bg:#16181c; --fg:#dcd9d4; --dim:#8d9098; --line:#2b2f36; --card:#1c1f24;
  --accent:#d8a56a; --mark:#d8a56a; --corr-bg:#231d14; --corr-line:#8a6a34;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
 font-family:"Songti SC","Source Han Serif SC","Noto Serif CJK SC",Georgia,serif;
 font-size:var(--fs);line-height:var(--lh);-webkit-text-size-adjust:100%}
html[data-f="sans"] body{font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif}
a{color:var(--accent);text-decoration:none;border-bottom:1px solid transparent}
a:hover{border-bottom-color:var(--accent)}

#bar{position:fixed;top:0;left:0;right:0;height:3px;z-index:60;background:transparent}
#bar i{display:block;height:100%;width:0;background:var(--accent);transition:width .1s}

header#top{position:sticky;top:0;z-index:50;background:var(--bg);
 border-bottom:1px solid var(--line);display:flex;align-items:center;gap:.75rem;
 padding:.55rem .9rem;font-size:.78rem;font-family:system-ui,sans-serif}
header#top .t{font-weight:700;letter-spacing:.02em}
header#top .s{color:var(--dim);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
button{font:inherit;font-size:.78rem;background:var(--card);color:var(--fg);
 border:1px solid var(--line);border-radius:6px;padding:.3rem .6rem;cursor:pointer;
 font-family:system-ui,sans-serif}
button:hover{border-color:var(--accent);color:var(--accent)}
button[aria-pressed="true"]{background:var(--accent);color:#fff;border-color:var(--accent)}

#wrap{display:flex;align-items:flex-start;max-width:1400px;margin:0 auto}
#toc{position:sticky;top:47px;width:16rem;flex:none;max-height:calc(100vh - 47px);
 overflow:auto;padding:1.2rem .8rem 4rem;font-size:.8rem;font-family:system-ui,sans-serif;
 border-right:1px solid var(--line)}
#toc ul{list-style:none;margin:0;padding:0}
#toc li.era{color:var(--dim);font-size:.7rem;letter-spacing:.12em;margin:1.1rem 0 .35rem;
 padding-bottom:.25rem;border-bottom:1px solid var(--line)}
#toc li a{display:flex;gap:.5rem;padding:.24rem .4rem;border-radius:5px;color:var(--fg);
 border:0;line-height:1.45}
#toc li a:hover{background:var(--card)}
#toc li a.on{background:var(--accent);color:#fff}
#toc li a.on .tw2{color:#fff;opacity:.8}
#toc .tw2{margin-left:auto;color:var(--dim);font-size:.68rem;font-variant-numeric:tabular-nums}

main{flex:1;min-width:0;padding:0 1.5rem 8rem}
.ch{max-width:var(--measure);margin:0 auto;padding-top:4.5rem}
.ch+.ch{border-top:1px solid var(--line);margin-top:5rem}
.chh{margin-bottom:2.6rem}
.chh .era{font-family:system-ui,sans-serif;font-size:.7rem;letter-spacing:.18em;
 color:var(--dim);margin-bottom:.5rem}
.chh h1{font-size:1.75rem;line-height:1.35;margin:0 0 .7rem;letter-spacing:.01em}
.syn{color:var(--dim);font-size:.92rem;line-height:1.75;margin:0 0 .7rem;
 padding-left:.8rem;border-left:2px solid var(--line)}
.meta{font-family:system-ui,sans-serif;font-size:.72rem;color:var(--dim)}

h2.sec{margin:3.2rem 0 1.6rem;font-size:1rem;font-weight:400;color:var(--dim);
 display:flex;align-items:center;gap:.9rem;font-family:system-ui,sans-serif;letter-spacing:.1em}
h2.sec::after{content:"";flex:1;height:1px;background:var(--line)}
h3{font-size:1.05rem;margin:2rem 0 .8rem}
p{margin:0 0 1.3rem;text-align:justify}
strong{font-weight:700}
em{font-style:italic;color:var(--dim)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em;
 background:var(--card);border:1px solid var(--line);border-radius:4px;padding:.05em .35em}
hr{border:0;height:1px;background:var(--line);margin:2.4rem auto;width:32%}
ul,ol{margin:0 0 1.3rem;padding-left:1.4rem}
li{margin:.35rem 0}

blockquote{margin:1.6rem 0;padding:.2rem 0 .2rem 1.1rem;border-left:3px solid var(--line);
 color:var(--fg)}
blockquote p{margin:.5rem 0}
blockquote.poem{border-left-color:var(--accent);background:var(--card);padding:.9rem 1.2rem;border-radius:4px}
blockquote.poem p:first-child{color:var(--dim);font-size:.88em;margin-bottom:.6rem}
blockquote.poem p{white-space:pre-line;line-height:2.1}

aside.correction{margin:2rem 0;background:var(--corr-bg);border:1px solid var(--corr-line);
 border-left-width:4px;border-radius:8px;padding:1.1rem 1.3rem .4rem;position:relative}
aside.correction .ctag{position:absolute;top:-.72rem;left:1rem;background:var(--corr-line);
 color:#fff;font-family:system-ui,sans-serif;font-size:.64rem;letter-spacing:.16em;
 padding:.16rem .55rem;border-radius:4px}
aside.correction .ctitle{font-weight:700;margin:.15rem 0 .7rem;font-size:1.02rem}
aside.correction p{margin:.55rem 0;font-size:.96rem;line-height:1.85}

.tw{overflow-x:auto;margin:1.6rem 0}
table{border-collapse:collapse;width:100%;font-size:.86rem;
 font-family:system-ui,sans-serif;line-height:1.65}
th,td{border:1px solid var(--line);padding:.45rem .6rem;text-align:left;vertical-align:top}
th{background:var(--card);font-weight:600}

details.debt{margin:3rem 0 0;border:1px dashed var(--line);border-radius:8px;
 background:var(--card);font-family:system-ui,sans-serif;font-size:.8rem}
details.debt summary{cursor:pointer;padding:.6rem .9rem;color:var(--dim);user-select:none}
details.debt[open] summary{border-bottom:1px solid var(--line)}
details.debt ul{list-style:none;margin:0;padding:.6rem .9rem}
details.debt li{display:flex;gap:.55rem;margin:.5rem 0;line-height:1.7;align-items:flex-start}
details.debt li.d{color:var(--dim)}
details.debt li.d .mk{color:#4e9a51}
details.debt li.o .mk{color:var(--mark)}
.mk{flex:none;font-size:.8rem;line-height:1.7}
html[data-d="off"] details.debt{display:none}

@media(max-width:900px){
  #toc{position:fixed;left:0;top:47px;bottom:0;background:var(--bg);z-index:45;
   transform:translateX(-101%);transition:transform .2s;width:min(21rem,84vw)}
  html[data-toc="1"] #toc{transform:none}
  main{padding:0 1.1rem 6rem}
  .ch{padding-top:3rem}
  header#top .s{display:none}
}
@media(min-width:901px){#tocBtn{display:none}}
@media print{
  #top,#toc,#bar,details.debt{display:none}
  main{padding:0}.ch{max-width:none;page-break-before:always}
}
</style></head><body>
<div id="bar"><i></i></div>
<header id="top">
  <button id="tocBtn" aria-label="目录">☰</button>
  <span class="t">当时明月</span>
  <span class="s">{{STATS}}</span>
  <button id="dbt" aria-pressed="false" title="显示每篇的欠账清单">欠账</button>
  <button id="fnt" title="字体">宋/黑</button>
  <button id="sml" title="缩小">A−</button>
  <button id="big" title="放大">A+</button>
  <button id="thm" title="明暗">◐</button>
</header>
<div id="wrap">
  <nav id="toc"><ul>{{TOC}}</ul></nav>
  <main>{{BODY}}</main>
</div>
<script>
(function(){
  var H=document.documentElement, K="dsmy:";
  function get(k,d){try{return localStorage.getItem(K+k)||d}catch(e){return d}}
  function set(k,v){try{localStorage.setItem(K+k,v)}catch(e){}}

  H.dataset.t=get("t","light"); H.dataset.f=get("f","serif"); H.dataset.d=get("d","off");
  var fs=parseInt(get("fs","18"),10); H.style.setProperty("--fs",fs+"px");
  document.getElementById("dbt").setAttribute("aria-pressed", H.dataset.d==="on");

  document.getElementById("thm").onclick=function(){
    H.dataset.t = H.dataset.t==="dark"?"light":"dark"; set("t",H.dataset.t);};
  document.getElementById("fnt").onclick=function(){
    H.dataset.f = H.dataset.f==="sans"?"serif":"sans"; set("f",H.dataset.f);};
  document.getElementById("dbt").onclick=function(){
    H.dataset.d = H.dataset.d==="on"?"off":"on"; set("d",H.dataset.d);
    this.setAttribute("aria-pressed", H.dataset.d==="on");};
  function size(d){fs=Math.max(14,Math.min(26,fs+d));H.style.setProperty("--fs",fs+"px");set("fs",fs);}
  document.getElementById("big").onclick=function(){size(1)};
  document.getElementById("sml").onclick=function(){size(-1)};
  var tb=document.getElementById("tocBtn");
  tb.onclick=function(){H.dataset.toc = H.dataset.toc==="1"?"0":"1";};

  var ids={{NAV}}, links={}, arts=[];
  ids.forEach(function(id){
    var a=document.querySelector('#toc a[data-a="'+id+'"]'); var el=document.getElementById(id);
    if(a&&el){links[id]=a;arts.push(el);}
    if(a) a.onclick=function(){ if(innerWidth<=900) H.dataset.toc="0"; };
  });
  var cur=null;
  function onScroll(){
    var st=scrollY||document.documentElement.scrollTop;
    var h=document.documentElement.scrollHeight-innerHeight;
    document.querySelector("#bar i").style.width=(h>0?(st/h*100):0)+"%";
    var best=null;
    for(var i=0;i<arts.length;i++){ if(arts[i].getBoundingClientRect().top<=120) best=arts[i]; }
    if(best&&best.id!==cur){
      if(cur&&links[cur]) links[cur].classList.remove("on");
      cur=best.id; if(links[cur]){links[cur].classList.add("on");
        var a=links[cur], n=document.getElementById("toc");
        if(a.offsetTop<n.scrollTop||a.offsetTop>n.scrollTop+n.clientHeight-40)
          n.scrollTop=a.offsetTop-n.clientHeight/2;}
    }
  }
  addEventListener("scroll",onScroll,{passive:true}); onScroll();
  addEventListener("keydown",function(e){
    if(e.target.tagName==="INPUT")return;
    if(e.key==="j"||e.key==="k"){
      var i=ids.indexOf(cur); i=e.key==="j"?i+1:i-1;
      if(i>=0&&i<ids.length){var el=document.getElementById(ids[i]); if(el)el.scrollIntoView();}
    }
  });
})();
</script></body></html>
"""

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "../当时明月-全书.html"
    build(out)
