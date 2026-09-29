# 学习路线：TypeScript → Astro

> 原则：**学一个东西，就给博客加一个功能。** 不单独看教程，所有练习都用你博客里真实的数据结构。

---

## 为什么是 TypeScript → Astro，而不是别的

你已经会 HTML / CSS / JS 入门，而且你的博客**本身就是一个 TypeScript 项目**。

先看几个事实（这些都是你现在仓库里的真实代码）：

| 你项目里的文件 | 用到的 TS 知识 |
| --- | --- |
| [src/utils/getUniqueTags.ts](../src/utils/getUniqueTags.ts) | `type` 别名、数组类型、泛型推断 |
| [src/utils/postFilter.ts](../src/utils/postFilter.ts) | 函数参数类型、类型导入 |
| [src/types/config.ts](../src/types/config.ts) | `interface`、可选属性 `?`、交叉类型 `&` |
| [src/content.config.ts](../src/content.config.ts) | 运行时校验（zod）+ 类型自动推导 |
| [src/components/Header.astro](../src/components/Header.astro) | `.astro` 里直接写 TS |
| [src/utils/getFontPathByWeight.ts](../src/utils/getFontPathByWeight.ts) | 联合类型 `"normal" \| "italic"` |

**也就是说：你不是"要开始学 TS"，你是"已经在用 TS，只是还没系统理解"。** 这是最好的起点。

---

## 三段主线（只做这三段）

```text
① JavaScript 补牢（1~2 周）
        ↓
② TypeScript（2~3 周）← 你现在最该投入的地方
        ↓
③ Astro（3~4 周）
```

后面那些（HTTP → Elysia → SQL → PostgreSQL → Drizzle → 登录 → 编辑器 → Netlify）**等这三段打完再动**。

理由很简单：Elysia、Drizzle 全是 TypeScript 写的。TS 不熟就上它们，会变成"照着文档抄但不知道为什么"。

---

## ① JavaScript 补牢

不要重学 HTML/CSS。只补这些，**每个都要能自己写出来**：

```text
解构赋值           const { title, tags } = post
展开运算符         [...posts, newPost]
数组三件套         map / filter / reduce   ← 最重要
对象取值           Object.entries / Object.keys
模块               import / export
Promise            .then / .catch
async / await      ← 最重要
try / catch
fetch + JSON
```

### 判断标准

能独立做出这个，就可以进第二阶段：

```text
待办清单
├── 添加
├── 删除
├── 标记完成
├── 存到 localStorage
└── 从一个 JSON 接口拉数据
```

写得不漂亮没关系，关键是**理解 JS 怎么驱动一个小应用**。

### 和博客的联系

你的 [src/utils/getUniqueTags.ts](../src/utils/getUniqueTags.ts) 第 18~27 行就是一条完整的 `filter → flatMap → map → filter → sort` 链。等你补完 `map/filter`，回头读这段代码会有"啊，原来是这样"的感觉。

---

## ② TypeScript（重点）

### 要学的，按顺序

```text
1. 基础类型标注        string / number / boolean / Date
2. 类型推导            什么时候可以省略不写
3. type 和 interface   区别和选择
4. 可选属性与可选参数   ? 和 undefined
5. 数组与方法类型       string[]、map 的回调类型
6. 联合类型             "a" | "b"，以及 narrowing（类型收窄）
7. 泛型                 先会"用"，不急着会"写"
8. 异步类型             Promise<T>、async 函数的返回类型
9. 真实场景接轨         Astro Content Collections + zod
```

### 现在**不要**碰的

```text
❌ 高级泛型 / 类型体操
❌ Decorator
❌ Declaration Merging
❌ 编译器原理
❌ tsconfig 的每一个选项
```

先用起来。类型体操是给写库的人准备的，不是给用库的人。

### 练习册

我在 [practice/](practice/) 里放了一套**能跑、能自测**的练习，全部围绕你博客的 `Post` 数据结构：

```bash
npm run learn          # 看题目
npm run learn:check    # 自动判分
```

8 节课，一节课一个知识点，做完自动告诉你哪题对哪题错。详见 [practice/README.md](practice/README.md)。

---

## ③ Astro

做完一篇文章从"写 md"到"出现在首页"的完整流程，你就掌握 Astro 了。

### 要学的

```text
.astro 文件结构      --- 前面是服务端 JS，下面是模板
pages/               文件路径 = 网址
动态路由             [slug].astro、[...page].astro
components/          组件 + props
layouts/             页面骨架
Content Collections  文章集合 ← 你项目里已经在用
Markdown / MDX
```

### 你项目里已有的现成教材

```text
src/pages/index.astro                  首页怎么取文章
src/pages/posts/[...slug]/index.astro  单篇文章页（动态路由）
src/layouts/Layout.astro               全站骨架（head、主题脚本）
src/content.config.ts                  文章集合的字段定义 ← 重点读
src/components/Card.astro              组件怎么接收 props
```

### 边学边做的功能清单

```text
□ 读懂 Layout.astro 的每一行
□ 给文章加一个"阅读时长"字段
□ 首页加一个"最新 3 篇"侧栏
□ 做一个 /now 页面
□ 给文章页加目录（TOC）
□ 加一个"上一篇 / 下一篇"
```

每做完一个，你都会明确知道自己学会了什么 —— 因为它们都会让你博客**真的变好**。

---

## 打完这三段之后

```text
HTTP / Fetch
    ↓
ElysiaJS（写 API）
    ↓
SQL + PostgreSQL（先手写 SQL，再上 Drizzle）
    ↓
Drizzle（TypeScript ORM）
    ↓
登录 / 权限（Session + Cookie）
    ↓
Markdown 编辑器
    ↓
Netlify 部署（理解 Build Time vs Runtime）
```

这时候你的目标才真正开始：**不重新 deploy 就能改文章**（因为文章存数据库，不在 Git 里）。

---

## 现在暂时不要碰

```text
React / Vue / Svelte / Next.js / NestJS
Prisma / Redis / Docker / Kubernetes / GraphQL
```

不是因为它们不好，而是因为**同时学多个，最容易变成"每个都知道一点，没有一个真会"**。

你的主线已经够长了：

```text
TypeScript → Astro → HTTP → Elysia → SQL → PostgreSQL → Drizzle → Netlify
```

---

## 怎么开始（今天就能做）

```bash
# 1. 看题目
npm run learn

# 2. 打开第一课，按里面的注释填空
#    practice/lesson-01.ts

# 3. 自动判分
npm run learn:check

# 4. 卡住了看答案（但先自己试 15 分钟）
#    practice/solutions/lesson-01.ts
```

一节课大约 15~30 分钟。做完 8 节，你就具备读 [src/utils/](../src/utils/) 里全部代码的能力了。
