/**
 * 公开文章字段约定
 * ============================================================
 * 文章改为实时读取后，页面与数据库映射仍需共用同一份字段约定。
 * 想删除：先替换 publicPosts 的引用，再删除本文件及 README 登记。
 * ============================================================
 */
import { z } from "zod";
import config from "../../astro-paper.config.ts";

export const postSchema = z.object({
  dbId: z.number(),
  author: z.string().default(config.site.author),
  pubDatetime: z.date(),
  modDatetime: z.date().optional().nullable(),
  title: z.string(),
  featured: z.boolean().optional(),
  draft: z.boolean().optional(),
  tags: z.array(z.string()).default(["others"]),
  ogImage: z.string().optional(),
  description: z.string(),
  canonicalURL: z.string().optional(),
  hideEditPost: z.boolean().optional(),
  timezone: z.string().optional(),
});

export type PublicPostData = z.infer<typeof postSchema>;
