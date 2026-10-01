/**
 * 项目的排序
 * ============================================================
 * 和友链、说说那边一样做成纯函数，方便单独测试。
 *
 * 想删掉项目页？
 *   1. 删掉这个文件
 *   2. 删掉 src/pages/projects.astro 和 src/content/projects/
 *   3. 删掉 src/content.config.ts 里的 projects 集合，以及 collections 里的引用
 *   4. 删掉 Header.astro 里的「项目」链接（桌面 + 移动各一处）
 *   5. 删掉 i18n 里的 nav.projects 和 pages.projectsTitle / projectsDesc
 *   6. 删掉 README 的「可选模块」表里那一行
 *
 * 注意：个人主页（profile.astro）里的项目数据是**独立**的，
 * 删这里不影响它。
 * ============================================================
 */
import type { CollectionEntry } from "astro:content";

/** 一个项目 = 内容集合里的一条记录 */
export type Project = CollectionEntry<"projects">;

const DEFAULT_ORDER = 999;

/**
 * 排序规则：
 *   1. 先按 order（小的在前）
 *   2. 相同则按标题（必须有第二排序键，否则顺序不稳定）
 *
 * 【为什么返回的是原始 entry，而不是"整理好的形状"】
 * 这里原来把 entry 映射成 `{ title, summary, html, ... }`，正文取
 * `entry.rendered.html` 交给页面 `set:html`。那是**绕过 Astro** 的写法：
 * `rendered` 只对 .md 存在，.mdx 条目走"延迟渲染"分支，没有这个字段 ——
 * 放一个 .mdx 进去，构建成功、页面能开、详情是空的，毫无提示。
 *
 * 现在这里只做排序，正文在页面里用 Astro 的正路渲染：
 *     const { Content } = await render(entry)   →   <Content />
 * href 的"空字符串当没有"也在页面里一句话判断（原来在这里归一成 null）。
 */
export function getProjects(entries: CollectionEntry<"projects">[]): Project[] {
  /**
   * 先复制再排序：`sort()` 是**原地**修改数组的，
   * 直接排入参会把调用方传进来的数组也改掉。
   */
  return [...entries].sort((a, b) => {
    const orderA = a.data.order ?? DEFAULT_ORDER;
    const orderB = b.data.order ?? DEFAULT_ORDER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.data.title.localeCompare(b.data.title, "zh");
  });
}
