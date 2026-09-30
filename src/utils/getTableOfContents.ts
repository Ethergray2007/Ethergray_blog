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
 *
 * `{3,}` 和 `\1` 是有意的：CommonMark 里围栏长度可以超过三个，
 * 而且结尾必须用**同一种**字符（``` 不能拿 ~~~ 收尾）。
 * 只写 ``` 的话，用 ~~~ 写的代码块整段都不会被去掉。
 */
function stripCodeBlocks(markdown: string): string {
  // [\s\S] 表示"包括换行在内的任意字符"，*? 表示"尽量少匹配"
  return markdown.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "");
}

/**
 * 把标题里的行内 Markdown 还原成"渲染后真正显示的文字"。
 *
 * 【为什么必须做这一步】
 * Astro 生成标题 id 时，用的是**渲染之后**的纯文本 ——
 * 见 @astrojs/markdown-remark 的 rehypeHeadingIds：它遍历元素树，
 * 把所有文字子节点拼起来，再交给 github-slugger。
 * 我们手上只有 Markdown 原文，所以得自己把行内语法拆掉，
 * 否则两边算出来的 id 对不上，目录里那一条点了不动。
 *
 * 实测：`## 参考 [MDN](https://mdn.io)`
 *     Astro 生成的 id     参考-mdn
 *     不处理的 id         参考-mdnhttpsmdnio   ← 把链接里的网址也当成文字了
 *
 * 【哪些是"必须"，哪些只是顺手】
 * 星号、反引号这些字符 github-slugger 本来就会删掉，
 * 所以粗体、行内代码算出来的 id 恰好是对的。真正会错的是
 * **链接和图片** —— 小括号里的网址是货真价实的文字，会被保留下来。
 * 这里统一处理，顺带让目录显示的文字也从 "[MDN](https://mdn.io)" 变回 "MDN"。
 *
 * 【顺序有讲究】
 * 图片必须排在链接前面（图片语法就是链接语法前面多个感叹号），
 * 反了的话 `![alt](url)` 会先被链接规则吃成 `!alt`。
 */
function toPlainText(markdown: string): string {
  /**
   * 先把转义字符"藏起来"。
   *
   * `\*星号\*` 里的星号是**字面量**（CommonMark 规定反斜杠转义不参与强调），
   * 但后面那几条强调规则只看字符、不看反斜杠，会把它们当成斜体吃掉，
   * 于是显示文字变成"星号"、还留下一对没消掉的反斜杠。
   *
   * 藏法是常见的占位符技巧：换成一个不可能出现在标题里的标记，
   * 等强调规则跑完再换回来。顺带也避免了占位符本身被其他规则误伤。
   */
  const escapes: string[] = [];

  const guarded = markdown.replace(
    /\\([\\`*_{}[\]()#+\-.!>])/g,
    (_, char: string) => {
      escapes.push(char);
      return `\u0000${escapes.length - 1}\u0000`;
    }
  );

  const plain = guarded
    /*
     * 图片换成**空串**而不是 alt 文字。
     *
     * 因为 Astro 那边也是这么算的：`![alt](url)` 渲染成没有子节点的 <img>，
     * rehypeHeadingIds 遍历文字子节点时什么也拿不到 ——
     * alt 不会被算进标题文字里。
     * （这条是从 Astro 源码推出来的，不是猜的，所以和"链接取文字"不一样。）
     */
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接 → 链接文字
    .replace(/`([^`]*)`/g, "$1") // 行内代码 → 内容
    .replace(/<\/?[^>]+>/g, "") // 行内 HTML 标签 → 去掉
    .replace(/\*\*(.+?)\*\*/g, "$1") // 粗体
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1") // 斜体（* 版）
    .replace(/~~(.+?)~~/g, "$1") // 删除线
    /*
     * 下划线斜体：CommonMark 里词中间的 _ 不算强调（a_b_c 就是字面量），
     * 所以两边都加了"前面/后面不能是单词字符"的限制。
     * 不加的话，标题写 "foo_bar" 会被拆成 "foobar"，反而对不上 Astro。
     */
    .replace(/(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])/g, "$1")
    .replace(/\s+#+\s*$/, "") // ATX 标题的收尾井号（## 标题 ##）不算文字
    .trim();

  // 把藏起来的转义字符放回来
  return plain.replace(/\u0000(\d+)\u0000/g, (_, index: string) => {
    return escapes[Number(index)] ?? "";
  });
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

  // ^ {0,3} 允许最多三个空格缩进（CommonMark 也允许）
  // (#{2,6}) 匹配 2~6 个 #，后面必须跟空格
  // (\S.*) 捕获标题文字
  // gm 里的 m 表示"^ 匹配每一行的开头"，g 表示找出所有匹配
  const headingRe = /^ {0,3}(#{2,6})\s+(\S.*)$/gm;

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
    const text = toPlainText(match[2]);

    if (text.length === 0) {
      continue;
    }

    /*
     * ⚠️ 先 slug、再判断要不要收进目录，顺序不能反。
     *
     * github-slugger 会给重复标题编号（"总结" → "总结"、"总结-1"），
     * 而 Astro 是对**所有**标题编号的。如果这里"深度超了就直接 continue"，
     * 计数器就少走一次 —— 比如正文里先出现 `#### 总结`、后面才出现 `## 总结`，
     * Astro 给那个 h2 的 id 是 "总结-1"，我们却算成 "总结"，锚点指到 h4 上。
     */
    const id = slugger.slug(text);

    if (depth > maxDepth) {
      continue;
    }

    headings.push({ depth, text, id });
  }

  // 只有一个标题时不显示目录，没有意义
  return headings.length > 1 ? headings : [];
}
