<!-- 想移除本地字体：先替换 astro.config.ts 的字体配置，再删除本目录，并移除根 README 的登记行。OFL.txt 是第三方原始许可，不修改其内容。 -->

# 本地代码字体

Google Sans Code 来自 Google Fonts（v22），按 SIL Open Font License 1.1 分发，原始许可见 [OFL.txt](OFL.txt)。字体文件保持原样，正文仍使用系统字体。

- 浏览器：`google-sans-code-latin.woff2`，原有的 Latin 可变字体子集，四个字重共用一个文件。
- OG 图片：400、500、600、700 四份静态 TTF。satori 需要静态 TrueType，不能直接拿 WOFF2 或可变字体代替。
- 原配置的 900 没有对应的 Google Fonts 文件，因此不再声明该字重；页面需要更粗文字时由浏览器匹配现有字体。

文件下载自原 Google provider 缓存记录中的地址：

```text
https://fonts.gstatic.com/s/googlesanscode/v22/pxiSyogzv91QhV44Z_GQBHsGf5PuckJMZfIVTPZaiXEp_jF58LS-gXBy.woff2
https://fonts.gstatic.com/s/googlesanscode/v22/pxihyogzv91QhV44Z_GQBHsGf5PuckJMZfIVTPZaiXEp_ht12EVEHsN1sCQNcmTVswMj1ub5SQ.ttf
https://fonts.gstatic.com/s/googlesanscode/v22/pxihyogzv91QhV44Z_GQBHsGf5PuckJMZfIVTPZaiXEp_ht12EVEHsN1sCQNQGTVswMj1ub5SQ.ttf
https://fonts.gstatic.com/s/googlesanscode/v22/pxihyogzv91QhV44Z_GQBHsGf5PuckJMZfIVTPZaiXEp_ht12EVEHsN1sCQNrGPVswMj1ub5SQ.ttf
https://fonts.gstatic.com/s/googlesanscode/v22/pxihyogzv91QhV44Z_GQBHsGf5PuckJMZfIVTPZaiXEp_ht12EVEHsN1sCQNlWPVswMj1ub5SQ.ttf
```

本地 provider 用法：[Astro 官方文档](https://docs.astro.build/en/guides/fonts/#using-a-local-font-file)。升级字体时一起更新来源、许可证与这些文件；构建检查必须覆盖 `/og.png`。
