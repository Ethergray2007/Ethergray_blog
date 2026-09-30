# 项目约定

> 这份文档是给"接手这个项目的 AI"看的，也是给你的备忘。
> 每次改动都按这里的规矩来，代码才不会越做越乱。

---

## 这个项目的定位

**不只是博客，也是学习项目。**

所以要同时满足两件事：

1. 博客要真的能用、好看、快
2. 代码要让人**看得懂、改得动、删得掉**

第二点经常和"写得快"冲突。冲突时**选第二点**。

---

## 硬性规矩

### 1. 一个功能 = 一组自包含文件

新功能不要散落在各处。标准结构：

```text
src/utils/xxx.ts                          纯计算，不碰 DOM，不碰 Astro
src/pages/.../\_components/Xxx.astro       只做渲染
```

**接入页面时最多 2 行**：一个 import + 一个标签。

### 2. 每个新文件头部写"怎么删"

```astro
---
/**
 * 功能名
 * ============================================================
 * 自包含模块：只依赖 xxx.ts
 *
 * 想删掉这个功能？
 *   1. 删掉这个文件
 *   2. 删掉文章页里的 <Xxx /> 那一行
 *   3. 删掉 src/utils/xxx.ts
 * ============================================================
 */
```

同时在 `README.md` 的「可选模块」表里登记一行。

### 3. 注释解释"为什么"，不是"做什么"

```ts
// ❌ 没用：把月份加 1
const month = date.getMonth() + 1;

// ✅ 有用：getMonth() 返回 0~11，1 月是 0，所以要 +1
const month = date.getMonth() + 1;
```

遇到**反直觉的地方必须写注释**：
- 为什么不能用那个"更现成"的方案（比如为什么 TOC 不能用 `slugifyStr`）
- 为什么顺序不能换（比如为什么必须先删代码块）
- 踩过的坑和它报的错长什么样

### 4. 中文优先

- 注释用中文
- 界面文案必须走 `src/i18n/`，**不要硬编码在模板里**
- 加文案要同时改三个文件：`types.ts`、`lang/zh.ts`、`lang/en.ts`

### 5. 能简单就不复杂

- 不加没有实际用途的配置开关
- 不为了"以后可能用到"而抽象
- 一个函数只做一件事
- 优先用项目已有的模式，不引入新写法

---

## 改完必须过的检查

**按这个顺序跑**，先跑最快的：

```bash
npm run format:check # 1. 最快，而且能抓到别人抓不到的错（见下）
npx astro check      # 2. 类型检查，必须 0 错误
npx eslint .         # 3. 必须 0 问题
npm run build        # 4. 最慢，但最接近真实运行环境
```

四条全过才算做完。

**顺序很重要。** `format:check` 看着只是"格式化"，但它是唯一能发现
**"表达式内部写了 HTML 注释"**的检查：

```astro
{
  cond ? (
    <div>
      <!-- 这样写是错的，Prettier 会报 SyntaxError -->
    </div>
  ) : null
}
```

`astro check` 和 `build` **都不会报这个错** —— 构建能通过，但文件以后
再也格式化不了。所以先跑它，别等最后才发现。

正确写法是用 JSX 风格注释：`{/* 说明 */}`

**不要跳过 build** —— 它比 `astro check` 多抓一类问题
（比如 satori 不支持 woff2 这种运行时才会暴露的坑）。

---

## 这个项目特有的坑

### Windows + PowerShell

路径里有 `[...slug]` 这种方括号时，PowerShell 会把它们当**通配符**，
导致 `Test-Path` / `Get-ChildItem` 找不到文件。

```powershell
# ❌ 找不到
Test-Path "src\pages\posts\[...slug]\index.astro"

# ✅ 用 -LiteralPath
Test-Path -LiteralPath "src\pages\posts\[...slug]\index.astro"
```

### 沙箱环境会干扰构建

如果在受限沙箱里跑构建，可能报 `require is not defined`。
那是 Vite 内部 spawn 被拦截导致的（它会**静默失败**，然后把 CommonJS 包
当成 ESM 内联执行）。

**这不是代码问题。** 在正常终端里跑就好。

### 路径别名

```text
@/xxx     →  src/xxx
```

`astro.config.ts` 里用的是相对路径 `./src/...`，因为它要被 Node 直接加载。

### `@ts-expect-error` 不要随便用

`tsc` 和 Astro 的语言服务对同一段代码的判断可能不一致。
`@ts-expect-error` 在"没有错误可压制"时会**报错并中断构建**。

需要压制提示时用 `@ts-ignore`，并在注释里说明为什么该压制。

已知例子：`CopyCodeButton.astro` 里的 `document.execCommand` —— 它在
`astro check` 里是 deprecated 提示，但 `tsc` 不认，用 `@ts-expect-error` 会构建失败。

### 数据库层（src/db/）的三条特殊约定

**1. 相对导入必须写全 `.ts` 后缀**

项目其他地方都省略后缀，但 `src/db/` 不行 —— 这一层要在 Astro 之外
单独跑测试（`npm run db:test`），而 Node 直接执行 TS 时不支持省略后缀，
会报 MODULE_NOT_FOUND。

**2. 仓库函数接收 db 参数，不在文件顶部建连接**

```ts
export async function listPublishedPosts(db: Db, limit?: number)
```

这样测试时可以塞一个内存数据库（PGlite）进来，不碰线上数据。

**3. 能用数据库约束表达的规则，就不要只写在代码里**

例子：`posts_published_requires_date` 检查约束保证"已发布必有发布时间"。
放到数据库层之后，查询里就不用写 `nulls last` 之类的兜底逻辑，
而且不管从哪个入口写入都绕不过去。

### 几个踩过的坑

