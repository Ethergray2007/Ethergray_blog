/**
 * 友链的读取与排序
 * ============================================================
 * 做成纯函数是为了能单独测试 —— 排序规则出错时页面看起来"只是顺序有点怪"，
 * 很难一眼发现，用测试锁住更省心。
 *
 * 想删掉友链功能？
 *   1. 删掉这个文件
 *   2. 删掉 src/pages/friends.astro 和 src/content/friends/
 *   3. 删掉 src/content.config.ts 里的 friends 集合，以及 collections 里的引用
 *   4. 删掉 Header.astro 里的「友链」链接（桌面 + 移动各一处）
 *   5. 删掉 i18n 里的 nav.friends 和 pages.friendsTitle / friendsDesc
 *   6. 删掉 README 的「可选模块」表里那一行
 * ============================================================
 */
import type { CollectionEntry } from "astro:content";

/** 页面渲染需要的形状 */
export type Friend = {
  /** 站点名称 */
  title: string;
  /** 一句话简介 */
  description: string;
  /** 站点地址 */
  url: string;
  /** 头像地址 */
  avatar: string;
  /** 排序权重。不直接给页面用，排完序就没意义了 */
  order: number;
};

/** order 缺省时的兜底值：排在有明确 order 的后面 */
const DEFAULT_ORDER = 999;

/**
 * 排序并整理成页面要用的形状。
 *
 * 排序规则：
 *   1. 先按 order 升序（手写的优先级）
 *   2. order 相同时按名称排 —— 必须有个第二排序键，
 *      否则两个 order 相同的友链在页面上会每次构建都换位置
 *
 * 实现上注意：把 order 在 map 阶段就取出来，**不要**在排序比较函数里
 * 回头去 entries 里 find —— 那会让每次比较都遍历一遍数组，
 * 从 O(n log n) 变成 O(n² log n)。
 */
export function getFriends(entries: CollectionEntry<"friends">[]): Friend[] {
  return entries
    .map(entry => ({
      title: entry.data.title,
      description: entry.data.description,
      url: entry.data.url,
      avatar: entry.data.avatar,
      order: entry.data.order ?? DEFAULT_ORDER,
    }))
    .sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      /**
       * 用 localeCompare 而不是简单的 > 比较 ——
       * 中文站名按拼音排序才符合直觉，字符串直接比较是按编码点排的，
       * 结果会毫无规律（"阿" 排在 "z" 后面）。
       */
      return a.title.localeCompare(b.title, "zh");
    });
}
