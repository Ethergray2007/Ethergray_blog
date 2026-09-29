/**
 * 第 6 课：泛型（先会用，不急着会写）
 * ============================================================
 *
 * 目标：看懂 <T> 是什么意思，并且能写出简单的泛型函数。
 *
 * 为什么要学这个？
 *   泛型就是"类型版的参数"。你不需要发明它，只要会读会改。
 *   你已经在用了 —— 只是可能没意识到：
 *
 *     const tags: string[] = []          → Array<string>
 *     await getCollection("posts")       → 返回 CollectionEntry<"posts">[]
 *     new Map<string, number>()          → Map<键类型, 值类型>
 *
 * ------------------------------------------------------------
 * 任务：补完 2 个 TODO，然后 npm run learn:check
 * ============================================================
 */

import type { Post } from "./data.ts";

/* ------------------------------------------------------------
 * TODO 1：实现 first
 *
 * 返回数组的第一个元素；空数组返回 undefined。
 *
 * 关键点：<T> 写在函数名后面，然后就能把 T 当类型用。
 *   T[]       表示"一个 T 类型的数组"
 *   T | undefined  表示"可能拿不到"
 *
 * 这样写的好处：
 *   first([1, 2, 3])        返回类型自动是 number | undefined
 *   first(["a", "b"])       返回类型自动是 string | undefined
 *   first(posts)            返回类型自动是 Post | undefined
 *   一个函数，所有类型都能用，而且类型信息不丢。
 * ---------------------------------------------------------- */
export function first<T>(items: T[]): T | undefined {
  // 在这里写
  return undefined;
}

/* ------------------------------------------------------------
 * TODO 2：实现 pluck
 *
 * 从对象数组里"抽"出某个字段，组成新数组。
 *   pluck(posts, "title")  →  ["标题1", "标题2", ...]
 *
 * 关键点：两个泛型参数
 *   T  是数组元素的类型
 *   K  是"要抽取的字段名"的类型，用 keyof T 表示
 *
 * `keyof T` 的意思是"T 身上所有属性名的联合"。
 * 对 Post 来说，keyof Post 就是 "title" | "description" | "tags" | ...
 *
 * 所以写 pluck(posts, "titel") 拼错字会直接报错 —— 不用等运行时。
 *
 * 提示：函数体只需要一行
 *   return items.map(item => item[key]);
 * ---------------------------------------------------------- */
export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  // 在这里写
  return [];
}
