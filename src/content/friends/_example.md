---
title: "示例：这个文件不会被渲染"
description: "文件名以 _ 开头，Astro 会忽略它。用来说明字段怎么填。"
url: "https://example.com"
avatar: "https://example.com/avatar.png"
order: 999
---

**这是个模板，不会出现在页面上。**

文件名以 `_` 开头，content.config.ts 里的 glob 规则
（`**/[^_]*.{md,mdx}`）会跳过它。留着有两个用处：

1. 让 src/content/friends/ 目录非空 ——
   空目录会让 Astro 在构建时报
   "The collection friends does not exist or is empty"
2. 想加友链时照着抄，不用回去翻 schema

## 加一个友链

复制这个文件，改个名字（不要以 \_ 开头），然后填：

| 字段          | 必填 | 说明                      |
| ------------- | ---- | ------------------------- |
| `title`       | 是   | 站点名称                  |
| `description` | 是   | 一句话简介                |
| `url`         | 是   | 站点地址，必须带 https:// |
| `avatar`      | 是   | 头像图片地址，外链即可    |
| `order`       | 否   | 排序，小的在前，默认 999  |

order 相同时按名称排（中文按拼音）。
