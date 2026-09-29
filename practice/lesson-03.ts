/**
 * 第 3 课：可选属性 + 类型收窄（narrowing）
 * ============================================================
 *
 * 目标：处理"可能不存在"的值。这是 TypeScript 里最实用的一课。
 *
 * 为什么要学这个？
 *   你的 Post 里 featured、modDatetime、author 都带 `?`，
 *   意思是"可能有，也可能没有"。
 *   直接拿来用会报错，必须先判断 —— 这个判断过程就叫"类型收窄"。
 *
 * 对应你项目里的真实代码：
 *   src/components/Datetime.astro 里的 isModified 判断
 *
 * ------------------------------------------------------------
 * 任务：补完 3 个 TODO，然后 npm run learn:check
 * ============================================================
 */

import type { Post } from "./data.ts";

/* ------------------------------------------------------------
 * TODO 1：实现 isFeatured
 *
 * 有 featured 且为 true → 返回 true，否则 false。
 *
 * 陷阱：不能直接写 `return post.featured`，因为它的类型是
 *       `boolean | undefined`，而函数要求返回 `boolean`。
 *
 * 两种写法都可以：
 *   if (post.featured) { return true } return false
 *   或者用 ?? ：post.featured ?? false
 * ---------------------------------------------------------- */
export function isFeatured(post: Post): boolean {
  // 在这里写
  return false;
}

/* ------------------------------------------------------------
 * TODO 2：实现 hasBeenUpdated
 *
 * 判断"这篇文章被改过"。
 *
 * 陷阱：modDatetime 可能是 undefined。
 *       undefined 和 Date 比大小会得到奇怪结果，
 *       所以要先用 if (post.modDatetime) 把它"收窄"成确定的 Date。
 *
 * 另外注意：比较两个日期谁更晚，要转成数字：
 *   a.getTime() > b.getTime()
 * ---------------------------------------------------------- */
export function hasBeenUpdated(post: Post): boolean {
  // 在这里写
  return false;
}

/* ------------------------------------------------------------
 * TODO 3：实现 displayAuthor
 *
 * 有作者就显示作者，没有就显示 "匿名"。
 *
 * 这一题是体会 `??`（空值合并运算符）最好的例子：
 *   post.author ?? "匿名"
 * ---------------------------------------------------------- */
export function displayAuthor(post: Post): string {
  // 在这里写
  return "";
}
