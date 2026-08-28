#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 covers/ 里的封面拼成一页 HTML，连排期一起，用来一眼看完整本书的封面。

    python3 tools/covers_page.py <产出目录>

图片以 data URI 内嵌，所以这一页可以单独发给别人看。缺图的位置留白并标出来。
只依赖标准库。
"""
import os, sys, json, base64, html

def main():
    outdir = (sys.argv[1] if len(sys.argv) > 1 else ".").rstrip("/")
    index = json.load(open(f"{outdir}/meta/index.json", encoding="utf-8"))
    cards, missing = [], 0
    for m in index:
        path = f"{outdir}/{m['cover']}"
        if os.path.exists(path) and os.path.getsize(path) > 10000:
            b64 = base64.b64encode(open(path, "rb").read()).decode()
            img = (f'<img src="data:image/jpeg;base64,{b64}" '
                   f'style="width:100%;display:block;border-radius:4px;">')
        else:
            missing += 1
            img = ('<div style="width:100%;aspect-ratio:2960/1260;background:#f2f2f2;'
                   'border-radius:4px;display:flex;align-items:center;'
                   'justify-content:center;color:#b0b0b0;font-size:13px;">封面尚未生成</div>')
        cards.append(
            f'<figure style="margin:0 0 34px;">{img}'
            f'<figcaption style="margin-top:8px;font-size:13px;color:#6b6b6b;'
            f'display:flex;justify-content:space-between;gap:12px;">'
            f'<span>{html.escape(m["mp_title"])}</span>'
            f'<span style="color:#a0a0a0;">{m["publish_date"]}</span>'
            f'</figcaption></figure>')
    title = index[0]["mp_title"].split(" ")[0]
    page = (f'<!doctype html><meta charset="utf-8"><title>{html.escape(title)} · 封面总览</title>'
            f'<body style="margin:0;padding:40px 20px;background:#fff;'
            f'font-family:-apple-system,\'PingFang SC\',sans-serif;">'
            f'<div style="max-width:880px;margin:0 auto;">'
            f'<h1 style="font-size:20px;font-weight:600;color:#1a1a1a;margin:0 0 28px;">'
            f'{html.escape(title)} · 封面总览（{len(index)} 篇）</h1>'
            f'{"".join(cards)}</div></body>')
    dst = f"{outdir}/封面总览.html"
    open(dst, "w", encoding="utf-8").write(page)
    print(f"{len(index)} 篇 → {dst}" + (f"（{missing} 张封面还没生成）" if missing else ""))

if __name__ == "__main__":
    main()
