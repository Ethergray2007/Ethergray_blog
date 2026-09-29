/**
 * 第 8 课答案
 * ============================================================
 */

import { z } from "zod";

/* ------------------------------------------------------------
 * 知识点 1：用 zod 描述"数据应该长什么样"
 *
 * 和 TypeScript 类型的区别（这是本课最重要的一点）：
 *
 *   TypeScript 类型    只在写代码时存在，编译完就消失
 *   zod schema         是一个真实的对象，运行时会真的去检查
 *
 * 所以来自外部的数据（Markdown frontmatter、接口返回、用户输入）
 * 必须用 zod 这种"运行时校验"，不能只靠类型。
 *
 * 每个字段的读法：
 *   title: z.string()                    必须是字符串，必填
 *   pubDatetime: z.date()                必须是 Date 对象，必填
 *   tags: z.array(z.string())            必须是字符串数组，必填
 *   featured: z.boolean().optional()     布尔值，可以不写
 *
 * 对比你项目里的 src/content.config.ts，写法完全一致，
 * 区别只是那边还多用了 .default(...) 和 image()。
 * ---------------------------------------------------------- */
export const postFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDatetime: z.date(),
  tags: z.array(z.string()),
  featured: z.boolean().optional(),
  draft: z.boolean().optional(),
});

/* ------------------------------------------------------------
 * 知识点 2：safeParse + 类型自动推导
 *
 * z.infer<typeof schema> 会从 schema **算出**对应的 TS 类型。
 * 所以你只写了一遍规则，类型是白送的 ——
 * 而且改 schema 时类型会自动跟着变，永远不会不一致。
 *
 * 为什么用 safeParse 而不是 parse：
 *   parse      失败时抛异常，你得用 try / catch 包起来
 *   safeParse  失败时返回 { success: false, error }，更好控制
 *
 * error.issues 是一个数组，每个元素描述一处错误，
 * 取第一个的 message 就是给人看的中文/英文提示。
 * 用 ?. 是因为理论上它可能为空，不写 TS 会警告"可能为 undefined"。
 *
 * 可以自己试试：把返回值里的 title 删掉再运行
 *   npm run learn:check
 * 会看到失败信息里带着具体原因。
 * ---------------------------------------------------------- */
export function parseFrontmatter(
  input: unknown
):
  | { ok: true; data: z.infer<typeof postFrontmatterSchema> }
  | { ok: false; error: string } {
  const result = postFrontmatterSchema.safeParse(input);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  return {
    ok: false,
    error: result.error.issues[0]?.message ?? "数据格式不对",
  };
}
