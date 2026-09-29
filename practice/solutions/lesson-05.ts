/**
 * 第 5 课答案
 * ============================================================
 */

import type { Post } from "../data.ts";

/* ------------------------------------------------------------
 * 知识点 1：判别联合
 *
 * 三个分支用 | 连起来，每个分支都有一个共同字段 status，
 * 但 status 的**值**不同。这个字段就是"判别依据"。
 *
 * 为什么这比三个布尔值好？
 *   用布尔值的写法：
 *     { isLoading: boolean; isError: boolean; data?: Post[] }
 *   可以写出 isLoading 和 isError 同时为 true 这种矛盾状态，
 *   编译器拦不住。
 *
 *   用联合类型：三种状态只能选一种，矛盾状态写不出来。
 *   这叫"让非法状态无法表示"。
 *
 * 注意 loading 分支只有一个字段，后面不要加逗号以外的多余内容。
 * ---------------------------------------------------------- */
export type Result =
  | { status: "loading" }
  | { status: "ok"; posts: Post[] }
  | { status: "error"; message: string };

/* ------------------------------------------------------------
 * 知识点 2：switch 里的自动收窄
 *
 * 进入 case "ok" 之后，TS 已经知道 result 一定是
 * `{ status: "ok"; posts: Post[] }`，
 * 所以 result.posts 可以直接用。
 *
 * 如果你在 case "ok" 里写 result.message，
 * TS 会报错："类型上没有 message 属性" —— 这就是收窄的价值。
 *
 * 最后的 default 分支永远不会被执行，但保留它可以保证
 * 以后新增状态时这里会提醒你补上处理逻辑。
 * ---------------------------------------------------------- */
export function describe(result: Result): string {
  switch (result.status) {
    case "loading":
      return "加载中…";
    case "ok":
      return `共 ${result.posts.length} 篇文章`;
    case "error":
      return `出错了：${result.message}`;
  }
}

/* ------------------------------------------------------------
 * 知识点 3：用 if 收窄
 *
 * if (result.status === "ok") 之后，块内 result.posts 就存在了。
 * 反过来写（先返回 error 的情况）也可以，看哪种更好读。
 * ---------------------------------------------------------- */
export function getPostsOrEmpty(result: Result): Post[] {
  if (result.status === "ok") {
    return result.posts;
  }

  return [];
}
