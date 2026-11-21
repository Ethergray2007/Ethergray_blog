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

如果持续无法登录，先检查网络，再按 `docs/DEPLOYMENT.md` 核对 GitHub OAuth 回调地址和 Netlify 环境变量（特别是 `BETTER_AUTH_SECRET` 至少 32 个字符）。登录界面在 `src/pages/admin/index.astro`，请求封装在 `src/utils/adminApi.ts`，认证规则在 `src/lib/auth.ts`；不要为了消除提示而放宽主人身份检查。

验证命令是 `npm run auth:test` 和 `npm run admin:browser:test`。浏览器测试需要本地开发服务器，并用模拟接口验证交互；它不能证明真实 GitHub OAuth 或线上配置已通过。

## 改完文章怎么确认上线

文章存储在 Neon 数据库中，阅读页面按需读取并配合 Netlify CDN 30 秒缓存（见 `src/lib/publicCache.ts`），**不再触发整站重新构建**。

| 操作                         | 当前代码的行为                             | 你需要确认什么                                        |
| ---------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| 保存草稿                     | 仅写入数据库，公开站点、搜索和订阅均不显示 | 后台重新打开仍能读到内容                              |
| 新建并发布 / 改文章 / 改标签 | 写入数据库后立即生效，不消耗部署额度       | 最多等待约 30 秒刷新公开页面、`/search` 与 `/rss.xml` |
| 已发布收回草稿 / 删除文章    | 立即对数据库不可见，旧缓存最多约 30 秒过期 | 最多约 30 秒后正文返回 404，列表与搜索同步消失        |

对应代码：`src/pages/api/_routes/posts.ts` 处理后台读写，`src/lib/publicPosts.ts` 统一过滤公开文章，`src/pages/admin/posts/[id].astro` 显示保存与公开提示。

## 本地检查与排错

先停止正在运行的开发服务器，再按顺序执行：

```powershell
npm run format:check
npx astro check
npx eslint .
npm run build
npm test
```

离线构建和 10 组测试均**不依赖联网或 `.env`**。只有启动 `npm run dev` 访问真实 Neon 数据库，或 `git push` 到 GitHub 时需要网络/代理：

```powershell
$env:NODE_USE_ENV_PROXY = "1"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY  = "http://127.0.0.1:7890"
```

`NODE_USE_ENV_PROXY` 要求 Node 24+。遇到 `npm run dev` 读数据库报 `fetch failed`，先检查 Node 网络与代理端口。

浏览器回归需要先单独运行 `npm run dev`，再在另一终端运行 `npm run admin:browser:test` 和 `npm run public:browser:test`；这些浏览器测试拦截 API，不会真实写入数据库。

## 提交与发布

检查 `git status --porcelain`，只暂存本次改动。提交前运行 `npm run commit:check -- "fix: 具体修改说明"`。平时先推 `develop` 在 `https://develop--ethergray.netlify.app` 验收，确认无误再合并推送 `main`。
