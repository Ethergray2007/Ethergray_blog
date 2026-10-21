# 升级待办清单（2026-10-16 评审结果）

> 这份是**只读评审**的产出：6 个不同视角的审查（代码正确性 / 前端性能 / 视觉一致性 / 阅读体验 / 数据与服务层 / 验证手段），
> 全程没有改动任何代码。
>
> **怎么读**：按 P0 → P3 排，P0 是"小改动、收益确定"，P3 是"要先把策略定下来"。
> 每条都给了出处（`文件:行号`）、为什么值得改、怎么改、工作量。
>
> **可信度说明**：结论来自源码通读 + 全仓 grep + 对照 `dist/` 产物，
> **没有在浏览器里跑过站**（`dist/` 最后一次构建是 2026-10-15 23:47，且当时只有一篇文章）。
> 涉及"观感/体感"的条目建议先自己看一眼再动手；涉及构建产物的数字（CSS 体积、字体文件数）改完要重跑 `npm run build` 复核。
>
> 想删掉这份文件：直接删，没有任何代码引用它。

---

## P0 — 立刻值得做（都是一天内的活）

### 1. `BETTER_AUTH_SECRET` 没配时静默退化成**公开的**默认密钥

- 出处：`src/lib/auth.ts:133`（`secret: process.env.BETTER_AUTH_SECRET`）
- 对照：同一个文件里的 `readOwnerId()`（`src/lib/auth.ts:48-65`）和 `src/db/client.ts` 的 `requireDatabaseUrl()` 都写了"缺了就抛一句中文错误"，只有密钥这一处没写。
- 为什么：Better Auth 取值顺序是 `options.secret || env.BETTER_AUTH_SECRET || env.AUTH_SECRET || ""`，最后兜底是一个**写在源码里的公开常量**；它自己只在 `NODE_ENV === "production"` 时才抛错。而本项目在 `src/pages/api/_routes/index.ts:108-119` 里已经明确不信任 Netlify 上的 `NODE_ENV`（那里改用 `import.meta.env.PROD`）——同一份不确定性在认证这一侧还留着。两个条件叠加（没配密钥 + `NODE_ENV` 不是 production）时完全静默，后果是拿到那个常量就能伪造会话 Cookie，直接获得后台写权限。
- 怎么改：照 `readOwnerId()` 的样子加 `requireAuthSecret()`（空 → 抛错；长度 < 32 → 也抛错），不做 `NODE_ENV` 判断，永远 fail-closed。配套改 `practice/tests/api.ts`（它间接 import 了 `src/lib/auth.ts`）和 `practice/tests/auth.ts:33`。
- 工作量：小　风险：低

### 2. `/admin/*` 被主动提交给搜索引擎

- 出处：`astro.config.ts:132-135`（`sitemap({ filter })` 只过滤 `/archives/`）、`src/pages/robots.txt.ts:3-8`（`Allow: /`，没有任何 `Disallow`）
- 实测证据：`dist/sitemap-0.xml` 里确实有 `https://ethergray.netlify.app/admin/` 和 `/admin/posts/`
- 为什么：后台有 Better Auth 保护、不会泄露数据，但登录页被索引对个人博客没有任何好处，搜索结果里出现 `/admin` 也不好。顺带 sitemap 里**一条 `lastmod` 都没有**——博客最该告诉搜索引擎的是"这篇多久前更新过"。
- 怎么改：`robots.txt` 加 `Disallow: /admin/`；`sitemap` 的 filter 加 `!page.includes("/admin")`（顺手排除 `/profile/`，那个页面全站没有入口）；有余力再给 sitemap 带上 `lastmod`。
- 注意：`Disallow` 只挡爬虫，不是权限控制，别当成安全措施。
- 工作量：小　风险：低

### 3. "改过没有"的排序语义没实现注释里承诺的效果

- 出处：`src/db/loaders/posts.ts:81`、`:106-107`、`:114`，`src/db/repositories/posts.ts:182-185`，`src/utils/getSortedPosts.ts:13-21`
- 为什么：loader 的注释（`src/db/loaders/posts.ts:62-80`）写得很清楚，加"60 秒门槛"是为了避免"改个错别字，去年的老文章就顶到首页第一位，还会作为最新一篇推进 RSS 订阅者的阅读器"。但 `isModified` 只是 `updatedAt - publishedAt > 60s`，而 `updatePost` **每次保存都无条件刷新 `updatedAt`**（`src/db/repositories/posts.ts:184`），`getSortedPosts` 又按 `modDatetime ?? pubDatetime` 倒序。于是注释里想避免的那件事恰恰是现在的常态：改一个错别字 → 文章跳到 `/posts` 和首页第一位 → RSS 的 `updated` 被推到当前时间。
- 怎么改：两条路，语义不同，**先决定要哪个**：
  - (a) 只有正文/标题真的变了才刷新 `updatedAt`，让 `modDatetime` 重新变成"作者真想标明改过"的字段；
  - (b) 排序只看 `pubDatetime`，`modDatetime` 只用于 `Datetime.astro` 显示"更新于"。
