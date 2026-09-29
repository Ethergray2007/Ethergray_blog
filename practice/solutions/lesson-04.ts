/**
 * 第 4 课答案
 * ============================================================
 */

import type { Post } from "../data.ts";

/* ------------------------------------------------------------
 * filter：留下符合条件的元素
 *
 * 为什么写 post.draft === true，而不是 !post.draft？
 * 因为 draft 是 `boolean | undefined`。
 * undefined 表示"没写这个字段"，也就是非草稿 —— 两种写法结果一样。
 * 但显式比较更容易读懂，也不会因为以后字段语义变化而意外翻转。
 * ---------------------------------------------------------- */
export function getVisiblePosts(all: Post[]): Post[] {
  return all.filter(post => post.draft !== true);
}

/* ------------------------------------------------------------
 * sort：注意它会**原地修改**数组！
 *
 * [...all] 是先复制一份（展开运算符），
 * 这样排序不会影响调用方传进来的原数组。
 *
 * 这个坑非常经典：如果你直接 all.sort(...)，
 * 外面那个 posts 数组的顺序也会被改掉，然后在别的地方引发莫名其妙的问题。
 *
 * b - a 是"降序"（新的在前），a - b 是"升序"。
 * ---------------------------------------------------------- */
export function sortByNewest(all: Post[]): Post[] {
  return [...all].sort(
    (a, b) => b.pubDatetime.getTime() - a.pubDatetime.getTime()
  );
}

/* ------------------------------------------------------------
 * map：一对一转换，长度不变
 * ---------------------------------------------------------- */
export function getTitles(all: Post[]): string[] {
  return all.map(post => post.title);
}

/* ------------------------------------------------------------
 * flatMap + Set：收集并去重
 *
 * 第 1 步 flatMap 把嵌套数组拍平：
 *   [["Astro","Blog"], ["Astro"]]  →  ["Astro","Blog","Astro"]
 *
 * 第 2 步 new Set(...) 去重（Set 天生不允许重复元素），
 *   再用 [...] 转回数组。
 *
 * 第 3 步 localeCompare 按本地语言规则排序，
 *   对中文来说比 a < b 更符合预期。
 * ---------------------------------------------------------- */
export function collectTags(all: Post[]): string[] {
  return [...new Set(all.flatMap(post => post.tags))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/* ------------------------------------------------------------
 * reduce：把一堆值"压缩"成一个值
 *
 * 参数说明：
 *   acc  累加器，上一轮返回什么，这一轮就是什么
 *   tag  当前元素
 *   {}   初始值
 *
 * `{} as Record<string, number>` 里的 as 叫"类型断言"，
 * 意思是"我知道这个空对象将来会被填成这个形状"。
 * 这里必须写，否则 TS 会把 {} 当成"没有任何属性的对象"。
 *
 * acc[tag] = (acc[tag] ?? 0) + 1 这行的意思是：
 *   取当前计数，如果还没有就当成 0，然后加 1。
 * ---------------------------------------------------------- */
export function countTags(all: Post[]): Record<string, number> {
  return all
    .flatMap(post => post.tags)
    .reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1;
      return acc;
    }, {});
}
