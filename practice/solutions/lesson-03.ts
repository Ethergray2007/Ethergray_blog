/**
 * 第 3 课答案
 * ============================================================
 */

import type { Post } from "../data.ts";

/* ------------------------------------------------------------
 * 知识点 1：?? 空值合并运算符
 *
 * post.featured 的类型是 boolean | undefined。
 * 函数要求返回 boolean，直接用就会报错。
 *
 * `??` 的意思是：左边是 null 或 undefined 时，用右边的值。
 *
 * 注意 ?? 和 || 的区别（面试常问）：
 *   false ?? true  →  false    （?? 只认 null / undefined）
 *   false || true  →  true     （|| 会把 false、0、"" 也算"空"）
 *
 * 处理布尔值时必须用 ??，用 || 会把本来正确的 false 改掉。
 * ---------------------------------------------------------- */
export function isFeatured(post: Post): boolean {
  return post.featured ?? false;
}

/* ------------------------------------------------------------
 * 知识点 2：类型收窄（narrowing）
 *
 * if (post.modDatetime) 这个判断很关键：
 * 在 if 块内部，TS 会把类型从 `Date | undefined` 收窄成 `Date`，
 * 所以下面才能安全地调用 .getTime()。
 *
 * 如果不用 if 直接写 post.modDatetime.getTime()，
 * TS 会报错："对象可能为 undefined"。这个报错是救命的 ——
 * 它挡住了一次真实的线上崩溃。
 * ---------------------------------------------------------- */
export function hasBeenUpdated(post: Post): boolean {
  if (!post.modDatetime) {
    return false;
  }

  return post.modDatetime.getTime() > post.pubDatetime.getTime();
}

/* ------------------------------------------------------------
 * 知识点 3：给可选值兜底
 *
 * 第三题其实一行就够了：post.author ?? "匿名"
 *
 * 如果作者是空字符串 ""，?? 不会兜底（因为 "" 不是 null/undefined）。
 * 想连空字符串一起兜底就写：post.author || "匿名"
 * 两种写法没有对错，取决于你想要什么行为。
 * ---------------------------------------------------------- */
export function displayAuthor(post: Post): string {
  return post.author ?? "匿名";
}
