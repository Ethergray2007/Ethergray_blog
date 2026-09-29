import type { CollectionEntry } from "astro:content";

import { countTags, type TagWithCount } from "@/utils/getUniqueTags";

type GroupKey = string | number | symbol;
type GroupFunction<T> = (item: T, index?: number) => GroupKey;

export function getPostsByGroupCondition(
  posts: CollectionEntry<"posts">[],
  groupFunction: GroupFunction<CollectionEntry<"posts">>
) {
  const result: Record<GroupKey, CollectionEntry<"posts">[]> = {};

  for (let i = 0; i < posts.length; i++) {
    const item = posts[i];
    const groupKey = groupFunction(item, i);

    if (!result[groupKey]) {
      result[groupKey] = [];
    }

    result[groupKey].push(item);
  }

  return result;
}

/**
 * 统计某一组文章里最常用的标签。
 *
 * 用在归档页：每年标题下面显示"这一年主要写了什么"。
 * 只看年份分组的话，读者得把每篇文章标题都扫一遍才知道主题分布。
 *
 * 这个函数很薄 —— 真正的统计逻辑在 src/utils/getUniqueTags.ts 的
 * countTags() 里，那边是纯函数，可以用 node 单独验证。
 * 这里只负责"从文章对象里把标签取出来"。
 *
 * @param posts 这一组文章（比如某一年的全部文章）
 * @param limit 最多返回几个标签，默认 5
 */
export function getTopTagsInGroup(
  posts: CollectionEntry<"posts">[],
  limit = 5
): TagWithCount[] {
  return countTags(posts.map(post => post.data.tags)).slice(0, limit);
}
