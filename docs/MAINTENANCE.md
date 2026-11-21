<!-- 本指南只提供维护说明。想删除：删除本文件，再移除根 README 的学习资料链接及可选模块登记行。 -->

# 日常维护指南

一次只做一个小改动，先在本地验证，再决定是否发布。项目规则以根目录 `AGENTS.md` 为准。

## 改文字或外观

| 想改什么 | 先看哪里                                        | 怎么确认                                                  |
| -------- | ----------------------------------------------- | --------------------------------------------------------- |
| 首页文字 | `src/i18n/lang/zh.ts`、`en.ts`                  | 首页与手机宽度下都能完整显示；新增键时同时修改 `types.ts` |
| 首页排列 | `src/pages/index.astro`                         | 桌面文章与侧栏布局正常，手机无横向滚动                    |
| 文章卡片 | `src/components/Card.astro`                     | 长标题、标签链接和键盘焦点正常                            |
| 全站颜色 | `src/styles/theme.css`                          | 浅色、深色都能看清文字与按钮；不要在组件里写死颜色        |
| 首屏海报 | `src/styles/hero.css`                           | 手机按钮不挤压，标题与导航都清楚                          |
| 代码字体 | `astro.config.ts`、`src/assets/fonts/README.md` | 代码显示正常，构建生成 `dist/og.png`                      |

## 后台登录排错

入口是 `/admin`，只使用博客主人的 GitHub 账号。已有登录会直接进入文章列表；获取授权地址失败后按钮会恢复，可以重试。取消授权后也会回到登录页。

如果持续无法登录，先检查网络，再按 `docs/DEPLOYMENT.md` 核对 GitHub OAuth 回调地址和 Netlify 环境变量。登录界面在 `src/pages/admin/index.astro`，请求封装在 `src/utils/adminApi.ts`，认证规则在 `src/lib/auth.ts`；不要为了消除提示而放宽主人身份检查。

验证命令是 `npm run auth:test` 和 `npm run admin:browser:test`。浏览器测试需要本地开发服务器，并用模拟接口验证交互；它不能证明真实 GitHub OAuth 或线上配置已通过。

## 改完文章怎么确认上线

文章后台先写数据库，公开页面是在构建时生成的。保存成功不能证明正式站点已经更新。

| 操作                                     | 当前代码的行为               | 你需要确认什么                                                |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| 保存草稿                                 | 不触发重建，公开站点不显示   | 后台重新打开仍能读到内容                                      |
| 新建并发布、切换发布状态、删除已发布文章 | 请求自动重建                 | Netlify 的 Deploys 页面出现新部署并成功                       |
| 修改已发布文章的正文、标题、标签         | 保存后需要手动点「立即重建」 | 确认全部修改完成，再统一重建                                  |
| 提示未配置 Build Hook                    | 不会请求 Netlify             | 在 Netlify 配置 `NETLIFY_BUILD_HOOK_URL`，不要放进本地 `.env` |
| 请求失败或超时                           | 接收结果不确定               | 先检查 Deploys；已有新部署就等待，没有再重试                  |

重建请求成功只代表请求被接收。必须等 Netlify 部署成功，再打开正式文章网址，核对修改过的一句话。此项目尚无自动查询部署完成状态的功能。

对应代码：`src/pages/api/_routes/posts.ts` 决定何时重建，`src/lib/rebuild.ts` 发请求，`src/pages/admin/posts/[id].astro` 显示结果。

## 本地检查与排错

先停止正在运行的开发服务器，再按顺序执行：

```powershell
npm run format:check
npx astro check
npx eslint .
npm run build
```

构建仍要读取 Neon 数据库。本机需要代理时，在当前终端设置：

```powershell
$env:NODE_USE_ENV_PROXY = "1"
$env:HTTPS_PROXY = "http://127.0.0.1:7892"
$env:HTTP_PROXY = "http://127.0.0.1:7892"
```

`NODE_USE_ENV_PROXY` 要求 Node 24+。字体已经随仓库提供，字体加载不再需要 Google 网络；数据库请求仍需要网络。遇到数据库 `fetch failed`，先检查 Node 网络与代理。

改后台行为时补跑 `npm run api:test`。浏览器回归需要先单独运行 `npm run dev`，再在另一终端运行 `npm run admin:browser:test` 和 `npm run public:browser:test`；这些浏览器测试拦截 API，不会真实保存文章或触发重建。

## 提交与发布

检查 `git status --porcelain`，只暂存本次改动。提交前运行 `npm run commit:check -- "fix: 具体修改说明"`。推送 `main` 会影响正式站点，按项目规则先由你确认发布范围。