**`Buffer.from(x, "hex")` 对非法输入不报错，静默返回空 Buffer**

这会导致 `timingSafeEqual(空, 空) === true`，也就是**任何密码都能登录**。
十六进制串必须先自己校验格式（见 `src/db/password.ts` 的 `isHex`）。

**`promisify` 处理不了有重载的函数**

`promisify(scrypt)` 报 "Expected 3 arguments, but got 4" ——
scrypt 有多个重载，promisify 只推断出其中一个。手写一层 Promise。

**Drizzle 的错误被包装了一层**

```ts
error.message; // "Failed query: insert into ..."        ← 看不到原因
error.cause.message; // 'duplicate key value violates ...' ← 真正的原因
```

断言约束是否生效时要顺着 `cause` 找，不能只看 `message`。
第一次跑测试时这里表现为"约束没生效"，其实是**断言写错了** ——
改断言之前先打印真实的错误对象结构。

**Drizzle 0.45 的 `desc()` 没有 `nullsLast()` 方法**

那是 gel-core 的 API。需要 NULL 排序时改写 SQL，或者（更好）
用数据库约束消除 NULL 的存在。

### API 层（src/pages/api/）的约定

**1. 相对导入写全 `.ts` 后缀**

和 `src/db/` 一样，这一层要能在 Astro 之外跑测试（`npm run api:test`）。

**2. 每个处理函数自己检查登录，不用 `onBeforeHandle`**

看起来重复，但这是实测后的选择，原因见下面。

**3. 校验写在处理函数内部，不用 `body: t.Object(...)`**

用 Elysia 的 body 声明会让校验发生在处理函数**之前**，后果是：
未登录的人提交一份缺字段的数据，会先收到 422「字段不对」
而不是 401「请先登录」—— 语义不对，还泄露了这个接口需要哪些字段。

现在改用 typebox 的 `Value.Check`（Elysia 内部用的就是它），
在读 body 之后的代码里手动校验，顺序完全可控。

**4. 整个 API 层只有一处类型断言**

`context.ts` 里的 `asContext()`。Elysia 的 handler 参数类型是深度推导的，
我们没声明 schema、db 又是自己 decorate 的，它推不出完整形状。
把断言收在一处之后，其他地方的所有属性访问都受类型检查 ——
拼错 `set.headers` 会立刻报错，而不是运行时才 500。

### Elysia 的几个坑（都实测过）

**`onBeforeHandle` 不适合做鉴权守卫**

它绑定时就把上下文类型固定了，导致注册函数必须精确匹配那个类型，
很容易写出"路由注册不上、所有请求 404"的情况，而且报错信息帮不上忙。

**`ctx.cookie` 在某些调用路径下是 `undefined`**

所以直接读 `request.headers.get("cookie")` 自己解析
（见 `auth.ts` 的 `readCookie`）。几行代码，行为完全可预测。

**`ctx.body` 只有在声明了 `body` schema 时才存在**

删掉声明后 `ctx.body` 就是 `undefined`。所以现在自己读请求体
（见 `validation.ts` 的 `readJsonBody`）。

**插件必须用 `.use()` 组合，不能把 app 当参数传**

```ts
// ❌ 泛型逆变报错 + 实测路由注册不上
export function registerXxxRoutes(app: Elysia<any>) { app.get(...) }

// ✅ 标准插件写法
export function xxxRoutes() { return new Elysia({ name: "xxx" }).get(...) }
// 使用时：new Elysia({ prefix: "/api" }).use(xxxRoutes())
```

**`Elysia<any>` 在参数位置不兼容**

Elysia 的类型在参数位置是逆变的，`Elysia<any>` 接不住
`Elysia<"/api", ...>`。要么用插件写法，要么用它导出的 `AnyElysia`。

### HTTP 头的字符限制

HTTP 头按规范只能包含字节（0~255）。往里面塞中文时，
Node 的 `fetch` 会在**发请求之前**就抛 ByteString 错误：

```
TypeError: Cannot convert argument to a ByteString because the
character at index 8 has a value of 20266 which is greater than 255
```

写测试时注意：Cookie、User-Agent 这类头的值只能用 ASCII。
浏览器也不会发出这种请求，所以这不是被测代码的问题。

### 目录结构

```text
src/pages/            文件路径 = 网址。index.astro → /
  [...slug]/          动态路由
  _components/        下划线开头 = 不会被当成路由
src/content/posts/    文章（Markdown），字段定义在 src/content.config.ts
src/utils/            纯函数
src/i18n/             文案
src/types/config.ts   站点配置的类型定义
```

---

## 写新功能时的推荐顺序

```text
1. 先写 src/utils/ 里的纯函数           ← 最容易测试，逻辑都在这
2. 用 node 直接跑一下验证逻辑对不对      ← node xxx.ts 可以跑 TS
3. 再写 .astro 组件，只负责渲染
4. 接入页面（2 行）
5. 跑四条检查
6. 更新 README 模块表
```

第 2 步很关键：**先把逻辑跑通，再关心样式。**
出问题时你也能立刻分清是"逻辑错"还是"渲染错"。

---

## 给 AI 的额外要求

- 改动前先读文件，不要凭印象改
- 一次只做一件事，做完立刻验证
- 不确定的 API 先去 `node_modules` 里看真实实现，不要猜
- 发现问题先报告，不要顺手改无关的东西
- 用户是初学者：解释用中文，术语第一次出现时用一句话说明

---

## 学习资料的位置

```text
docs/LEARNING-ROADMAP.md  学习路线，每个知识点对应仓库里哪个文件
practice/                 TypeScript 练习册（8 节课，能自动判分）
README.md                 模块清单 + 怎么删
```
