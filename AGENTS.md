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
