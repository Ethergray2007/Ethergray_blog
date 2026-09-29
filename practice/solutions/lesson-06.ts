/**
 * 第 6 课答案
 * ============================================================
 */

import type { Post } from "../data.ts";

/* ------------------------------------------------------------
 * 知识点 1：泛型函数
 *
 * <T> 是"类型参数"，用的时候才确定 T 是什么。
 *
 * 好处对比：
 *   写死版本：function first(items: Post[]): Post | undefined
 *     → 只能处理文章数组，换成数字数组就得再写一个
 *
 *   泛型版本：function first<T>(items: T[]): T | undefined
 *     → 什么数组都能用，而且返回值类型自动跟着变
 *
 * 数组越界会返回 undefined（不会报错），
 * 所以返回类型必须带上 | undefined，调用方才知道要判断。
 * 这个设计叫"把可能的空值写进类型里"。
 * ---------------------------------------------------------- */
export function first<T>(items: T[]): T | undefined {
  return items[0];
}

/* ------------------------------------------------------------
 * 知识点 2：keyof 与索引访问类型
 *
 * 拆开看这个签名：
 *   <T, K extends keyof T>   K 必须是 T 的某个属性名
 *   items: T[]               对象数组
 *   key: K                   要抽取的字段名
 *   : T[K][]                 返回值是"这些字段值"组成的数组
 *
 * `T[K]` 叫索引访问类型，意思是"T 身上 K 这个字段的类型"。
 * 所以 pluck(posts, "title") 返回 string[]，
 * 而 pluck(posts, "tags") 返回 string[][] —— 类型自动算对。
 *
 * 写错字段名会立刻报错：
 *   pluck(posts, "titel")
 *   → 类型 '"titel"' 不满足约束 'keyof Post'
 *
 * 这比运行时才发现"打印出一堆 undefined"好太多了。
 * ---------------------------------------------------------- */
export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(item => item[key]);
}
