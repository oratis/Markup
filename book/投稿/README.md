# 投稿材料

这一目录放的是把书稿送出去用的东西，不是书稿本身。

| 文件 | 是什么 |
|---|---|
| [推荐语.md](推荐语.md) | 邮件正文（可直接粘贴）、一句话定位、内容简介、编辑追问时的补充信息表 |
| [出版社调研.md](出版社调研.md) | 30 余家出版社与民营品牌的适配度、公开投稿渠道、投稿材料清单、合同要点、三十天行动顺序 |

**试读本 PDF 不入库**（1.5 MB 生成物），用脚本现生成：

```bash
cd book && python3 tools/build_sample.py ../要有光-试读本.html
# 再用 headless Chrome 打印成 PDF：
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --no-pdf-header-footer \
  --print-to-pdf=../要有光-试读本.pdf "file://$PWD/../要有光-试读本.html"
```

改选篇只改 `tools/build_sample.py` 顶部的 `SAMPLE` 表。

## 两条纪律

1. **联系方式只收官网公开发布的投稿渠道。** 第三方"出书代理"聚合站上的个人邮箱既未经授权，
   错误率也高——调研中已抓到多处张冠李戴（详见调研文档第七节）。
2. **凡未能证实的一律标注。** 例如中信的投稿邮箱流传极广，但其官网联系页是 JS 渲染、
   抓不到正文，因此标为「未证实」而不是当作已知。发信前自己用浏览器再确认一次。
