/**
 * 第 8 课：真实接轨 —— 校验文章数据（zod）
 * ============================================================
 *
 * 目标：看懂 src/content.config.ts 在干什么，并亲手写一个校验规则。
 *
 * 前面 7 课学的是"类型"：只在写代码时起作用，代码一跑就没了。
 * 但文章是 Markdown 写的，frontmatter 里可能少字段、写错格式。
 * 类型管不了这个 —— 这时候需要**运行时校验**，也就是 zod。
 *
 * 你项目里 src/content.config.ts 就是这么定义的：
 *
 *   schema: z.object({
 *     title: z.string(),
 *     pubDatetime: z.date(),
 *     tags: z.array(z.string()).default(["others"]),
 *     featured: z.boolean().optional(),
 *   })
 *
 * 读法：
 *   z.string()                    必须是字符串
 *   z.date()                      必须是日期
 *   z.array(z.string())           必须是字符串数组
 *   .optional()                   可以没有
 *   .default(["others"])          没有的话自动填这个值
 *
 * 好处：字段写错、格式不对，构建时就会报错，而不是上线后页面空白。
 *
 * ------------------------------------------------------------
 * 任务：补完 2 个 TODO，然后 npm run learn:check
 * ============================================================
 */

// 说明：这里从 "zod" 直接导入，是为了能用 node 单独运行这个练习文件。
// 在 Astro 项目内部（content.config.ts 等）更推荐用 "astro/zod"，
// 它是 Astro 内置并锁定了版本的同一个库。
import { z } from "zod";

/* ------------------------------------------------------------
 * TODO 1：写一个"文章 frontmatter"的校验规则
 *
 * 要求（和 src/content.config.ts 保持一致）：
 *   title         必填，字符串
 *   description   必填，字符串
 *   pubDatetime   必填，日期
 *   tags          必填，字符串数组
 *   featured      可选，布尔值
 *   draft         可选，布尔值
 *
 * 提示：照着上面的读法写，一个字段一行。
 * ---------------------------------------------------------- */
export const postFrontmatterSchema = z.object({
  // 在这里写
});

/* ------------------------------------------------------------
 * TODO 2：实现 parseFrontmatter
 *
 * 作用：校验一份不确定的数据，返回"成功 / 失败"两种结果。
 *
 * 用 zod 的 safeParse（注意是 safe 开头）：
 *
 *   const result = postFrontmatterSchema.safeParse(input);
 *   if (result.success) {
 *     return { ok: true, data: result.data };
 *   }
 *   return { ok: false, error: result.error.issues[0]?.message ?? "数据格式不对" };
 *
 * 解释为什么要用 safeParse 而不是 parse：
 *   parse 校验失败会直接抛异常；
 *   safeParse 返回一个对象，让你自己决定怎么处理 —— 更可控。
 *
 * 注意 result.data 的类型是**自动推导**出来的：
 * 你在 TODO 1 里写了哪些字段，这里就能用哪些字段，
 * 而且 title 自动是 string，featured 自动是 boolean | undefined。
 * 不用再手写一遍类型 —— 这就是 zod 最爽的地方。
 * ---------------------------------------------------------- */
export function parseFrontmatter(
  input: unknown
):
  | { ok: true; data: z.infer<typeof postFrontmatterSchema> }
  | { ok: false; error: string } {
  // 在这里写
  return { ok: false, error: "" };
}
