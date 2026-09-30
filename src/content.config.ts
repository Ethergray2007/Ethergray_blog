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
 * 说说 / 碎片
 *
 * 和文章的区别只有一个：**短**。
 *   · 文章要标题、摘要、认真的结构 —— 写一篇要下决心
 *   · 说说就一两句话，随手记
 *
 * 调研过同圈子的 65 个博客，26% 有类似的东西（有的叫「说说」，
 * 有的叫「杂谈」「碎碎念」）。作用是降低记录的门槛：
 * 有些想法不值得写成一篇文章，但不记下来就忘了。
 *
 * 【为什么没有标题字段】
 * 因为它的价值就在于"不用想标题"。正文就是内容本身。
 * 这个限制是有意的 —— 一旦要填标题，人就会开始纠结，
 * 然后就不写了。
 */
const notes = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/notes" }),
  schema: z.object({
    /** 发布时间 */
    date: z.date(),
    /**
     * 可选：给这条说说加个话题。
     * 用数组是为了以后可能做筛选，现在只是显示出来。
     */
    tags: z.array(z.string()).default([]),
  }),
});

/**
 * 项目
 *
 * 和「关于」页面（about.astro）的分工：
 *   · 关于   —— 这个站点本身用了什么
 *   · 项目   —— 我在做的东西
 *
 * 之前这些项目信息硬编码在个人主页（profile.astro）里。
 * 那个页面做得很完整、有自己的筛选和徽章逻辑，所以**没有动它** ——
 * 这边另建一个用集合管理的项目清单，加项目只要新建一个文件。
 *
 * 两处各有侧重：个人主页讲"我是谁"，项目页讲"我做了什么"。
 */
const projects = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/projects",
  }),
  schema: z.object({
    /** 项目名 */
    title: z.string(),
    /** 列表里显示的一句话 */
    summary: z.string(),
    /** 详情里显示的完整说明 */
    description: z.string(),
    /** 当前状态，显示成徽章 */
    status: z.string(),
    /** 用到的技术 */
    tags: z.array(z.string()).default([]),
    /** 排序，小的在前 */
    order: z.number().default(999),
    /** 项目地址。没上线就留空 */
    href: z.string().optional(),
    /** 是否在首页的「精选」里显示 */
    featured: z.boolean().default(false),
  }),
});

/**
 * 【为什么只有 posts / friends / notes / projects 四个集合】
 * AstroPaper 原本还有个 pages 集合（放 src/content/pages/about.md）。
 * 那个文件是模板自带的介绍页，内容全是关于 AstroPaper 的，
 * 而「关于」页面（src/pages/about.astro）的数据是直接写在文件里的、不读它 ——
 * 整条链路都没人用，所以一起删掉了。
 *
 * 以后想用 Markdown 管理「关于」这类页面，再加回来即可。
 */
export const collections = { posts, friends, notes, projects };
