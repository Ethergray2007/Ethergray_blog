/**
 * 第 5 课：联合类型 + 判别联合（discriminated union）
 * ============================================================
 *
 * 目标：用一种类型表达"几种不同的情况"。
 *
 * 为什么要学这个？
 *   任何一次数据请求都只有三种结果：加载中 / 成功 / 失败。
 *   用三个布尔值（isLoading, isError, data）很容易写出矛盾状态，
 *   用一个联合类型则是不可能写出矛盾状态的。
 *
 * 对应你项目里的真实代码：
 *   src/utils/getFontPathByWeight.ts 里的
 *   `style?: "normal" | "italic"` 就是最简形式的联合类型。
 *
 * ------------------------------------------------------------
 * 任务：补完 3 个 TODO，然后 npm run learn:check
 * ============================================================
 */

import type { Post } from "./data.ts";

/* ------------------------------------------------------------
 * TODO 1：补完 Result 类型
 *
 * 它要能表示三种情况，共同点是都有一个 status 字段：
 *
 *   { status: "loading" }                        加载中，没别的字段
 *   { status: "ok";      posts: Post[] }         成功，带文章列表
 *   { status: "error";   message: string }       失败，带错误信息
 *
 * 语法提示：三选一用 | 连接，每个分支用大括号。
 *   注意 loading 那个分支只有 status 一个字段。
 * ---------------------------------------------------------- */
export type Result =
  // 在这里写
  never;

/* ------------------------------------------------------------
 * TODO 2：实现 describe
 *
 * 根据 status 返回一句中文描述：
 *   "loading" → "加载中…"
 *   "ok"      → `共 ${posts.length} 篇文章`
 *   "error"   → `出错了：${message}`
 *
 * 重点体会：当你在 switch 里判断 status 之后，
 * TypeScript 会自动知道这个分支里有哪些字段可以用 ——
 * 在 "ok" 分支里能写 result.posts，在 "error" 分支里能写 result.message，
 * 写错分支的字段编辑器会立刻报错。这就是"判别联合"的威力。
 * ---------------------------------------------------------- */
export function describe(result: Result): string {
  // 在这里写
  return "";
}

/* ------------------------------------------------------------
 * TODO 3：实现 getPostsOrEmpty
 *
 * 只有在 status 是 "ok" 的时候才返回文章列表，
 * 其他情况都返回空数组 []
 *
 * 提示：先判断 result.status === "ok"，
 *       在这个 if 里面，TS 就知道 result.posts 一定存在。
 * ---------------------------------------------------------- */
export function getPostsOrEmpty(result: Result): Post[] {
  // 在这里写
  return [];
}
