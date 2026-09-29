/**
 * 从 Markdown 原文里提取文章目录（TOC）
 * ============================================================
 * 只做一件事：给我 Markdown 原文，还我一个标题列表。
 * 渲染交给 TableOfContents.astro。
 *
 * 为什么不用 remark-toc 插件：
 *   原来 astro.config.ts 里配了 remarkToc + remarkCollapse，
 *   但 remarkCollapse 的触发条件是英文标题 "Table of contents"，
 *   中文文章永远匹配不上，所以目录一直没生成过。
 *   自己提取更简单、更可控，也不依赖插件的隐藏规则。
 *
 * 想删掉目录功能？删掉这个文件和 TableOfContents.astro 即可。
 * ============================================================
 */
import GithubSlugger from "github-slugger";

export type TocHeading = {
  /** 标题层级：2 表示 ##，3 表示 ### */
  depth: number;
  /** 标题文字，例如 "为什么选择 Astro" */
  text: string;
  /** 锚点 id，要和页面里 <h2 id="..."> 保持一致 */
  id: string;
};

/**
 * 代码块里经常出现以 # 开头的行（比如 Shell 注释），
 * 必须先把它整段去掉，否则会被误认成标题。
 */
function stripCodeBlocks(markdown: string): string {
  // 围栏代码块 ``` ... ```
  // [\s\S] 表示"包括换行在内的任意字符"，*? 表示"尽量少匹配"
  return markdown.replace(/```[\s\S]*?```/g, "");
}

/**
 * 提取 h2 / h3 标题。
 *
 * 参数：
 *   markdown  文章正文（post.body）
 *   maxDepth  最深提取到几级，默认 3（即 ## 和 ###）
 *
 * 为什么不提取 h1：文章正文里通常只有一个 h1，就是文章标题本身，
 * 放进目录里没有意义。
 */
export function getTableOfContents(
  markdown: string,
  maxDepth = 3
): TocHeading[] {
  const content = stripCodeBlocks(markdown);

  // ^(#{2,6}) 匹配行首的 2~6 个 #，后面必须跟空格
  // (\S.*) 捕获标题文字
  // gm 里的 m 表示"^ 匹配每一行的开头"，g 表示找出所有匹配
  const headingRe = /^(#{2,6})\s+(\S.*)$/gm;

  /**
   * 必须用 github-slugger，不能用项目里的 slugifyStr。
   *
   * 因为 Astro 生成标题 id 时用的就是 github-slugger，
   * 而两者的规则不一样。实测：
   *   "为什么使用 AstroPaper"
   *     Astro 生成的 id     →  为什么使用-astropaper
   *     slugifyStr 算出来的  →  为什么使用-astro-paper   ← 对不上，链接点不动
   *
   * 每次调用都新建一个实例，这样标题重复时（比如两节都叫"总结"）
   * 会自动生成 xxx / xxx-1 / xxx-2，和 Astro 的行为一致。
   */
  const slugger = new GithubSlugger();

  const headings: TocHeading[] = [];

  for (const match of content.matchAll(headingRe)) {
    const depth = match[1].length;

    if (depth > maxDepth) {
      continue;
    }

    const text = match[2].trim();

    headings.push({
      depth,
      text,
      id: slugger.slug(text),
    });
  }

  // 只有一个标题时不显示目录，没有意义
  return headings.length > 1 ? headings : [];
}
