# Ethergray Blog

一个基于 Astro 构建的个人博客，写技术，也记录学习过程。

线上地址：[ethergray.netlify.app](https://ethergray.netlify.app/)

## 特性

- **动静结合**：友链、说说、项目与关于页在构建时预渲染；文章、搜索、RSS/Atom 与站点地图实时读取数据库，配合 CDN 短缓存。
- **在线写作**：内置 `/admin` 写作后台，通过 GitHub OAuth 单博主鉴权直接管理文章，发布与修改无需重新部署。
- **排版与阅读**：支持代码高亮、KaTeX 公式、Mermaid 图表、提示块、自动目录、图片灯箱、动态 OG 分享图与 Giscus 评论。
- **主题与语言**：支持浅色 / 深色主题切换及中英文界面。

## 技术栈

- **框架与样式**：Astro 7 · TypeScript · Tailwind CSS 4 · daisyUI 5
- **服务端与认证**：Elysia · Better Auth（GitHub OAuth）
- **数据库与部署**：Neon PostgreSQL · Drizzle ORM · Netlify

## 文档

更多部署、维护与开发说明见仓库文档：

- [部署指南](docs/DEPLOYMENT.md)
- [日常维护](docs/MAINTENANCE.md)
- [动态发布方案](docs/DYNAMIC-PUBLISHING.md)
- [学习路线](docs/LEARNING-ROADMAP.md)
- [项目约定](AGENTS.md)

## 许可

基于 [AstroPaper](https://github.com/satnaing/astro-paper) 二次开发，采用 [MIT](LICENSE) 协议。
