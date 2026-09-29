# 练习册（TypeScript 基础）

一套**能自动判分**的 TypeScript 练习，全部围绕你博客里真实的文章数据结构。

---

## 怎么用

```bash
# 1. 看题目
npm run learn

# 2. 打开第一课，把里面的 TODO 填完
#    practice/lesson-01.ts

# 3. 自动判分
npm run learn:check

# 4. 卡住了？先自己想 15 分钟，再看答案
#    practice/solutions/lesson-01.ts
```

一节课 15~30 分钟。**做完 8 节，你就能读懂 `src/utils/` 里的全部代码。**

---

## 8 节课的清单

| 课 | 知识点 | 学完你能干什么 |
| --- | --- | --- |
| [01](lesson-01.ts) | 基础类型标注 | 给变量、函数参数、返回值贴类型 |
| [02](lesson-02.ts) | 函数返回对象 | 描述"函数返回的东西长什么样" |
| [03](lesson-03.ts) | 可选属性 `?`、类型收窄、`??` | 安全处理"可能不存在"的值 |
| [04](lesson-04.ts) | 数组 `map` / `filter` / `sort` / `reduce` | 筛选、排序、统计文章 |
| [05](lesson-05.ts) | 联合类型、判别联合 | 表达"加载中 / 成功 / 失败"三种状态 |
| [06](lesson-06.ts) | 泛型 `<T>`、`keyof` | 写出一个函数给所有类型用 |
| [07](lesson-07.ts) | `async` / `await` / `Promise` / `try` | 为将来调用后端 API 打基础 |
| [08](lesson-08.ts) | zod 运行时校验 | 看懂 `src/content.config.ts` |

---

## 第一次运行会看到一堆报错，这是正常的

`npm run learn:check` 是拿**我写的标准答案**去跑的，所以它一定能过 ——
它验证的是"这套练习本身没问题"。

但如果你在测试里看到类似这样的错误：

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../practice/lesson-01.ts'
```

……那说明 `lesson-01.ts` 里的某个 `export function` 还没写出来
（文件里导出的东西不存在，Node 就找不到它）。

**这不是你写错了，是题目还没做完。** 把 TODO 补完，报错就消失了。

---

## 每题都对应你项目里的真实代码

| 练习 | 对应你项目里的文件 |
| --- | --- |
| `Post` 类型（[data.ts](data.ts)） | [src/content.config.ts](../src/content.config.ts) |
| 第 3 课 `hasBeenUpdated` | [src/components/Datetime.astro](../src/components/Datetime.astro) 的 `isModified` |
| 第 4 课 `collectTags` | [src/utils/getUniqueTags.ts](../src/utils/getUniqueTags.ts) |
| 第 5 课 `Result` | 以后接 API 时会大量用到 |
| 第 8 课 zod schema | [src/content.config.ts](../src/content.config.ts) 本身 |

---

## 自己检查类型

练习文件里写错类型时，可以用这条命令查：

```bash
npx tsc -p practice/tsconfig.json
```

**为什么这个命令会报错？** 因为它同时检查 `lesson-*.ts` 和 `solutions/`，
而练习文件里有很多空函数（比如 `return []`）跟声明的返回类型对不上。
这正是题目本身要你填的地方 —— 报错就是提示。

想只看答案对不对：

```bash
npx tsc -p practice/tsconfig.json --noEmit 2>&1 | Select-String "solutions"
```

（用 PowerShell 的话加上 `Select-String`；用 Git Bash 就用 `grep solutions`）

---

## 附加工具：让 node 直接跑 src/utils 里的函数

`src/utils/` 里的函数按 Astro 的写法导入依赖，`node` 默认处理不了三种情况：

| 情况 | 例子 | 为什么 node 不行 |
| --- | --- | --- |
| Astro 虚拟模块 | `import type { X } from "astro:content"` | 这个模块磁盘上不存在 |
| 路径别名 | `import config from "@/config"` | node 不认识 `@/` |
| 省略后缀 | `import { slugifyStr } from "./slugify"` | node 要求写全 `.ts` |

[practice/node-ts-hook.mjs](node-ts-hook.mjs) 用一个 node 预加载钩子把这些接住，
于是**不用起 Astro、不用装测试框架**就能验证纯逻辑：

```bash
node --import ./practice/node-ts-hook.mjs 你的脚本.ts
```

这正好配合 [AGENTS.md](../AGENTS.md) 里推荐的开发顺序：
**先用 node 把纯函数跑通，再写组件。**

> 注意：替身（[_virtual-astro-stub.mjs](_virtual-astro-stub.mjs)）只保证"能加载"，
> 不保证行为正确。所以它只能用来验证纯逻辑，
> 不能验证跟站点配置相关的行为。

---

## 做完之后去哪

回到 [学习路线](../docs/LEARNING-ROADMAP.md) 的**第 ③ 段：Astro**，
开始边读你项目里的真实文件、边给博客加功能。