- 工作量：小（b）～中（a）　风险：中——这是唯一会改变站点可见行为的条目，建议单独一个提交

### 4. 迁移不在部署流程里，schema 只能靠人记得手动跑

- 出处：`package.json:18`（`db:migrate` 是手动命令）、`netlify.toml:13`（构建命令只有 `npm run build`）、`.github/workflows/ci.yml:71`
- 为什么：仓库里已经有 `drizzle/0002_drop_users.sql` 这种必须真跑一次的迁移。代码先上线、列还没加 → 线上接口 500；忘了跑 → 本地库和线上库结构分叉，测试跑的东西和线上不是一个 schema。
- 怎么改：把迁移并进部署链路（`command = "npm run db:migrate && npm run build"`），或在 CI 里单加一步；再约定"迁移文件一旦提交不许再改"。
- 工作量：小

### 5. 三个小回归（各改一两行）

- **无障碍文案硬编码英文**：`src/components/Header.astro:191`（`aria-label="Primary navigation"`）、`src/components/Header.astro:332`（`"Mobile navigation"`）、`src/components/Breadcrumb.astro:75`（`"breadcrumb"`）、`src/components/Pagination.astro:24`（`"Pagination Navigation"`）。AGENTS.md 硬性规矩第 4 条是"界面文案必须走 `src/i18n/`"，而同一文件里 `Header.astro:297` 的 `t.a11y.openMenu` 就是正确写法。中文站的读屏用户现在听到的是英文。改法：`t.a11y` 下补 4 个键，`types.ts` / `lang/zh.ts` / `lang/en.ts` 三处一起改。工作量：小
- **`scroll-smooth` 没被"减少动态效果"兜住**：`src/layouts/Layout.astro:44` 的 `class="overflow-y-scroll scroll-smooth"`，Tailwind 4 的 `scroll-smooth` 不带 `motion-safe:` 包裹，对所有人生效。点目录、点标题锚点、点跳过导航都会平滑滚动——对前庭敏感用户是明确的眩晕触发点。改法：`global.css` 加 `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`（比换类名更好，能兜住以后任何地方写死的情况）。工作量：小
- **`theme-color` 被脚本改成无效值**：`src/scripts/theme.ts:47-51` 读的是 `getComputedStyle(document.body).backgroundColor`，而 `body` **故意没有背景色**（底色只设在 `html` 上，见 `atmosphere.css` 和 `Layout.astro:214-225` 的注释），于是拿到 `transparent`，把 `Layout.astro:161-170` 精心写的两条 `theme-color` 覆盖掉；深色那条因为有 `media` 且 `querySelector` 只取第一个，永远不会被同步。改法：读 `document.documentElement`，或干脆删掉脚本这段只留 CSS 媒体查询的两条静态 meta。工作量：小

---

## P1 — 结构性升级（半天到两天的活）

### 6. 设计系统的执行层：契约是自洽的，落地有 6 处漂移

- **内容左基线有四套**：`src/styles/global.css:89-99` 定义了三个 shell，实际用法是 `Main.astro:27`（content-shell）/ `profile.astro:69`（site-shell）/ `about.astro:119`（手写 `max-w-6xl`，第四个宽度）/ `posts/[...slug]/index.astro:129`（reading-shell）。1280px 视口下四个页面正文左边缘分别在 32 / 96 / 160 / 280px，翻页时整块内容横向跳。另外 11 个页面都有面包屑，**唯独文章页没有**（`posts/[...slug]/index.astro:124` 只有 `<BackButton />`）。
- **h1 有五套写法**：`global.css:141-176` 定义了 `page-heading` / `section-heading`，唯一正确调用者是 `Main.astro:48`。其余散落在 `posts/[...slug]/index.astro:142-149`（第三套，且没有 `page-heading-rule` 渐变线）、`about.astro:137-143`（第四套）、`profile.astro:88`（`text-2xl font-bold`，比自己的 h2 还小）、`profile.astro:305`、`404.astro:22`、`archives/index.astro:81-86`。
- **品牌色写死在组件里**：浅色 primary `#d6336c` 被写进 `Card.astro:24`、`Card.astro:27`、`MotionShowcase.astro:129`、`notes.astro:74`、`projects.astro:68`、`Main.astro:48`（全站每个 h1 都有 `text-shadow-[0_0_20px_rgba(214,51,108,0.14)]`），深色主题的亮粉 `#f06292`（`theme.css:135`）不会生效。改法：`color-mix(in oklab, var(--color-primary) 10%, transparent)`。
- **卡片浮起体系有 5 种阴影配方 + 3 种圆角**，阴影色用的还是 Tailwind 的 slate-900（`rgba(15,23,42,…)`）而不是主题的 `--color-base-content`；主题给的圆角是 `--radius-box: 1rem`。深色下页面底色 `#0b0e15` 与 4% 的深蓝阴影几乎无差 → 深色下卡片只剩描边。详情页那 4 张卡又反过来全用 daisyUI `shadow-sm`。改法：theme.css 注册 `--shadow-elev-1/2`（分主题），圆角统一 `rounded-box`。
- **页脚缩进对不齐**：`Footer.astro:90` 用 `mx-16 … sm:mx-32`，页眉和正文是 `px-4 sm:px-6 lg:px-8`。768px 视口下页脚从 128px 开始、页眉从 24px 开始，差 104px；页脚的品牌标识和页眉左上角是同一个组件，却不在一条竖线上。
- **`eyebrow` 工具类 0 调用**：定义在 `global.css:214-216`（注释明说收进来就是为了防漂移），实际 14 处手写，字距漂成 0.18em / 0.2em 两套（`about.astro:215`、`:290`、`:323`、`:369`，`profile.astro:76` vs `profile.astro:277`、`:411` 等）。

