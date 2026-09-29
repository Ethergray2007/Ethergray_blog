/**
 * 第 4 课：数组与 map / filter / sort
 * ============================================================
 *
 * 目标：这三件套是 JavaScript 最常用的操作，也是你项目里出现最多的写法。
 *
 * 为什么要学这个？
 *   你博客的每个列表页，本质都是"一堆文章 → 筛选 → 排序 → 渲染"。
 *   学会这三件套，读 src/utils/getUniqueTags.ts 就没有障碍了。
 *
 * 三个方法的心智模型：
 *   filter  筛掉不要的，数量变少，内容不变
 *   map     把每个元素换个样子，数量不变
 *   sort    调整顺序（注意：它会改动原数组！）
 *
 * ------------------------------------------------------------
 * 任务：补完 5 个 TODO，然后 npm run learn:check
 * ============================================================
 */

import type { Post } from "./data.ts";

/* ------------------------------------------------------------
 * TODO 1：过滤出"能展示的文章"
 *
 * 规则：draft 为 true 的文章不要。
 *
 * 提示：
 *   posts.filter(post => 条件)
 *   判断草稿：post.draft === true
 *   （post.draft 可能是 undefined，所以别直接写 !post.draft，
 *     虽然也能跑，但显式比较更好读）
 * ---------------------------------------------------------- */
export function getVisiblePosts(all: Post[]): Post[] {
  // 在这里写
  return [];
}

/* ------------------------------------------------------------
 * TODO 2：按发布时间从新到旧排序
 *
 * 提示：
 *   [...all].sort((a, b) => ...)
 *
 * 为什么要写 [...all]？因为 sort 会**直接修改原数组**，
 * 复制一份再排，避免影响调用方。这是个很重要的习惯。
 *
 * 从新到旧 = b 减 a：
 *   b.pubDatetime.getTime() - a.pubDatetime.getTime()
 * ---------------------------------------------------------- */
export function sortByNewest(all: Post[]): Post[] {
  // 在这里写
  return [];
}

/* ------------------------------------------------------------
 * TODO 3：取出所有标题
 *
 * 提示：posts.map(post => post.title)
 * ---------------------------------------------------------- */
export function getTitles(all: Post[]): string[] {
  // 在这里写
  return [];
}

/* ------------------------------------------------------------
 * TODO 4：收集所有标签（去重 + 排序）
 *
 * 这是本节课的重点，也是你项目里 src/utils/getUniqueTags.ts 的简化版。
 *
 * 思路（三步）：
 *   1. 用 flatMap 把所有 tags 数组合并成一个大数组
 *        all.flatMap(post => post.tags)
 *   2. 去重：用 Set
 *        [...new Set(标签数组)]
 *   3. 排序
 *        .sort((a, b) => a.localeCompare(b))
 *
 * 补充：flatMap 就是"先 map 再拍平一层"。
 *       如果只用 map，你会得到 [["Astro","Blog"], ["Astro"]] 这种嵌套数组。
 * ---------------------------------------------------------- */
export function collectTags(all: Post[]): string[] {
  // 在这里写
  return [];
}

/* ------------------------------------------------------------
 * TODO 5：统计每个标签出现了几次
 *
 * 返回一个对象，key 是标签名，value 是次数。
 * 例如 { Astro: 2, Blog: 1 }
 *
 * 提示：用 reduce
 *   all.flatMap(p => p.tags).reduce((acc, tag) => {
 *     acc[tag] = (acc[tag] ?? 0) + 1
 *     return acc
 *   }, {} as Record<string, number>)
 *
 * `Record<string, number>` 的意思是：
 * "一个对象，key 是字符串，value 是数字"。
 * ---------------------------------------------------------- */
export function countTags(all: Post[]): Record<string, number> {
  // 在这里写
  return {};
}
