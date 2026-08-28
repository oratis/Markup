#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把一本书的每一篇文章灌进微信公众号草稿箱。三本书共用这一份。

先跑 build_wechat.py 和 gen_covers.py，产出目录里要有 html/ covers/ meta/。

用法：
    export WX_APPID=wx...            # 微信开发者平台 → 我的业务 → 公众号 → 基础信息 → 开发信息
    export WX_APPSECRET=...
    python3 tools/mp_publish.py [产出目录] [--dry-run] [--only 1 2 3]

先决条件：调用方的出网 IP 必须在「API IP 白名单」里（位置同上。2025-12-01 起
这一块从公众号后台迁到了微信开发者平台）。注意出网可能按目的地分流——不要拿
ipify 之类的回显当准，脚本会直接把微信在 40164 里报的那个 IP 打给你。

做三件事，每篇一次：
    1. 封面图 → 永久素材（material/add_material）拿 media_id
    2. 正文 HTML + 标题 + 摘要 + 封面 → 草稿（draft/add）
    3. 把 media_id 记回 meta/，重跑不会重复上传

只依赖标准库。脚本不会发布任何东西，只建草稿——发布要你自己在后台点。
"""
import os, re, sys, json, time, mimetypes, urllib.request, urllib.error, uuid

BASE = "https://api.weixin.qq.com/cgi-bin"
APPID = os.environ.get("WX_APPID", "")
SECRET = os.environ.get("WX_APPSECRET", "")

ERR = {
    40164: "这个 IP 不在公众号的 IP 白名单里。到微信开发者平台 → 我的业务 → 公众号 → "
           "基础信息 → 开发信息 → API IP白名单，把它加进去。",
    48001: "这个公众号没有该接口的权限。素材管理与草稿箱接口要求已认证的订阅号/服务号。",
    40001: "AppSecret 不对，或 access_token 失效。",
    40013: "AppID 不对。",
    45009: "接口调用超过当日上限。",
}


def api(path, params=None, data=None, raw=None, ctype=None):
    url = f"{BASE}/{path}"
    if params:
        url += ("&" if "?" in url else "?") + "&".join(f"{k}={v}" for k, v in params.items())
    body, headers = None, {}
    if raw is not None:
        body, headers = raw, {"Content-Type": ctype}
    elif data is not None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json; charset=utf-8"}
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as r:
        out = json.load(r)
    code = out.get("errcode", 0)
    if code:
        raise RuntimeError(f"[{code}] {out.get('errmsg')} — {ERR.get(code, '')}")
    return out


_tok = {"v": "", "exp": 0}


def token():
    if _tok["v"] and time.time() < _tok["exp"]:
        return _tok["v"]
    out = api("token", {"grant_type": "client_credential", "appid": APPID, "secret": SECRET})
    _tok["v"], _tok["exp"] = out["access_token"], time.time() + out["expires_in"] - 300
    return _tok["v"]


def multipart(fields, files):
    """手搓 multipart/form-data，避免引第三方库。"""
    b = f"----wx{uuid.uuid4().hex}"
    out = []
    for k, v in fields.items():
        out.append(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    for k, (name, blob) in files.items():
        mt = mimetypes.guess_type(name)[0] or "application/octet-stream"
        out.append(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"; "
                   f"filename=\"{name}\"\r\nContent-Type: {mt}\r\n\r\n".encode())
        out.append(blob)
        out.append(b"\r\n")
    out.append(f"--{b}--\r\n".encode())
    return b"".join(out), f"multipart/form-data; boundary={b}"


def upload_cover(path):
    blob = open(path, "rb").read()
    body, ctype = multipart({}, {"media": (os.path.basename(path), blob)})
    out = api("material/add_material", {"access_token": token(), "type": "image"},
              raw=body, ctype=ctype)
    return out["media_id"], out.get("url", "")


def add_draft(meta, content, thumb):
    art = {
        "title": meta["mp_title"],
        "author": meta["author"],
        "digest": meta["digest"],
        "content": content,
        "content_source_url": "",
        "thumb_media_id": thumb,
        "need_open_comment": 1,
        "only_fans_can_comment": 0,
        "pic_crop_235_1": "0_0_1_1",
    }
    return api("draft/add", {"access_token": token()}, data={"articles": [art]})["media_id"]


def update_draft(media_id, meta, content, thumb):
    """就地改已建好的草稿，不新建。index 是图文里的第几篇，单图文恒为 0。"""
    api("draft/update", {"access_token": token()}, data={
        "media_id": media_id, "index": 0,
        "articles": {
            "title": meta["mp_title"], "author": meta["author"],
            "digest": meta["digest"], "content": content,
            "content_source_url": "", "thumb_media_id": thumb,
            "need_open_comment": 1, "only_fans_can_comment": 0,
        }})


def main():
    args = [a for a in sys.argv[1:]]
    dry = "--dry-run" in args
    refresh = "--refresh" in args      # 已建好的草稿就地更新，而不是跳过
    only = None
    if "--only" in args:
        i = args.index("--only")
        only = {int(x) for x in args[i + 1:] if x.isdigit()}
        args = args[:i]
    args = [a for a in args if not a.startswith("--")]
    if not args:
        sys.exit("要指明产出目录，例如：python3 tools/mp_publish.py .")
    outdir = args[0]

    # 别用 ipify 报 IP：出网可能按目的地分流，微信看到的未必是它看到的那个。
    # 拿一次 token，失败时从 40164 的报错里把微信真正看到的 IP 抠出来——那才是要填白名单的。
    if APPID and SECRET:
        try:
            token()
        except Exception as e:
            m = re.search(r"invalid ip ([0-9.]+)", str(e))
            if m:
                sys.exit(f"要填进 IP 白名单的是这一个：\n\n    {m.group(1)}\n\n"
                         f"位置：微信开发者平台 → 我的业务 → 公众号 → 基础信息 → 开发信息 "
                         f"→ API IP白名单。加完等一两分钟生效，再重跑本命令。\n\n原始报错：{e}")
            sys.exit(f"拿 access_token 就失败了：{e}")

    idx = json.load(open(f"{outdir}/meta/index.json", encoding="utf-8"))
    if only:
        idx = [m for m in idx if m["seq"] in only]

    if dry:
        print(f"{'序':>2} {'标题':<26} {'字数':>7} {'正文':>8} {'封面':>8}  发布日")
        for m in idx:
            h = os.path.getsize(f"{outdir}/{m['html']}")
            c = f"{outdir}/{m['cover']}"
            cs = f"{os.path.getsize(c)//1024}KB" if os.path.exists(c) else "缺"
            print(f"{m['seq']:>2} {m['mp_title']:<26} {m['words']:>7,} {h//1024:>6}KB "
                  f"{cs:>8}  {m['publish_date']}")
        print(f"\n共 {len(idx)} 篇。加上 WX_APPID / WX_APPSECRET 去掉 --dry-run 即开始灌草稿。")
        return

    if not (APPID and SECRET):
        sys.exit("缺 WX_APPID / WX_APPSECRET 环境变量。")

    # 先拿一次 token 并试一个只读的公众号接口。权限不对就当场停，
    # 别让几十篇挨个去撞同一堵墙。小程序的凭据也会在这里被挡下来。
    try:
        api("material/get_materialcount", {"access_token": token()})
        print("✓ 凭据可用，且这个号有素材管理权限\n")
    except Exception as e:
        sys.exit(f"预检没过：{e}\n\n"
                 "48001 的两种可能：①用的是小程序的 AppID（素材/草稿是公众号专属接口）；"
                 "②公众号未通过微信认证。都走不通的话，退回手工粘贴 html/ 里的文件。")

    state_path = f"{outdir}/meta/_mp_state.json"
    state = json.load(open(state_path, encoding="utf-8")) if os.path.exists(state_path) else {}

    ok = 0
    for m in idx:
        k = str(m["seq"])
        st = state.setdefault(k, {})
        try:
            if not st.get("thumb"):
                st["thumb"], st["thumb_url"] = upload_cover(f"{outdir}/{m['cover']}")
                print(f"{m['seq']:>2}  封面已上传  {st['thumb'][:20]}…")
            if not st.get("draft"):
                content = open(f"{outdir}/{m['html']}", encoding="utf-8").read()
                st["draft"] = add_draft(m, content, st["thumb"])
                print(f"{m['seq']:>2}  草稿已建立  {m['mp_title']}")
            elif refresh:
                content = open(f"{outdir}/{m['html']}", encoding="utf-8").read()
                update_draft(st["draft"], m, content, st["thumb"])
                print(f"{m['seq']:>2}  草稿已更新  {m['mp_title']}")
            ok += 1
        except Exception as e:
            print(f"{m['seq']:>2}  ✗ {m['mp_title']}：{e}")
        finally:
            json.dump(state, open(state_path, "w", encoding="utf-8"),
                      ensure_ascii=False, indent=2)
        time.sleep(0.5)

    print(f"\n完成 {ok}/{len(idx)} 篇。到公众号后台「草稿箱」核对，"
          f"再按 meta/index.json 里的日期逐篇定时群发。")


if __name__ == "__main__":
    main()