工作量：中（建议拆成多个提交，1、2 会同时动到好几个页面，放最后）

### 7. 首屏性能：真正的浪费在"加载时机"，不在文件大小

- **全站 275 KB CSS 打成一个文件**（`dist/_astro/Footer.*.css`），里面含 20 条只服务数学公式的 `@font-face`（KaTeX）。`global.css:1-10` 一次性 import 了 Tailwind + theme + typography + **katex** + 页面级样式。改法：把 `katex.css`（含 `src/styles/katex.css:21` 的 `@import`）从 `global.css` 挪出去，只在文章页引入，Astro 会为它单独出一个只在文章页加载的 CSS。注意 KaTeX 的 `@font-face` 是 `font-display: block`，公式页可能出现"公式空白最多 3 秒"。
- **字体 preload 打偏**：`src/layouts/Layout.astro:87-96` preload 的是 `--font-mono`（Google Sans Code，34 KB），而首屏最大的文字走 `--font-sans` 系统栈（`theme.css:222-228`）——这个 preload 对 LCP 没帮助，只在关键路径上多占带宽。另外 `dist/_astro/fonts/` 里有 4 个 ttf 是留给 satori 画 OG 图的，浏览器不下载，但占部署包体积。
- **首屏海报图没有 preload 入口**：`hero.css:137-144` 用 CSS `background-image`，预加载扫描器发现不了（要等 CSSOM 建完才发请求），99 KB 的海报和 467 KB webm / 671 KB mp4 的视频同时抢带宽。改法：加 `<link rel="preload" as="image">`，或把背景改成 `<img fetchpriority="high">`（还能顺手拿到 `srcset`）；视频 `preload` 从 `auto` 降到 `metadata`，或推迟到 `load` 之后。
- **滚动时对整个含视频的全屏层做 `filter: blur()`**（`hero.css:118-121`，脚本在 `Hero.astro:259-268` 每帧写入）：`filter` 变化会让浏览器重新栅格化整块 layer。改法三选一：把模糊只挂到静态网格层、改成"过阈值一次性加固定模糊值"、或直接删掉模糊渐进。
- **首屏视频无条件自动播放**：`Hero.astro:340-378` 一律插 `<video autoplay loop preload="auto">` 并 `play()`，文件头注释（`:319-330`）记着"`prefers-reduced-motion` 闸门在 2026-10-12 按要求去掉了"，但 `hero.css:524-539` 又留了一条 `prefers-reduced-motion` 规则——两处策略相反：关掉了 6px 箭头的呼吸动画，却开着满屏视频。源码注释里已经写好了正确方向：给一个"播放背景"按钮，默认只显示海报图。

工作量：小～中（逐条独立，风险都不高，但第 1 条和第 4 条改完要跑一次 `npm run build` 目视四个页面）

### 8. 文章详情的阅读体验

- **目录在正文上方，长文读到一半回不去**：`TableOfContents.astro` 渲染成 `<details open>` 卡片，位置在正文之前（`posts/[...slug]/index.astro:181`），没有侧栏、没有吸顶，全站也没有 scrollspy。改法：≥1280px 时移到正文右侧 `position: sticky; top: 5rem`（`global.css:69` 的 `scroll-padding-top: 5rem` 已经备好，锚点落点不用改）；加 `IntersectionObserver` 高亮当前小节。
- **手机上两个"回到顶部"按钮重叠**：`BackButton.astro:9-41`（`md` 以下是固定圆形进度环，滚过 30% 出现）和 `Layout.astro:249` 全局挂的 `BackToTop`（滚动过 200px 出现）在窄屏落在同一处。改法：二者留一个，或给 `Layout` 加个 `noBackToTop` prop 在文章页排除。
- **分享入口全是海外平台**：`astro-paper.config.ts:48-55` 配的是 WhatsApp / Facebook / X / Telegram / Pinterest / mail，没有微信、没有复制链接。中文博客的分享动作基本只发生在微信，而微信不支持 URL 直接分享——正确做法就是"复制链接 + 一句提示'粘贴到微信'"（可复用 `CopyCodeButton.astro` 里验证过的 `navigator.clipboard` 降级写法）。
- **订阅入口藏得太深**：`/rss` 说明书页做得很好，但入口只在页眉"更多"里（`Header.astro:129`）；首页首屏的 RSS 图标直接链到 `/rss.xml`（`Hero.astro:88`），点下去是一屏 XML 源码。改法：首屏链接改指 `/rss`；文章底部加一句"订阅本站"（刚读完是订阅意愿最强的时刻）。

