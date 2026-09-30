import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(config.site.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

/**
 * 【为什么只有 posts 一个集合】
 * AstroPaper 原本还有个 pages 集合（放 src/content/pages/about.md）。
 * 那个文件是模板自带的介绍页，内容全是关于 AstroPaper 的，
 * 而「关于」页面（src/pages/about.astro）的数据是直接写在文件里的、不读它 ——
 * 整条链路都没人用，所以一起删掉了。
 *
 * 以后想用 Markdown 管理「关于」这类页面，再加回来即可。
 */
export const collections = { posts };
