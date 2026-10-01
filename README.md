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

| 功能                  | 相关文件                                                                                        | 怎么删                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 文章目录              | `src/pages/posts/[...slug]/_components/TableOfContents.astro`                                   | 删这个文件，再删文章页里的 `import TableOfContents` 和 `<TableOfContents />` 那一行                                      |
| 数学公式              | `src/styles/katex.css`<br>`astro.config.ts` 里的 `remarkMath` / `rehypeKatex`                   | 删 `katex.css` 和 `global.css` 里 import 它那行；删配置里两个插件；卸载 `remark-math rehype-katex katex`                 |
| 图表 Mermaid          | `astro.config.ts` 里的 `mermaid()` 集成                                                         | 删那个集成和它的 import；卸载 `astro-mermaid mermaid`                                                                    |
| RSS / Atom 订阅       | `src/lib/feed.ts`<br>`src/pages/rss.xml.ts`<br>`src/pages/atom.xml.ts`                          | 照 `src/lib/feed.ts` 文件头写的 4 步做                                                                                   |
| 友链页                | `src/pages/friends.astro`<br>`src/utils/getFriends.ts`<br>`src/content/friends/`                | 照 `getFriends.ts` 文件头写的 6 步做                                                                                     |
| 说说 /notes           | `src/pages/notes.astro`<br>`src/utils/getNotes.ts`<br>`src/content/notes/`                      | 照 `getNotes.ts` 文件头写的 6 步做                                                                                       |
| 项目 /projects        | `src/pages/projects.astro`<br>`src/utils/getProjects.ts`<br>`src/content/projects/`             | 照 `getProjects.ts` 文件头写的 6 步做（不影响 `profile.astro` 里那份独立数据）                                           |
| 近况页 /now           | `src/pages/now.astro`                                                                           | 删这个文件，再删 Header 里的「近况」链接（桌面 + 移动各一处）和首页那个按钮                                              |
| 代码块复制            | `src/pages/posts/[...slug]/_components/CopyCodeButton.astro`                                    | 删这个文件，再删文章页里的 `<CopyCodeButton />` 那一行                                                                   |
| 氛围层（网格 + 光晕） | `src/styles/atmosphere.css`                                                                     | 删这个文件，再删 `global.css` 里的 `@import "./atmosphere.css"` 和 `Layout.astro` 里的 `<div class="atmosphere">` 那一段 |
| 评论区                | 没有内置                                                                                        | ——                                                                                                                       |
| Pagefind 搜索         | `src/pages/search.astro`<br>`astro-paper.config.ts` 的 `features.search`                        | 改成 `search: false`，页面自动跳 404                                                                                     |
| 归档页                | `src/pages/archives/`                                                                           | `features.showArchives` 改成 `false`                                                                                     |
| 动态 OG 图            | `src/pages/og.png.ts`<br>`src/pages/posts/[...slug]/index.png.ts`                               | `features.dynamicOgImage` 改成 `false`，再删这两个文件                                                                   |
| 主题切换              | `src/scripts/theme.ts`                                                                          | `features.lightAndDarkMode` 改成 `false`                                                                                 |
| 分享按钮              | `astro-paper.config.ts` 的 `shareLinks`                                                         | 把数组清空：`shareLinks: []`                                                                                             |
| 编辑本页链接          | `astro-paper.config.ts` 的 `features.editPost`                                                  | 改成 `{ enabled: false }`                                                                                                |
| 在线写作后台          | `src/pages/admin/`<br>`src/utils/adminApi.ts`                                                   | 删这两个，再删 `src/pages/api/`（连接口也不要的话）                                                                      |
| 文章存数据库          | `src/db/loaders/posts.ts`<br>`src/content.config.ts` 里的 `loader`<br>`scripts/import-posts.ts` | 照 `src/db/loaders/posts.ts` 文件头写的 3 步做（换回 `glob()` + 把文章放回 `src/content/posts/`）                        |
| 保存后自动重建        | `src/lib/rebuild.ts`<br>`.env` 的 `NETLIFY_BUILD_HOOK_URL`                                      | 照 `src/lib/rebuild.ts` 文件头写的 3 步做                                                                                |
| 练习册                | `practice/`                                                                                     | 整个目录删掉，再删 `package.json` 里的 `learn*` 三个脚本                                                                 |
| 学习路线              | `docs/`                                                                                         | 整个目录删掉                                                                                                             |

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
npm run posts:import   # 把 src/content/posts/ 下的 Markdown 导入数据库
```

### 文章存在数据库里

**文章不在 git 里了，在数据库的 `posts` 表里。** 在后台写完点保存，
内容就进库了，不用改代码、不用提交。

页面**仍然**是构建时生成的静态 HTML —— 这点没变，读者那边一点没变慢。
实现方式是给 Astro 的文章集合换了一个「数据来源」：

```text
以前：  glob()  从 src/content/posts/*.md 读
现在：  postsFromDatabase()  从数据库的 posts 表读   ← src/db/loaders/posts.ts
```

上层代码**一行都没改**：`getCollection("posts")`、`render(post)`、
`post.data.xxx` 全都照旧，公式、代码高亮、目录也跟着照旧。
因为 Astro 的 Content Layer 本来就允许集合的数据来自任何地方。

**代价有两个，都要知道：**

```text
1. 构建需要能连上数据库
   npm run build 和 npx astro check 都会去读文章，
   所以本地要 .env、Netlify 要环境变量、GitHub Actions 要配 secret
   （名字都叫 DATABASE_URL）。

2. 内容不再有 git 历史
   改错了没法 git diff / git revert，只能靠数据库自己的备份。
```

**改完文章怎么上线**：靠环境变量 `NETLIFY_BUILD_HOOK_URL`，
后台会通知 Netlify 重新构建（约 1~2 分钟生效）。
但**不是每次保存都触发** ——

> ⚠️ Netlify 免费套餐每次生产部署花 **15 积分**，一个月只有 300 分。
> 所以自动重建只留给"不重建就是错的"那几种情况。

| 操作                           | 自动重建                    | 为什么                                                     |
| ------------------------------ | --------------------------- | ---------------------------------------------------------- |
| 新建并直接发布 / 草稿→已发布   | ✅                          | 站点上要**多**一个页面                                     |
| 已发布→草稿 / 删除已发布的文章 | ✅                          | 站点上要**少**一个页面                                     |
| 改已发布文章的正文/标题/标签   | ❌ 用后台的「立即重建」按钮 | 页面还在，只是内容旧了。改五遍错别字就自动建五次 = 75 积分 |
| 草稿的任何改动                 | ❌                          | 站点上本来就看不到                                         |

保存之后后台会**明确告诉你**这次改动到线上了没有（"已请求重建" 还是
"要点「立即重建」"），不用自己记规则。

没配 `NETLIFY_BUILD_HOOK_URL` 也能用，只是改完文章要等下一次推送代码才生效；
后台会如实显示"没配置，点了也不会重建"。

**为什么不做成"保存即生效"**（把文章页改成按需渲染）：
搜索索引（Pagefind）是构建时产物，运行时渲染出来的文章**搜不到**。
也就是说"保存即生效"本来就做不到 —— 想要搜索就躲不掉重新构建。
既然躲不掉，就让页面继续是静态 HTML，把好处留着。

**本地开发遇到怪事，先删 `.astro/` 再重启**：

```powershell
Remove-Item -Recurse -Force .astro   # 集合数据的缓存
npm run dev
```

改了数据来源（`src/content.config.ts` 的 loader、或 `src/db/loaders/posts.ts`）
之后，`.astro/data-store.json` 这个缓存**不一定会重建**。症状很误导人：
页面渲染出来的是旧数据，看起来像"代码写错了"。实测过一次 ——
数据库里文章的 id 是 10，页面上「编辑本页」却是 `/admin/posts/undefined`。
生产构建每次都是全新的，不受影响。

连接串放在环境变量 `DATABASE_URL` 里。**三个地方都要配，它们是互不相干的**：

| 在哪           | 干什么用的                     | 怎么配                                                                        |
| -------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| 本地 `.env`    | `npm run dev` / `build` / 脚本 | 项目根目录建 `.env`，写入 `DATABASE_URL=postgresql://...`                     |
| GitHub Actions | CI 里的类型检查和构建          | 仓库 → Settings → Secrets and variables → Actions → **New repository secret** |
| Netlify        | 线上构建**和**线上接口         | Site configuration → Environment variables，勾上 **Contains secret values**   |

⚠️ **在 GitHub 加了 secret 不等于 Netlify 也有**，反过来也一样。这个坑踩过：
线上部署报"缺少环境变量 DATABASE_URL"，而 GitHub 的 CI 是绿的。

**怎么确认是 Netlify 这边的问题**：看构建日志里 `Resolved config` 那段的
`environment` 列表——如果只有一个 `NODE_VERSION`，就是这个原因。

**不用纠结「范围 / Scopes」**：Netlify 免费套餐只有 `All scopes` 一种选择，
按用途限制范围（比如只给 Functions）是付费功能。配上了就能被构建读到。

**`npm run db:test` 不需要配置任何东西** —— 它用 PGlite（进程内的
PostgreSQL）现场建一个空库、跑迁移、跑测试，全程不联网、不碰线上数据。

想一次跑完全部测试，用总入口：

```bash
npm test   # 依次跑 7 组，前一组挂了就停
```

它跑的是 `db:test`、`api:test`、`auth:test`、`feed:test`、`friends:test`、
`notes:test`、`projects:test` —— 全部不需要联网、不需要 `.env`，
所以在任何机器上克隆下来就能跑。

**一个容易误判的地方**：`npm test` 全绿**不等于**所有检查都真的跑过。
`feed:test` 里有一组"真实构建产物"检查（`dist/rss.xml`、`dist/atom.xml`），
`dist/` 不存在时它会打印 `⏭️ 不存在（先跑 npm run build）` 然后跳过 ——
这是有意的（不该逼着人先构建才能跑测试），但意味着**刚克隆下来跑
`npm test` 看到的绿色，少了那几条**。想验全就按 `npm run build` → `npm test`
的顺序跑，或者看输出里有没有那行 `⏭️`。

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
npm run api:test       # 跑 API 测试（用内存数据库，53 项断言）
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
| `POST`   | `/api/rebuild`   | 手动触发一次站点重建         | 是       |

写操作的返回值里带一个 `rebuild` 字段，说明**这次改动有没有触发重建**：

```json
{ "post": { "...": "..." }, "rebuild": "triggered" }
```

取值是 `"triggered"`、`"not-configured"`（没配 Build Hook）、`"failed"`，
或者 `null`（这次改动不需要自动重建，比如改了已发布文章的正文）。
后台用它决定提示哪句话 —— 见「改完文章怎么上线」那节。

### 错误格式

所有接口出错时返回同样的形状，前端只写一次处理逻辑：

```json
{ "error": "给用户看的中文说明", "code": "MACHINE_READABLE_CODE" }
```

常用状态码：`400` 请求体不合法 · `401` 未登录 ·
`404` 找不到 · `409` slug 已被占用 · `422` 字段格式不对

### 环境变量

完整说明见 `.env.example`，这里只列清单：

| 变量                     | 用途                                       |
| ------------------------ | ------------------------------------------ |
| `DATABASE_URL`           | 数据库连接串（要带 `-pooler`）             |
| `BETTER_AUTH_SECRET`     | 登录状态加密用的密钥                       |
| `GITHUB_CLIENT_ID`       | GitHub OAuth App 的 Client ID              |
| `GITHUB_CLIENT_SECRET`   | GitHub OAuth App 的密钥                    |
| `GITHUB_OWNER_ID`        | 只允许这个 GitHub 用户登录                 |
| `NETLIFY_BUILD_HOOK_URL` | 保存文章后自动触发重建（见「数据库」那节） |

⚠️ `BETTER_AUTH_SECRET`、`GITHUB_CLIENT_SECRET` 和 `NETLIFY_BUILD_HOOK_URL`
泄露都会出事（前两个能冒充你登录，最后一个谁拿到都能触发构建）。
不要提交到 git（`.env` 已在 `.gitignore` 里）。