### 9. 写作后台：改错别字的成本太高

- **没有预览、没有未保存提醒、没有自动保存**：`src/pages/admin/posts/[id].astro` 的正文是裸 `<textarea>`（`:108-112`），全仓搜 `beforeunload|unsaved|autosave` 零命中。唯一看到效果的路径是"保存 → 等 1~2 分钟重建 → 回前台刷新"。更危险的是中途误关标签页，正文只在内存里，直接没了。
- 改法（按性价比）：① `beforeunload` 拦截 + 每 10 秒写一次 `localStorage`，下次打开提示恢复；② 分屏预览，复用现有 Markdown 管线，不需要新依赖；③ 保存成功后给一个"查看线上页面"链接。工作量：中
- **标签输入不认中文逗号**：`admin/posts/[id].astro:333-336` 用英文 `,` 切分，中文输入法默认敲出来的是全角 `，`，于是"前端，Astro"变成**一个**巨大标签，前台卡片和 `/tags` 页都会出现一个没人会点的怪标签——而且是沉默失败，不报错。改法：`/[，,]/` 切分 + trim + 去重 + 去空，输入后立刻显示成小徽章预览。工作量：小

### 10. 搜索：只搜得到文章正文

- 出处推断：Pagefind 只在挂了 `data-pagefind-body` 的页面建索引，全站只有文章详情页挂了（`posts/[...slug]/index.astro:134`）。所以标签页、归档、说说、项目、友链、关于都不在索引里——搜"友链""归档"这类导航意图的词，结果为空且没有任何说明，看起来像坏了。
- 改法：给要搜的页面加 `data-pagefind-body`，装饰块加 `data-pagefind-ignore`；`src/pages/search.astro:161` 的 `PagefindUI` 没传 `translations`，中文站上显示英文的 "Search"/"results" 占位与计数，补一份中文；再加一行"搜标题和正文"的副标题。工作量：小
- 顺带：`search.astro:229-381` 是唯一没接入设计系统的地方——手写了 50% / 60% / 65% 三档近似值（`theme.css:300-310` 的档位是 88 / 66 / 52），且 `.pagefind-ui__message`（Loading…/无结果）会渲染成 12.8px / 700 粗 / 全强度，比结果标题还抢眼。

### 11. 列表页与空状态

- **翻页只给"1 / N"，没有直接跳页**：`Pagination.astro:26-68` 只有上一页 / 当前页 / 下一页，`perPage` 是 4（`astro-paper.config.ts:16`）。想找一年前那篇要点十几次。改法：页码 `上一页 1 2 3 … N 下一页`（手机最多显示 5 个数字）。
- **`/posts` 没有空状态**：`posts/[...page].astro:42-44` 直接 map，没有 `length === 0` 分支（标签页有，`tags/index.astro:74-77`）。新站第一次部署或库连不上时会显示一张只有标题的空页面，看起来像坏了。
- **`/projects` 把每篇正文全量渲染在列表页**（`projects.astro:120-123`）：项目清单会随文档变长无限拉高。改法：摘要卡片 + `<details>` 折叠（`/notes` 这样做是有意设计，保持不变）。
- **空状态有四套写法**：裸 `<p>`（`friends.astro:49`、`notes.astro:63`、`projects.astro:62`）、`alert alert-soft`（`tags/index.astro:75`）、`alert alert-neutral`（`profile.astro:710`）、纯文字状态行（`admin/posts/index.astro:39`）。

### 12. 同一个标签在三个地方三种长相

- `Card.astro:70` 用 daisyUI badge、文章详情用 `Tag size="sm"`（`posts/[...slug]/index.astro:232`）、标签页用 `Tag size="lg"`（`tags/index.astro:63`）。读者从列表点进标签，同一个标签换了形状（没有 `#`、没有阴影、hover 变实心）。改法：Card 里也用 `<Tag>`。
- 附带：`Tag.astro:28` 基础串已有 `text-sm`，`:30` 又给 sm 档加 `text-xs`，靠 Tailwind 产出顺序侥幸生效（已核实 `dist` 里 `.text-sm` 在 `.text-xs` 之前）。

---

## P2 — 数据与内容安全（不可逆风险最高的一类）

### 13. 内容只有一份，而且没有回头路

