/**
 * 说说的排序
 * ============================================================
 * 和友链那边一样，做成纯函数是为了能单独测试 ——
 * 排序错了页面看起来"只是顺序有点怪"，很难发现。
 *
 * 想删掉说说功能？
 *   1. 删掉这个文件
 *   2. 删掉 src/pages/notes.astro 和 src/content/notes/
 *   3. 删掉 src/content.config.ts 里的 notes 集合，以及 collections 里的引用
 *   4. 删掉 Header.astro 里的「说说」链接（桌面 + 移动各一处）
 *   5. 删掉 i18n 里的 nav.notes 和 pages.notesTitle / notesDesc
 *   6. 删掉 README 的「可选模块」表里那一行
 * ============================================================
 */
import type { CollectionEntry } from "astro:content";

/** 一条说说 = 内容集合里的一条记录 */
export type Note = CollectionEntry<"notes">;

/**
 * 按时间倒序排列（最新的在前）。
 *
 * 【为什么返回的是原始 entry，而不是"整理好的形状"】
 * 这里原来把 entry 映射成 `{ id, html, date, tags }`，正文取
 * `entry.rendered.html` 交给页面 `set:html`。那是**绕过 Astro** 的写法：
 * `rendered` 只对 .md 存在，.mdx 条目走的是"延迟渲染"分支，
 * 压根没有这个字段 —— 往 src/content/notes/ 放一个 .mdx，
 * 构建成功、页面能开、正文是空的，一句提示都没有。
 *
 * 现在这里只做排序，正文在页面里用 Astro 的正路渲染：
 *     const { Content } = await render(entry)   →   <Content />
 * 少一层映射，顺带把 .mdx 支持好了，也不需要"拿不到 html 就报错"这种补丁。
 *
 * @param entries 内容集合里的原始数据
 */
export function getNotes(entries: CollectionEntry<"notes">[]): Note[] {
  /**
   * 先复制再排序：`sort()` 是**原地**修改数组的，
   * 直接排入参会把调用方传进来的数组也改掉。
   */
  return [...entries].sort((a, b) => {
    const diff = b.data.date.getTime() - a.data.date.getTime();

    /**
     * 时间完全相同时用 id 兜底，保证顺序稳定。
     * 没有这个兜底，两条同一秒发的说说会每次构建换位置。
     */
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}
