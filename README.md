# EtherGray Blog

一个基于 **Astro** 构建的个人博客。

Personal blog built with **Astro**.

🌐 **Blog / 博客：** [Ethergray Blog](https://ethergray.netlify.app/)

## ✨ Features / 特性

- ⚡ Fast and lightweight static site
- 📝 Markdown / MDX blog posts
- 🎨 Responsive design
- 🌙 Light / Dark mode
- 🔎 Static search
- 📱 Mobile-friendly
- 🚀 Automatic deployment with Netlify
- 🧩 Built with Tailwind CSS

## 🛠️ Tech Stack / 技术栈

- **Framework:** Astro
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Package Manager:** npm
- **Deployment:** Netlify
- **Version Control:** Git + GitHub

## 📁 Project Structure / 项目结构

```text
/
├── public/                 # Static assets / 静态资源
├── docs/                   # 学习路线 / Learning roadmap
├── practice/               # TypeScript 练习册 / TS exercises
├── src/
│   ├── assets/             # Images and icons / 图片与图标
│   ├── components/         # Reusable components / 可复用组件
│   ├── content/            # Blog content / 博客内容
│   │   ├── pages/
│   │   └── posts/
│   ├── i18n/               # Internationalization / 国际化
│   ├── layouts/            # Page layouts / 页面布局
│   ├── pages/              # Routes / 页面路由
│   ├── scripts/            # Client-side scripts / 客户端脚本
│   ├── styles/             # Global styles / 全局样式
│   ├── types/              # Type definitions / 类型定义
│   └── utils/              # Utility functions / 工具函数
│
├── astro.config.ts         # Astro configuration / Astro 配置
├── astro-paper.config.ts   # Site configuration / 网站配置
├── package.json            # Project dependencies / 项目依赖
├── package-lock.json       # Dependency lockfile / 依赖锁定文件
└── tsconfig.json           # TypeScript configuration / TypeScript 配置
```

## 🧩 可选模块 / Optional modules

每个功能都做成**自包含**的：删除时不需要动别的地方，照着下表删就行。

| 功能           | 相关文件                                                                                           | 怎么删                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 文章目录       | `src/utils/getTableOfContents.ts`<br>`src/pages/posts/[...slug]/_components/TableOfContents.astro` | 删这 2 个文件，再删文章页里的 `import TableOfContents` 和 `<TableOfContents />` 那一行                   |
| 数学公式       | `src/styles/katex.css`<br>`astro.config.ts` 里的 `remarkMath` / `rehypeKatex`                      | 删 `katex.css` 和 `global.css` 里 import 它那行；删配置里两个插件；卸载 `remark-math rehype-katex katex` |
| 图表 Mermaid   | `astro.config.ts` 里的 `mermaid()` 集成                                                            | 删那个集成和它的 import；卸载 `astro-mermaid mermaid`                                                    |
| Atom 订阅      | `src/pages/atom.xml.ts`<br>`src/utils/escapeXml.ts`                                                | 删这两个文件，再删 `Layout.astro` 里 `application/atom+xml` 那个 `<link>`                                |
| 友链页         | `src/pages/friends.astro`<br>`src/utils/getFriends.ts`<br>`src/content/friends/`                   | 照 `getFriends.ts` 文件头写的 6 步做                                                                     |
| 说说 /notes    | `src/pages/notes.astro`<br>`src/utils/getNotes.ts`<br>`src/content/notes/`                         | 照 `getNotes.ts` 文件头写的 6 步做                                                                       |
| 项目 /projects | `src/pages/projects.astro`<br>`src/utils/getProjects.ts`<br>`src/content/projects/`                | 照 `getProjects.ts` 文件头写的 6 步做（不影响 `profile.astro` 里那份独立数据）                           |
| 近况页 /now    | `src/pages/now.astro`                                                                              | 删这个文件，再删 Header 里的「近况」链接（桌面 + 移动各一处）和首页那个按钮                              |
| 代码块复制     | `src/pages/posts/[...slug]/_components/CopyCodeButton.astro`                                       | 删这个文件，再删文章页里的 `<CopyCodeButton />` 那一行                                                   |
| 评论区         | 没有内置                                                                                           | ——                                                                                                       |
| Pagefind 搜索  | `src/pages/search.astro`<br>`astro-paper.config.ts` 的 `features.search`                           | 改成 `search: false`，页面自动跳 404                                                                     |
| 归档页         | `src/pages/archives/`                                                                              | `features.showArchives` 改成 `false`                                                                     |
| 动态 OG 图     | `src/pages/og.png.ts`<br>`src/pages/posts/[...slug]/index.png.ts`                                  | `features.dynamicOgImage` 改成 `false`，再删这两个文件                                                   |
| 主题切换       | `src/scripts/theme.ts`                                                                             | `features.lightAndDarkMode` 改成 `false`                                                                 |
| 分享按钮       | `astro-paper.config.ts` 的 `shareLinks`                                                            | 把数组清空：`shareLinks: []`                                                                             |
| 编辑本页链接   | `astro-paper.config.ts` 的 `features.editPost`                                                     | 改成 `{ enabled: false }`                                                                                |
| 在线写作后台   | `src/pages/admin/`<br>`src/utils/adminApi.ts`                                                      | 删这两个，再删 `src/pages/api/`（连接口也不要的话）                                                      |
| 设计实验室     | `src/pages/design-lab.astro`<br>`@yunyoujun/ak-ui` 依赖                                            | 删那个页面，`npm uninstall @yunyoujun/ak-ui`，再删 `astro.config.ts` 里 sitemap 排除 design-lab 的规则   |
| 练习册         | `practice/`                                                                                        | 整个目录删掉，再删 `package.json` 里的 `learn*` 三个脚本                                                 |
| 学习路线       | `docs/`                                                                                            | 整个目录删掉                                                                                             |

## 📚 学习资料 / Learning

- [学习路线：TypeScript → Astro](docs/LEARNING-ROADMAP.md) —— 每个知识点对应仓库里的哪个文件
- [部署指南](docs/DEPLOYMENT.md) —— 环境变量、连接池、区域选择（要点都查过官方文档）
- [TypeScript 练习册](practice/README.md) —— 8 节课，能自动判分

```bash
npm run learn          # 看题目
npm run learn:check    # 判你的答案
npm run learn:answers  # 判标准答案（用来确认练习册本身没坏）
```

## 🗄️ 数据库 / Database

用 PostgreSQL + Drizzle ORM。表结构定义在 `src/db/schema.ts`。

```bash
npm run db:generate    # 改完 schema 后生成迁移文件
npm run db:migrate     # 把迁移应用到数据库
npm run db:studio      # 打开可视化界面查看数据
npm run db:test        # 跑数据层测试
```

连接串放在环境变量 `DATABASE_URL` 里：

- 本地：项目根目录建 `.env` 文件，写入 `DATABASE_URL=postgresql://...`
- 线上：Netlify 后台 → Site configuration → Environment variables

**`npm run db:test` 不需要配置任何东西** —— 它用 PGlite（进程内的
PostgreSQL）现场建一个空库、跑迁移、跑测试，全程不联网、不碰线上数据。

### 第一次配置

```bash
Copy-Item .env.example .env   # 按文件里的说明填
npm run db:setup              # 检查配置 → 连库 → 建表
```

`npm run db:setup` 会先检查配置是否齐全，缺什么就明确告诉你缺什么。
**可以重复运行**，已经建好的表不会被重建。

只想建表、GitHub 还没配好时，用这个（会跳过 GitHub 相关检查）：

```bash
npm run db:setup -- --db-only
```

## ✍️ 在线写作后台

启动 `npm run dev`，访问：

```text
http://localhost:4321/admin
```

**用 GitHub 账号登录**，不需要密码。

```text
/admin              登录
/admin/posts        文章列表（新建 / 编辑 / 删除）
/admin/posts/new    写新文章
/admin/posts/123    编辑第 123 篇
```

只有 `.env` 里 `GITHUB_OWNER_ID` 指定的那个账号能登录成功，
其他 GitHub 账号即使完成了授权也会被拒绝。

### 为什么用 GitHub 登录，不用密码

- **不用记密码**，也就不会忘、不会泄露
- **数据库里不存任何用户信息**（连 users 表都没有），没有被拖库的风险
- 登录由 [Better Auth](https://better-auth.com/) 处理 —— 这是
  [Astro 官方文档推荐](https://docs.astro.build/en/guides/authentication/)的方案，
  用的是它的**无状态模式**：登录状态存在加密 Cookie 里，服务端验证时不查库

后台页面是**按需渲染**的（`prerender = false`），而博客正文页仍然是
构建时生成的静态 HTML —— 读者访问的部分没有变慢。

## 🔌 API

用 [Elysia](https://elysiajs.com/) 写，跑在 Astro 的 API 路由里
（`src/pages/api/[...path].ts` 接住所有 `/api/*`）。
**不是独立服务** —— 一个仓库、一次部署、没有跨域问题。

登录相关的接口在 `/api/session/*`，由 Better Auth 提供
（见 `src/pages/api/session/[...path].ts`）。

```bash
npm run api:test       # 跑 API 测试（用内存数据库，39 项断言）
```

### 接口一览

| 方法     | 路径             | 说明                         | 需要登录 |
| -------- | ---------------- | ---------------------------- | -------- |
| `GET`    | `/api/health`    | 健康检查，用来确认服务端能跑 | 否       |
| `*`      | `/api/session/*` | 登录相关（Better Auth 提供） | 部分     |
| `POST`   | `/api/logout`    | 登出，清除登录状态           | 否       |
| `GET`    | `/api/me`        | 当前登录用户                 | 是       |
| `GET`    | `/api/posts`     | 全部文章（含草稿）           | 是       |
| `GET`    | `/api/posts/:id` | 单篇文章                     | 是       |
| `POST`   | `/api/posts`     | 新建                         | 是       |
| `PATCH`  | `/api/posts/:id` | 修改（只改传了的字段）       | 是       |
| `DELETE` | `/api/posts/:id` | 删除                         | 是       |

### 错误格式

所有接口出错时返回同样的形状，前端只写一次处理逻辑：

```json
{ "error": "给用户看的中文说明", "code": "MACHINE_READABLE_CODE" }
```

常用状态码：`400` 请求体不合法 · `401` 未登录 ·
`404` 找不到 · `409` slug 已被占用 · `422` 字段格式不对

### 环境变量

完整说明见 `.env.example`，这里只列清单：

| 变量                   | 用途                           |
| ---------------------- | ------------------------------ |
| `DATABASE_URL`         | 数据库连接串（要带 `-pooler`） |
| `BETTER_AUTH_SECRET`   | 登录状态加密用的密钥           |
| `GITHUB_CLIENT_ID`     | GitHub OAuth App 的 Client ID  |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App 的密钥        |
| `GITHUB_OWNER_ID`      | 只允许这个 GitHub 用户登录     |

⚠️ `BETTER_AUTH_SECRET` 和 `GITHUB_CLIENT_SECRET` 泄露 = 别人能冒充你登录。
不要提交到 git（`.env` 已在 `.gitignore` 里）。