- 出处：`src/db/repositories/posts.ts:214-220`（`deletePost` 直接 `DELETE`，没有软删除列）、`:177-207`（`updatePost` 直接覆盖 `body`，没有修订表）、`scripts/` 下只有单向的 `import-posts.ts`（Markdown → 数据库），**没有反向导出**。数据库是唯一真相源（`src/db/loaders/posts.ts:11-17`）。
- 风险：误删一篇文章 = 内容永久消失（Markdown 原文只剩 git 历史里那个旧版本）；改错正文无法回退；Neon 项目被删/欠费 = 整站内容蒸发。
- 改法：(a) 加 `deleted_at` + 过滤，做成回收站；(b) 加 `post_revisions` 表，更新前存一份旧 body（API 里已经查过 `before`，正好复用）；(c) 加 `scripts/export-posts.ts` 把 posts 表导回 `src/content/posts/*.md`，与 import 对称——等于给内容做一份可提交的快照。
- 工作量：中

### 14. "只有博主能登录"这条防线只埋在框架钩子里，注释还指错了文件

- 出处：身份校验写在 `src/lib/auth.ts:208-235` 的 `databaseHooks.account.create.before` 里（`readOwnerId()` 全项目只有这一处调用，已核实）。
- 隐患一：它的有效性建立在"account 永不持久化"这个副作用上——无状态模式下每次登录都当新建处理，钩子必然触发；**一旦将来给 Better Auth 加上 `database`**（比如想要"立刻踢掉某个会话"），第二次登录会走 update 分支，`create.before` 不再触发，这条限制会静默失效。
- 隐患二：`src/lib/auth.ts:46` 的注释写"这个检查在 `src/pages/api/_routes/auth.ts` 里、拿到会话之后执行"，**那里没有这段代码**（`resolveUserFromSession` 只看 session 存不存在）。后来者按错的那条去找，会得出"已经有双重检查"的错误结论。
- 改法：在 `resolveUserFromSession` 里加显式校验（GitHub 身份必须匹配 `GITHUB_OWNER_ID` 白名单），钩子留作纵深防御；改正注释；补一条"身份不匹配必须 401"的测试。
- 工作量：小

### 15. 构建期每次全量 `SELECT *`（含正文），无重试、无超时

- 出处：`src/db/loaders/posts.ts:132` 调 `listAllPosts`（`src/db/repositories/posts.ts:58-67`），一次取回所有文章的所有列（含 `body` 全文、含草稿）。同一份数据在一次 CI 流水线里要读三遍（`npx astro check` + `build` 内部的 `astro check` + content loader）。Neon HTTP 驱动是一条查询一个 fetch，`loadRows()` 只有一层 try/catch，没有重试、没有超时、没有退避。
- 改法：构建期先取元数据列，正文按批取；`loadRows()` 加一次带退避的重试 + `AbortSignal.timeout`；CI 去掉重复的 `astro check`。
- 工作量：中

### 16. `coalesce(...)` 排序让已有索引完全失效

- 出处：`src/db/repositories/posts.ts:65` 的 `desc(coalesce(published_at, created_at))`，命不中为列表页建的 `posts_status_published_at_idx`（`src/db/schema.ts:105`），每次全表 Sort。而"已发布必有发布时间"的检查约束（`src/db/schema.ts:121-124`）本来就是为了消除 NULL、让查询能用上索引。
- 附带：`listPublishedPosts`（`src/db/repositories/posts.ts:34-53`）目前没有任何调用者，是死代码。
- 改法：把约束升级为"`published_at` 永不为空"（草稿也给值，`scripts/import-posts.ts:179` 已经是这个做法），排序退回 `desc(posts.publishedAt)`；或加表达式索引；顺手删死代码。

### 17. 500 错误不写任何日志，原始错误链被丢掉

- 出处：`src/pages/api/_routes/index.ts:120-129` 只拼响应体，完全没有日志（对比 `src/lib/rebuild.ts:66` 是明确开了 `eslint-disable no-console` 口子才记日志的——说明项目并不排斥日志）；`src/db/loaders/posts.ts:133-158` 把原始错误包成中文提示时只保留 message，丢了 stack 与 cause，而 Drizzle 的真实原因恰恰在 `cause` 上（AGENTS.md 专门记过）。
- 风险：Netlify Functions 的日志是唯一的线上可观测渠道，现在数据库报错、类型错误、第三方超时统统只变成一句"服务器出错了"。
- 改法：兜底分支加结构化日志（方法、路径、错误栈）；`loadRows()` 改成 `new Error(msg, { cause: error })`。

### 18. 一次 PATCH 要走 4 次数据库往返，而且是"读-判断-写"的非原子序列

