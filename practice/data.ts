/**
 * 全站共用的练习数据 —— 刻意和你博客里的文章结构保持一致。
 *
 * 对应关系：
 *   practice/data.ts  ←→  src/content.config.ts（文章集合的字段定义）
 *   Post              ←→  CollectionEntry<"posts"> 里的 data 部分
 *
 * 所以这里的每个知识点，你在真实代码里都会再遇到一次。
 */

/** 一篇文章的数据形状 */
export type Post = {
  /** 标题 */
  title: string;
  /** 摘要，会显示在首页卡片上 */
  description: string;
  /** 发布时间 */
  pubDatetime: Date;
  /** 修改时间（可能没有） */
  modDatetime?: Date;
  /** 标签 */
  tags: string[];
  /** 是否精选（可能没有，没有就等于 false） */
  featured?: boolean;
  /** 是否草稿（可能没有） */
  draft?: boolean;
  /** 作者，默认取站点配置 */
  author?: string;
};

/** 文章列表，故意包含各种真实情况：精选、草稿、无修改时间、无作者 */
export const posts: Post[] = [
  {
    title: "开始搭建 EtherGray Blog",
    description: "记录这个博客从 AstroPaper 开始搭建的过程。",
    pubDatetime: new Date("2026-09-25T10:00:00+08:00"),
    tags: ["Astro", "Blog", "开发"],
  },
  {
    title: "用 Astro 做静态搜索",
    description: "Pagefind 是怎么把搜索索引塞进静态站点的。",
    pubDatetime: new Date("2026-09-20T09:30:00+08:00"),
    modDatetime: new Date("2026-09-22T14:00:00+08:00"),
    tags: ["Astro", "搜索"],
    featured: true,
  },
  {
    title: "中文排版的一些细节",
    description: "为什么中文标题不该用斜体。",
    pubDatetime: new Date("2025-12-01T20:00:00+08:00"),
    tags: ["排版", "设计"],
    featured: true,
  },
  {
    title: "还没写完的草稿",
    description: "这篇不应该出现在任何列表里。",
    pubDatetime: new Date("2026-09-30T10:00:00+08:00"),
    tags: ["草稿"],
    draft: true,
  },
  {
    title: "2024 年的总结",
    description: "回顾一下这一年学了什么。",
    pubDatetime: new Date("2024-12-31T23:00:00+08:00"),
    tags: ["随笔"],
    author: "Ethergray",
  },
];
