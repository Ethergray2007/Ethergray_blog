/**
 * 项目的读取与排序
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

/** 页面渲染需要的形状 */
export type Project = {
  id: string;
  title: string;
  summary: string;
  description: string;
  status: string;
  tags: string[];
  /** 没有地址时是 null，页面据此决定要不要渲染链接 */
  href: string | null;
  featured: boolean;
  /** 详情正文（Markdown 已转成 HTML） */
  html: string;
  order: number;
};

const DEFAULT_ORDER = 999;

/**
 * 取一个项目**已经渲染好**的 HTML。
 *
 * ⚠️ 为什么取不到时要抛错，而不是给空字符串兜底。
 *
 * Astro 的 glob loader 对 **.mdx** 条目走的是"延迟渲染"分支，
 * 压根不会往条目上写 `rendered`（见 astro/dist/content/loaders/glob.js）。
 * 而 content.config.ts 里 projects 集合的 glob 是 `{md,mdx}` ——
 * 也就是说：往 src/content/projects/ 里放一个 .mdx，
 * **构建会成功、页面会打开、详情正文是空的**，一句提示都没有。
 * 这种"静默丢内容"比直接报错难查得多，所以宁可让构建当场失败。
 */
function getRenderedHtml(entry: CollectionEntry<"projects">): string {
  const html = entry.rendered?.html;

  if (html === undefined) {
    throw new Error(
      `项目「${entry.id}」拿不到渲染结果：这个集合目前只支持 .md 文件。` +
        `（.mdx 条目没有 entry.rendered，会被静默渲染成空白 —— 所以这里直接报错。）`
    );
  }

  return html;
}

/**
 * 排序并整理成页面要用的形状。
 *
 * 排序规则和友链一致：
 *   1. 先按 order
 *   2. 相同则按标题（必须有第二排序键，否则顺序不稳定）
 */
export function getProjects(entries: CollectionEntry<"projects">[]): Project[] {
  return entries
    .map(entry => ({
      id: entry.id,
      title: entry.data.title,
      summary: entry.data.summary,
      description: entry.data.description,
      status: entry.data.status,
      tags: entry.data.tags ?? [],
      /**
       * 空字符串和 undefined 都归一成 null ——
       * 页面里判断 href 时就不用写两种空值分支了。
       */
      href: entry.data.href?.trim() ? entry.data.href : null,
      featured: entry.data.featured,
      /**
       * ⚠️ 拿不到就抛错，不要 `?? ""` 兜底（原因见下面 getRenderedHtml 的注释）
       */
      html: getRenderedHtml(entry),
      order: entry.data.order ?? DEFAULT_ORDER,
    }))
    .sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.title.localeCompare(b.title, "zh");
    });
}