- 出处：`src/pages/api/_routes/posts.ts:440` 查 slug → `:456` 读旧状态 → `updatePost` 内部又 select 一次（`src/db/repositories/posts.ts:188-198`）→ 才 update。Neon HTTP 驱动每条都是一次独立 fetch（`src/db/client.ts:11` 记的实测是单篇查询 209~237ms），且该驱动**不支持交互式事务**。
- 风险：保存一次约 0.8~1s 纯网络等待；两个标签页同时保存会互相覆盖，而"该不该触发重建"的判断正建立在这份可能已过期的读上。
- 改法：把"补 `published_at` + 更新 + 返回旧状态"压成一条 CTE SQL；slug 冲突交给唯一索引 + 已经写好的 `isSlugUniqueViolation()`，去掉主动预查。
- 工作量：中

### 19. 自家接口没有任何限流，而 `/api/rebuild` 是按次花钱的

- 出处：`src/pages/api/_routes/index.ts:53-56` 没有任何守门中间件；`src/pages/api/_routes/posts.ts:562-572` 的 `POST /api/rebuild` 一次请求 = 一次 Netlify 生产部署（`src/lib/rebuild.ts:23-34` 自己算过：15 积分/次，一个月 300）。
- 附带：`GET /api/posts` 返回全部文章含正文、**无分页**（`posts.ts:213-224`）；校验 schema 里 `body` / `description` 没有长度上限（`validation.ts:44-45`）；校验依赖的 `@sinclair/typebox` **没写进 `package.json`**（`validation.ts:7-10` 自己承认是借 elysia 带来的传递依赖）。
- 改法：给 `/api/rebuild` 加最小间隔（60s 内返回 429）；`GET /api/posts` 加分页；写接口加 `Origin` 校验（白名单复用 `trustedOrigins()`）；`body` 加 `maxLength`；把 typebox 显式写进 dependencies。
- 工作量：中

### 20. 两个"两套逻辑"的分叉风险

- **测试用的迁移执行器 vs 真实迁移**：`src/db/migrate-for-test.ts:72-91` 自己 `readdir` 按**文件名**排序执行 `.sql`，不读 `drizzle/meta/_journal.json`；真实库走 `drizzle-kit migrate`，按 journal + `__drizzle_migrations` 记账。一旦文件名顺序 ≠ journal 顺序（重命名、squash、手写迁移——`drizzle/0001_github_login.sql` 正是手写的），测试库与线上库会悄悄分叉。改法：按 journal 顺序执行，或直接给 PGlite 用 drizzle 官方 migrator。工作量：小
- **接口形状写了三份**：`src/utils/adminApi.ts:72-84`、`:113` 与 `src/lib/rebuild.ts:77`、`src/db/schema.ts:129`。注释里说的"不能 import 服务端文件"对**值导入**成立，对 `import type` 不成立（编译时被完全擦除）。改法：把"线上 JSON 形状"提到一个共享文件，两边都从那里 import（注意 `Date` → `string` 的映射要写清楚）。

### 21. 其余几处小而真实的正确性问题

- `readJsonBody` 用 `?? {}` 把"没拿到请求体"伪装成"空对象"（`src/pages/api/_routes/validation.ts:110-111`）：`POST` 会回 422"数据格式不对"（作者会去改自己的标题），`PATCH` 会 `updatePost` 一个空对象、返回 200 而**一个字没改**（并且按 P0-3 还会把文章顶到列表首位）。改法：`bodyUsed === true` 且没拿到体时明确报错，不要吞掉。工作量：小
- `validate()` 不返回类型，路由里用两处 `as` 断言（`validation.ts:136`，`posts.ts:292-300`、`:403-411`）；而 `validation.ts` 已经导出的 `CreatePostBody` / `UpdatePostBody` 两个类型**没有任何地方用到**。改法：`validate` 返回判别联合，断言消失。工作量：小
- `filePath` 那一整条分支是死代码：数据库来的条目没有 `filePath`，所以 `getPostPathSegments()` 恒返回 `[]`、`getPostSlugPath()` 恒等于 id，`src/utils/getPostPaths.ts:6-29` 的逻辑永远不会执行，而 `src/content.config.ts:10-14` 的注释容易让人以为它还在工作。改法：删掉（TypeScript 会把调用点全指出来），或把文件头改成"为'改回 Markdown 存文章'预留、当前不生效"。工作量：小
- 两张 OG 图的 satori 布局几乎逐字重复约 130 行（`src/pages/og.png.ts:28-163` 与 `posts/[...slug]/index.astro` 旁边的 `index.png.ts:31-192`）：抽 `src/lib/og-image.ts` 导出 `renderOgImage({ title, subtitle, footer })`。工作量：中
- "谁能被读者看到"这条规则写了四份，其中 `posts/[...slug]/index.png.ts:16-18` 已经漂移（定时发布的文章不生成页面，却会生成一张访问不到的孤儿 OG 图）。改法：`index.png.ts` 复用 `getSortedPosts`，两个列表页去掉多余的 `!data.draft`。工作量：小
- 一次 PATCH 的 slug 冲突可以从"主动预查"改成"靠唯一索引 + `isSlugUniqueViolation()`"，少一次往返（见第 18 条）。

