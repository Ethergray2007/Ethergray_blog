# 部署指南

> 这份文档记录的是**查过官方文档、验证过**的部署要点，不是凭印象写的。
> 原始出处都在每节里标了链接。

---

## 要配的环境变量

在 Netlify 后台 **Site configuration → Environment variables** 里加：

| 变量 | 值 |
| --- | --- |
| `DATABASE_URL` | Neon 给**连接池**连接串（见下方"必须用连接池"） |
| `SESSION_SECRET` | 和 `.env` 里同一个值 |

生成 `SESSION_SECRET`：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ⚠️ 不要写进 `netlify.toml`

Netlify 文档明确说明（[出处](https://docs.netlify.com/build/functions/environment-variables/)）：

> Environment variables declared in a Netlify configuration file (`netlify.toml`)
> are **not available to serverless functions**.

`netlify.toml` 里的变量只在构建阶段可见。我们的 API 是运行时跑的
Netlify Function，所以 `DATABASE_URL` 和 `SESSION_SECRET` **必须**
在后台 UI 里配。

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

## 关于数据库驱动：一个已知的偏离

**Neon 官方为 Serverless 平台推荐的是 HTTP 版驱动**
（[出处](https://neon.com/docs/connect/choose-connection)）：

| 环境 | 官方推荐驱动 |
| --- | --- |
| 长驻服务器（VPS / Docker） | `pg` 或 `postgres.js` |
| **Netlify / Deno Deploy / Cloudflare** | **`@neondatabase/serverless`** |

**我们目前用的是 `postgres`（TCP 版）。** 这是有意的取舍，不是疏忽：

### 为什么先用 TCP 版

- Drizzle 对 `postgres-js` 的支持最成熟，换成 HTTP 驱动要同时换
  Drizzle 的驱动适配层，改动面不小
- 已经配合了连接池连接串 + `max: 1`，连接数风险已经被压住
- 本地和线上都实测通过了

### 什么时候该换成 HTTP 驱动

出现下面任一情况就值得换：

```text
□ Netlify 日志里出现 "too many connections" 或连接相关错误
□ 并发请求变多（比如以后开放评论），TCP 连接不够用
□ 冷启动明显变慢，且确认是建连接导致的
□ 想用 Neon 的分支功能做预览环境隔离
```

不出现就先不动 —— **能跑通的代码不要为了"更符合推荐"而重写**。

## 区域选择：让数据库和函数在同一个地方

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
□ Netlify 后台配了 DATABASE_URL 和 SESSION_SECRET
□ 推送到 main 之前，先在 develop 的预览站上验证
□ 本地跑过四条检查 + 三套测试
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
