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
 * 友链
 *
 * 为什么用内容集合（一个友链一个 Markdown 文件）而不是写真数组：
 *   · 加一个友链 = 新建一个文件，不用改代码
 *   · 有 schema 校验，字段写错会在**构建时**报错，
 *     而不是等页面上少了个头像才发现
 *   · 想删就删那个文件
 *
 * 正文（Markdown body）没用上，但保留着 —— 将来想给某个友链写一段介绍时
 * 直接写在文件里即可，不用改任何代码。
 */
const friends = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/friends" }),
  schema: z.object({
    /** 站点名称 */
    title: z.string(),
    /** 一句话简介，显示在名字下面 */
    description: z.string(),
    /** 站点地址 */
    url: z.url(),
    /** 头像图片地址（外链即可，不需要下载到本地） */
    avatar: z.url(),
    /** 排序用。数字小的排前面 */
    order: z.number().default(999),
    /**
     * 是否在页面上显示为「在线」。
     * 这里只是个人工标记，不是真的去探测对方站点 ——
     * 那会让每次访问都去请求几十个外部地址，很慢也很不礼貌。
     */
    online: z.boolean().default(true),
  }),
});

/**
 * 【为什么只有 posts 和 friends 两个集合】
 * AstroPaper 原本还有个 pages 集合（放 src/content/pages/about.md）。
 * 那个文件是模板自带的介绍页，内容全是关于 AstroPaper 的，
 * 而「关于」页面（src/pages/about.astro）的数据是直接写在文件里的、不读它 ——
 * 整条链路都没人用，所以一起删掉了。
 *
 * 以后想用 Markdown 管理「关于」这类页面，再加回来即可。
 */
export const collections = { posts, friends };