---

## P3 — 验证网的窟窿（要先做策略决定）

### 22. i18n 三文件同步完全没有兜底 ★

- 出处：`src/i18n/lang/zh.ts:3` 与 `lang/en.ts:3` 都是裸 `export default {`，没有任何类型断言；`src/i18n/types.ts:1` 的 `UIStrings` 只被 `import type` 了、没用来约束；`src/i18n/index.ts:5-13` 的 `import.meta.glob<{ default: UIStrings }>` 是**断言**不是校验。
- 后果：`zh.ts` 少一个键 → `astro check` / `build` / `npm test` 全绿，线上中文站**静默显示英文**。AGENTS.md 第 4 条那条硬规矩现在就靠人肉盯着。
- 改法：两个语言文件各加一行 `satisfies UIStrings`（零新依赖）；再加一个纯 node 测试做键集合深度对比。顺手把 `useTranslations(Astro.currentLocale)` 改成显式 `?? config.site.lang`（`currentLocale` 的类型是 `string | undefined`，会落回 `src/i18n/index.ts:16` 的默认值 `"en"`）。工作量：小

### 23. i18n 语言切换根本没有产物，却没人报警（要先决定意图）

- 出处：`astro.config.ts:137-143` 配了 `locales: ["zh","en"]`，但 `src/pages/**` 下**没有任何 `en/` 目录**（25 个 .astro 全在根层），30+ 处读 `Astro.currentLocale`。
- 二选一：(a) 承认单语言，把 `locales` 收成 `["zh"]`，并在 `types.ts` 注明 `en.ts` 是"备用翻译"；(b) 保留双语意图，加一个构建后检查断言 `/en/` 下页面数 > 0。**先决定，再决定检查**，不要两条都留着。

### 24. 设计 token 回退零检查

- 出处：`src/styles/global.css:32` 的 `themes: false`（AGENTS.md 明写"不能删，删了改了颜色也不变"）；`eslint.config.js` 没有任何 CSS / 颜色规则，`.prettierrc` 只管格式。
- 现场统计：`src/styles/*.css` 里 117 处裸色值，其中 `theme.css` 是应有的定义、`hero.css` 是契约允许的例外，真正的硬编码在 `nav.css:596`、`nav.css:162`、`nav.css:176`、`back-to-top.css:70-71`、`:124-125`、`page-glow.css:152-155`。
- 改法：加一个不引依赖的 node 检查，断言 `global.css` 含 `themes: false`，并扫描 `.astro` / `.css` 里的 `#rrggbb` / `rgb(` 白名单只允许 `theme.css` + `hero.css`；对比度可以用仓库里已有的 Material Color Utilities 产物（`practice/_out/mcu/package/contrast/`）算，不必新装包。工作量：中

### 25. `dist/` 产物完整性没有总检查，而且 `feed:test` 会静默跳过

- 出处：`practice/tests/feed.ts:53-56`、`:100`、`:115`、`:185` 四处 `⏭️ … 不存在（先跑 npm run build）` + `continue`。`src/pages/robots.txt.ts:11` 和 `src/layouts/Layout.astro:106` 引用的 `sitemap-index.xml`，**全仓库没有任何测试读它**；`dist/og.png`、`dist/robots.txt`、文章页数量都没有断言。
- 后果：`@astrojs/sitemap` 的 filter 写错、站点 URL 变了导致 sitemap 全是旧域名、OG 图路由被误删 → 全都构建成功、全部没人发现。裸 `npm test` 的绿灯**不等于**端到端验过。
- 改法：加一个"构建后 smoke"脚本，断言 `dist/` 里存在 `sitemap-index.xml`、`robots.txt`、`og.png`、`rss.xml`、`atom.xml`、`index.html`，并抽取 sitemap 的 URL 前缀与 `config.site.url` 比对；把 `feed:test` 的跳过改成必须显式传 `--allow-missing-dist`。工作量：中

### 26. 构建期字体下载失败只有"撞上了才知道"

- 出处：`astro.config.ts:187-210`（`fontProviders.google()`），失败链 `src/pages/og.png.ts:10-16` → `getFontPathByWeight` 返回 `undefined` → 抛 `Cannot find the font path.`。AGENTS.md 里已经记了两次实测 + `expires` 过期 + Node fetch 不读系统代理。CI 里没有任何针对这层的预检（`ci.yml` 只有一条 `npm run build`）。
- 关键点：CI 在 GitHub Runner 上是公网直连，本机必须走代理——**CI 绿不能推出本机能建**，反之亦然。
- 改法：构建前插一条字体可达性 HEAD 预检，失败时打印"这是网络/代理问题，不是配置问题" + 那三个环境变量；根治方案 AGENTS.md 已给出（ttf 提交进仓库 + 自定义 provider）。工作量：预检小 / 根治中

### 27. 文章正文渲染失败、数据库读不到，这两条错误路径没有测试

