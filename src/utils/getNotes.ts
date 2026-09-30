/**
 * 说说的读取与排序
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

/** 页面渲染需要的形状 */
export type Note = {
  /** 用文件名当 id，React 列表和未来做锚点都要用 */
  id: string;
  /** 渲染好的 HTML（Markdown 已经转成 HTML） */
  html: string;
  /** 发布时间 */
  date: Date;
  /** 话题标签 */
  tags: string[];
};

/**
 * 取一条说说**已经渲染好**的 HTML。
 *
 * ⚠️ 为什么取不到时要抛错，而不是给个空字符串兜底。
 *
 * Astro 的 glob loader 对 **.mdx** 条目走的是"延迟渲染"分支，
 * 压根不会往条目上写 `rendered`（见 astro/dist/content/loaders/glob.js）。
 * 而 content.config.ts 里 notes 集合的 glob 是 `{md,mdx}` ——
 * 也就是说：往 src/content/notes/ 里放一个 .mdx，
 * **构建会成功、页面会打开、正文是空的**，一句提示都没有。
 * 这种"静默丢内容"比直接报错难查得多，所以这里宁可让构建当场失败。
 *
 * 真要用 .mdx 写说说，得改成在页面里 `await render(entry)` 拿 <Content />，
 * 而不是读 entry.rendered（这个函数的测试是拿 node 直接跑的，
 * 不能依赖 astro:content 的 render）。
 */
function getRenderedHtml(entry: CollectionEntry<"notes">): string {
  const html = entry.rendered?.html;

  if (html === undefined) {
    throw new Error(
      `说说「${entry.id}」拿不到渲染结果：这个集合目前只支持 .md 文件。` +
        `（.mdx 条目没有 entry.rendered，会被静默渲染成空白 —— 所以这里直接报错。）`
    );
  }

  return html;
}

/**
 * 按时间倒序排列（最新的在前）。
 *
 * @param entries 内容集合里的原始数据
 */
export function getNotes(entries: CollectionEntry<"notes">[]): Note[] {
  return entries
    .map(entry => ({
      id: entry.id,
      /**
       * 说说的正文直接当内容用，不经过布局包装。
       * 这里取的是 Astro 已经渲染好的 HTML。
       */
      html: getRenderedHtml(entry),
      date: entry.data.date,
      tags: entry.data.tags ?? [],
    }))
    .sort((a, b) => {
      const diff = b.date.getTime() - a.date.getTime();

      /**
       * 时间完全相同时用 id 兜底，保证顺序稳定。
       * 没有这个兜底，两条同一秒发的说说会每次构建换位置。
       */
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });
}
