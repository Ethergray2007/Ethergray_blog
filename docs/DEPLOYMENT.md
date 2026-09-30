# 部署指南

> 这份文档记录的是**查过官方文档、验证过**的部署要点，不是凭印象写的。
> 原始出处都在每节里标了链接。

---

## 要配的环境变量

在 Netlify 后台 **Site configuration → Environment variables** 里加：

| 变量 | 值 |
| --- | --- |
| `DATABASE_URL` | Neon 给**连接池**连接串（见下方"必须用连接池"） |
| `BETTER_AUTH_SECRET` | 和 `.env` 里同一个值 |
| `GITHUB_CLIENT_ID` | **线上那个** OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | **线上那个** OAuth App 的 Client secret |
| `GITHUB_OWNER_ID` | 你的 GitHub 用户 id（和本地填同一个数字） |

生成 `BETTER_AUTH_SECRET`：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ⚠️ OAuth App 要建两个

GitHub 要求回调地址**完全匹配**，而本地和线上地址不同：

```text
本地  http://localhost:4321/api/session/callback/github
线上  https://你的域名/api/session/callback/github
```

所以去 [GitHub 开发者设置](https://github.com/settings/developers) 建**两个**
OAuth App，一个填本地地址、一个填线上地址。它们各有各的 Client ID 和
secret —— 别把线上的填进本地 `.env`，否则回调地址对不上，登录会失败。

（线上那个 App 的 Homepage URL 填你的域名；本地那个填
`http://localhost:4321`。）

### ⚠️ 不要写进 `netlify.toml`

Netlify 文档明确说明（[出处](https://docs.netlify.com/build/functions/environment-variables/)）：

> Environment variables declared in a Netlify configuration file (`netlify.toml`)
> are **not available to serverless functions**.

`netlify.toml` 里的变量只在构建阶段可见。我们的 API 是运行时跑的
Netlify Function，所以上面这些**必须**在后台 UI 里配。

### 改完要重新部署

同一页文档还说明：环境变量按**部署时的值**固化。
改了变量必须触发一次新部署才生效，光是保存不会生效。

---

## 必须用连接池连接串

Neon 提供两种连接串（[出处](https://neon.com/docs/connect/choose-connection)）：

```
# 连接池（Pooled）—— 我们用这个
postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# 直连（Direct）—— 不要用于 Netlify
postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**区别只在主机名里有没有 `-pooler`。**

为什么要用连接池：Netlify Functions 每次冷启动都可能新建数据库连接。
不用连接池的话，并发请求很容易把数据库的连接数用满。

### 关于"双重连接池"

同一份文档里的警告：

> If you use a pooled Neon connection, avoid adding client-side pooling on top.

Neon 那边已经用 PgBouncer 做了池化。我们客户端也设了 `max: 1`
（见 `src/db/client.ts`），这是**刻意保留**的 —— 它保证每个函数实例
最多只占一个连接，而不是在 PgBouncer 之上再叠一层池。
两侧加起来的连接数才不会失控。

---

## 数据库驱动：用的是 Neon HTTP 驱动

官方为 Serverless 平台推荐 HTTP 版驱动
（[Neon 文档](https://neon.com/docs/connect/choose-connection)、
[Drizzle 文档](https://orm.drizzle.team/docs/connect-neon)）：

| 环境 | 官方推荐驱动 |
| --- | --- |
| 长驻服务器（VPS / Docker） | `pg` 或 `postgres.js` |
| **Netlify / Deno Deploy / Cloudflare** | **`@neondatabase/serverless`** |

**我们用的是 HTTP 驱动**（`drizzle-orm/neon-http` + `@neondatabase/serverless`）。

### 为什么换（实测数据）

一开始用的是 TCP 驱动的 `postgres` 包。后来对**真实 Neon 各跑 3 轮取中位数**
做了对比，才决定换：

| 场景 | TCP（postgres） | HTTP（neon-http） | 差异 |
| --- | --- | --- | --- |
| 冷启动第一次请求 | 2621~5107 ms | 687~3613 ms | **HTTP 快 2~4 倍** |
| 按 slug 查单篇 | 447~476 ms | 209~237 ms | **HTTP 快约一半** |
| 列文章 | 208~238 ms | 233~261 ms | 基本持平 |

规律：**HTTP 在冷启动和单行查询上明显更快**，而这正是后台的主要场景。

原理：HTTP 驱动把每条查询发成一个 fetch 请求，不需要建 TCP 连接、
不需要维护连接池 —— 正好适合"一问一答"的后台。

### 代价

```text
□ 它只能连 Neon（连不了本地 Postgres）
□ 不支持会话和交互式事务（我们是一问一答，用不到）
```

测试用的是 PGlite，走 `drizzle-orm/pglite`，不受影响。
本地开发用的也是真 Neon 连接串，同样不受影响。

### ⚠️ 但 `postgres` 包不能删

`drizzle-kit`（跑迁移的工具）自己不依赖 `postgres`，而是**用项目里装的那个**
来执行迁移。删掉之后 `npm run db:migrate` 会失败，报错信息还不明显。

（`npm run db:migrate` 的输出里有 `Using 'postgres' driver for database querying`
这一行，就是这个原因。）

### 关于"双重连接池"

Neon 文档里的警告：

> If you use a pooled Neon connection, avoid adding client-side pooling on top.

这条对 HTTP 驱动**不适用** —— HTTP 驱动根本没有"客户端连接池"这个概念，
每条查询都是独立的 HTTP 请求。所以也不存在双重池化的问题。

连接串里的 `-pooler` 保留着，它对 HTTP 驱动无害（主机名指向同一个地方）。

---

这是**最容易忽略、影响最大**的一点。

Netlify Functions 默认跑在 `cmh`（美国东部·俄亥俄），
见[官方文档](https://docs.netlify.com/build/functions/configuration/#region)。

所以：

| 你的情况 | 建议 |
| --- | --- |
| Neon 建在 US East | 什么都不用改，默认就对 |
| Neon 建在 Singapore | **要么把 Neon 换到 US East，要么把函数的区域改成 `sin`** |

**为什么重要**：每次数据库查询都要跨一次太平洋。
如果一个页面要查 3 次，用户就要多等 3 个来回。
博客本身是静态的，唯一的动态部分就是后台，所以影响有限 ——
但如果你选了 Singapore，这个不匹配值得改掉。

### 怎么改函数的区域

⚠️ **不能用 `netlify.toml`**。文档里写得很清楚：

> If your project uses a framework adapter (e.g. Tanstack Start, Astro, Next.js)
> the function files are generated at build time and you **can't add
> `export const config`** to them.

我们是 Astro 项目，函数是适配器生成的，所以只能在
Netlify 后台改：**Cloud compute → Functions → Region**，然后重新部署。

（顺带一提：自定义区域是付费功能，免费计划可能改不了。
所以**更省事的做法是让 Neon 跟着 Netlify 走，建在 US East**。）

---

## 部署前检查清单

```text
□ Neon 项目建在 US East（跟 Netlify 函数的默认区域一致）
□ 复制的连接串主机名里带 -pooler
□ GitHub 上建了**线上专用的** OAuth App，回调地址填线上域名
□ Netlify 后台配了 5 个变量：DATABASE_URL / BETTER_AUTH_SECRET /
  GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / GITHUB_OWNER_ID
□ 推送到 main 之前，先在 develop 的预览站上验证
□ 本地跑过四条检查 + 两套测试
```

---

## 验证线上是否正常

部署完打开：

```text
https://你的域名/api/health
```

应该返回 JSON，而且**刷新几次 `timestamp` 每次都在变** ——
那说明服务端真的在跑。

如果返回 500，先看 Netlify 的 Functions 日志
（后台 → Logs → Functions），常见原因是环境变量没配或连接串用了直连版。