- 出处：`src/db/loaders/posts.ts:190-207`（0 篇文章 → 抛错中止构建）、`:222-237`（`renderMarkdown` 失败 → 带 slug 抛错）；`practice/tests/db.ts:33` **只导入纯函数 `toEntryData`**，文件头注释直说"loader 本体依赖 Astro 上下文，测不了"。
- 后果：典型坏内容是正文里的 Mermaid / KaTeX 语法错、callout 语法错，或 `DATABASE_URL` 指向了另一个 Neon 分支（0 行）。本地全绿，只有构建会红——而构建一红，Netlify 上就是旧版本继续对外服务。
- 改法：`load()` 的 `renderMarkdown` 本来就是参数注入的，用 PGlite + 几篇"故意写坏"的正文调用它，断言抛出的错误里带 slug；再补一条"0 行必须抛错"。工作量：中

### 28. 部署配置漂移：`develop` 与 `main` 的差异零检查

- 出处：`netlify.toml:10-21` 只有 `[build]` 和 `[build.environment]`（`[context.production]` 是注释掉的）；README 明说 `DATABASE_URL` 要在三个互不相干的地方各配一次；`.env.example` 明说 Build Hook **分支必须选 main**；`src/lib/rebuild.ts:101-115` 的 `"not-configured"` 分支**不报错**。
- 后果：Build Hook 选成 develop → 保存文章后触发的是预览部署，你一直等一个不会来的更新；Preview 部署的环境变量与生产是两套，推了 develop 才知道。
- 改法：给 `"not-configured"` 分支补测试（现在 `practice/tests/api.ts:60-64` 用的是替身，真实实现的分支一条都没测）；文档侧做一个只打印对照表的环境变量清单脚本。真实部署验证**部分无法自动化**，要如实说明。

### 29. 「界面文案不得硬编码」这条硬规矩没有任何机械检查（要先定边界）

- 现状：`src/pages/` 下大量中文散文直接写在模板里——`about.astro:182`、`:188`、`:219`、`:327`、`:373`、`:407`、`:434`，`profile.astro` 里约 50 处。`src/i18n/types.ts:273-278` 甚至专门说明"后台只有你一个人用，中英文都写上是为了保持结构完整"。
- **先决定策略**：要么承认"i18n 只管框架文案，正文类长文本留模板里"并在 AGENTS.md 写明边界（成本 0）；要么做 `profile.astro` / `about.astro` 的迁移（成本很大）。中间态最差。
- 不建议现在就上硬编码 lint：存量太大，一开就是红的。

---

## 已经做对、改的时候别碰

- 外链 `target="_blank"` **零缺口**：16 处全都有 `rel="noopener noreferrer"` 或 `rel="noreferrer"`。
- `bg-base-100` 的 60 处用法都正确（卡片/浮层/下拉面板），页面底色走 `html` + `--page-bg`。
- 空库保护（`src/db/loaders/posts.ts:190-207`）堵住了"部署成功、站点变空博客"这条路，写得很好。
- `hero.css` / `nav.css` 里的写死色值是契约允许的例外（固定深色区），别按第 6 条的思路去改。
- 面包屑的 slug → 中文映射表（`Breadcrumb.astro:32-43`）和目录直接用 Astro 的 `headings.slug`，都是"不重造轮子"的正确选择。
- 后台的加载/错误/空三态共用一个 `#status`，文案全部走 `data-*` 从服务端传，没有在脚本里硬编码中文。
- 归档时间轴的圆点对齐是实测后才覆盖 daisyUI 的（`archives/index.astro:164-228`）。

---

## 建议的动手顺序

```text
第一批（半天，零风险，互不冲突）
  P0-5  三个小回归：aria-label / scroll-smooth / theme-color
  P0-2  robots + sitemap 过滤 admin
  P0-1  BETTER_AUTH_SECRET 校验
  第 22 条  i18n satisfies UIStrings（一行）

第二批（单独一个提交，需要你确认语义）
  P0-3  modDatetime 排序：到底要 (a) 还是 (b)

第三批（各半天，独立可并行）
  P0-4  迁移进部署流程
  第 21 条  readJsonBody / validate 类型 / filePath 死代码
  第 15、16、17 条  索引 + 日志 + 查询收拢

第四批（要一起看效果）
  第 7 条  首屏性能（KaTeX CSS 按页加载、preload、视频时机）
  第 6 条  设计系统执行层（左基线、h1、写死色、阴影）

第五批（新功能性质，单独排期）
  第 13 条  内容备份/回收站/导出
  第 9 条   后台预览与自动保存
  第 8 条   目录吸顶 + scrollspy
```

每批改完都按 AGENTS.md 的四条检查走：`npm run format:check` → `npx astro check` → `npx eslint .` → `npm run build`，
并且**先停掉 dev server**，本机还要先设好 `NODE_USE_ENV_PROXY` / `HTTPS_PROXY` / `HTTP_PROXY` 三个变量。
