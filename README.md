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

| 功能          | 相关文件                                                                                                                       | 怎么删                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 阅读时长      | `src/utils/getReadingTime.ts`<br>`src/pages/posts/[...slug]/_components/ReadingTime.astro`<br>`src/assets/icons/IconClock.svg` | 删这 3 个文件，再删文章页里的 `import ReadingTime` 和 `<ReadingTime />` 那一行         |
| 文章目录      | `src/utils/getTableOfContents.ts`<br>`src/pages/posts/[...slug]/_components/TableOfContents.astro`                             | 删这 2 个文件，再删文章页里的 `import TableOfContents` 和 `<TableOfContents />` 那一行 |
| 近况页 /now   | `src/pages/now.astro`                                                                                                          | 删这个文件，再删 Header 里的「近况」链接（桌面 + 移动各一处）和首页那个按钮            |
| 代码块复制    | `src/pages/posts/[...slug]/_components/CopyCodeButton.astro`                                                                   | 删这个文件，再删文章页里的 `<CopyCodeButton />` 那一行                                 |
| 评论区        | 没有内置                                                                                                                       | ——                                                                                     |
| Pagefind 搜索 | `src/pages/search.astro`<br>`astro-paper.config.ts` 的 `features.search`                                                       | 改成 `search: false`，页面自动跳 404                                                   |
| 归档页        | `src/pages/archives/`                                                                                                          | `features.showArchives` 改成 `false`                                                   |
| 动态 OG 图    | `src/pages/og.png.ts`<br>`src/pages/posts/[...slug]/index.png.ts`                                                              | `features.dynamicOgImage` 改成 `false`，再删这两个文件                                 |
| 主题切换      | `src/scripts/theme.ts`                                                                                                         | `features.lightAndDarkMode` 改成 `false`                                               |
| 分享按钮      | `astro-paper.config.ts` 的 `shareLinks`                                                                                        | 把数组清空：`shareLinks: []`                                                           |
| 编辑本页链接  | `astro-paper.config.ts` 的 `features.editPost`                                                                                 | 改成 `{ enabled: false }`                                                              |
| 练习册        | `practice/`                                                                                                                    | 整个目录删掉，再删 `package.json` 里的 `learn*` 三个脚本                               |
| 学习路线      | `docs/`                                                                                                                        | 整个目录删掉                                                                           |

## 📚 学习资料 / Learning

- [学习路线：TypeScript → Astro](docs/LEARNING-ROADMAP.md) —— 每个知识点对应仓库里的哪个文件
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
