/**
 * 估算文章阅读时长（分钟）
 * ============================================================
 * 只做一件事：给我 Markdown 原文，还我一个分钟数。
 * 文案和渲染交给 ReadingTime.astro，这样"计算"和"展示"互不干扰。
 *
 * 想删掉阅读时长功能？删掉这个文件和 ReadingTime.astro 即可。
 * ============================================================
 */

/**
 * 阅读速度：中文按「字」算，英文按「词」算。
 *
 * 为什么分两套速度：中文一个字就是一个信息单位，
 * 英文一个单词是三到五个字符。用同一个速度会让中文文章被严重高估。
 * 数值参考一般技术文章的中位数，不需要精确 —— 读者要的是量级。
 */
const CHINESE_CHARS_PER_MINUTE = 300;
const WORDS_PER_MINUTE = 200;

/**
 * 匹配"中日韩统一表意文字"，也就是日常说的汉字。
 * \u4e00-\u9fa5 是常用汉字在 Unicode 里的区间。
 */
const CHINESE_RE = /[\u4e00-\u9fa5]/g;

/** 匹配连续的字母或数字，用来数英文单词。 */
const WORD_RE = /[a-zA-Z0-9]+/g;

/**
 * 把不该算进阅读量的东西去掉。
 *
 * 每一步都在做"减法"，因为读者扫代码块和看图片都不花阅读时间：
 *
 *   1. ```代码块```   代码是跳着看的，不算阅读量
 *   2. `行内代码`      同理
 *   3. ![图片](地址)   看图不花时间
 *   4. [文字](地址)    链接地址不该算，但链接文字要留着
 *
 * 注意顺序：代码块必须最先去掉。
 * 因为代码块里经常出现方括号和反引号，先去掉它才不会误伤后面的规则。
 */
function stripNonProse(markdown: string): string {
  return (
    markdown
      // 1. 围栏代码块：``` 开头到 ``` 结尾，中间的全都不要
      //    [\s\S] 表示"包括换行在内的任意字符"，*? 表示"尽量少匹配"
      .replace(/```[\s\S]*?```/g, "")
      // 2. 行内代码：`这样` 的内容
      .replace(/`[^`]*`/g, "")
      // 3. 图片：![描述](地址) 整个删掉
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // 4. 链接：[文字](地址) → 只保留"文字"
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  );
}

/**
 * 返回估算的阅读分钟数，最少 1 分钟。
 *
 * 用法：
 *   const minutes = getReadingTime(post.body ?? "");
 */
export function getReadingTime(markdown: string): number {
  const prose = stripNonProse(markdown);

  // match 找不到东西时返回 null，所以用 ?? [] 兜一下
  const chineseCount = (prose.match(CHINESE_RE) ?? []).length;
  const wordCount = (prose.match(WORD_RE) ?? []).length;

  // 中英文字数按各自速度换算成分钟后相加
  const minutes =
    chineseCount / CHINESE_CHARS_PER_MINUTE + wordCount / WORDS_PER_MINUTE;

  // 再短的文章也显示"1 分钟"，显示"0 分钟阅读"很奇怪
  return Math.max(1, Math.round(minutes));
}
