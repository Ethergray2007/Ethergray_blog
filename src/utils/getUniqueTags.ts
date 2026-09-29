import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import { slugifyStr } from "./slugify";

type Tag = {
  tag: string;
  tagName: string;
};

/**
 * Builds a de-duplicated, sorted tag list from posts.
 *
 * - Drafts and scheduled posts are excluded via `postFilter()`
 * - `tag` is the slug used in URLs; `tagName` is the original label for display
 * - Uniqueness is based on the slug (so differently-cased labels collapse)
 */
export function getUniqueTags(posts: CollectionEntry<"posts">[]) {
  const tags: Tag[] = posts
    .filter(postFilter)
    .flatMap(post => post.data.tags)
    .map(tag => ({ tag: slugifyStr(tag), tagName: tag }))
    .filter(
      (value, index, self) =>
        self.findIndex(tag => tag.tag === value.tag) === index
    )
    .sort((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));
  return tags;
}

/** 带文章数量的标签 */
export type TagWithCount = Tag & {
  /** 使用这个标签的文章有几篇 */
  count: number;
};

/**
 * 统计一组"标签数组"里每个标签出现了几次，按数量从多到少排序。
 *
 * 为什么参数是 string[][] 而不是完整的文章对象：
 *   它只关心标签，不关心文章的其他字段。
 *   这样这个函数就是**纯粹**的 —— 不依赖 Astro、不依赖配置，
 *   可以直接用 node 跑一遍验证（见 practice/ 里的用法）。
 *   需要过滤草稿这类逻辑，交给调用方在上层做。
 *
 * 为什么用 Map 而不是普通对象：
 *   标签可能叫 "constructor" 这种和对象原型重名的词，
 *   用 {} 会踩到原型链的坑（acc["constructor"] 会拿到一个函数而不是 undefined）。
 *   Map 没有这个问题。
 */
export function countTags(tagGroups: string[][]): TagWithCount[] {
  const counter = new Map<string, TagWithCount>();

  for (const rawTag of tagGroups.flat()) {
    const tag = slugifyStr(rawTag);
    const existing = counter.get(tag);

    if (existing) {
      existing.count += 1;
    } else {
      // 第一次遇到这个标签：以原始写法作为显示名
      counter.set(tag, { tag, tagName: rawTag, count: 1 });
    }
  }

  return [...counter.values()].sort((a, b) => {
    // 文章多的排前面
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    // 数量相同时按字母序，保证每次构建顺序一致
    return a.tag.localeCompare(b.tag);
  });
}

/**
 * 从文章列表拿到"带数量的标签"。
 *
 * 这是给页面用的便捷封装：负责过滤草稿，再把标签交给 countTags 统计。
 */
export function getTagsWithCount(
  posts: CollectionEntry<"posts">[]
): TagWithCount[] {
  return countTags(posts.filter(postFilter).map(post => post.data.tags));
}
