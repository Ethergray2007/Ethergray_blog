/**
 * XML 转义
 * ============================================================
 * 把文本里的特殊字符换成 XML 实体，避免生成出坏的 XML。
 *
 * 【为什么必须做这件事】
 * 文章标题里出现一个 & 或 < 就会让整个订阅源变成非法 XML，
 * 阅读器直接报错打不开。而且这是"内容里有特殊字符才触发"的问题 ——
 * 平时测试发现不了，真出事时是读者的阅读器先发现。
 *
 * 需要转义的只有 5 个字符（XML 规范 2.4 节）：
 *   &  →  &amp;      必须第一个处理，否则会把后面生成的实体再转一次
 *   <  →  &lt;
 *   >  →  &gt;
 *   "  →  &quot;     出现在属性值里时必须转
 *   '  →  &apos;     同上
 *
 * 想删掉它？
 *   它被 rss.xml.ts 和 atom.xml.ts 使用。两个都不要了才能删。
 * ============================================================
 */

/** 供字符串替换用。& 必须排在最前面 */
const ENTITIES: Array<[RegExp, string]> = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
  [/'/g, "&apos;"],
];

/**
 * 转义 XML 特殊字符。
 *
 * @param value 任意文本。非字符串会被转成字符串
 */
export function escapeXml(value: unknown): string {
  let out = String(value ?? "");

  for (const [pattern, entity] of ENTITIES) {
    out = out.replace(pattern, entity);
  }

  return out;
}
