/**
 * 数据库表结构（Drizzle schema）
 * ============================================================
 * 这个文件是整个数据库的**唯一真相**：表长什么样、字段什么类型、
 * 迁移文件长什么样，都以这里为准。
 *
 * 改完 schema 之后要生成迁移文件：
 *   npm run db:generate
 * 然后把迁移应用到数据库：
 *   npm run db:migrate
 *
 * 为什么字段设计和 src/content.config.ts 尽力保持一致：
 *   现在文章存在 Markdown 文件里（frontmatter 定义在 content.config.ts）。
 *   以后文章会搬进数据库。两边字段对齐，搬迁时不用做字段映射，
 *   页面上展示的逻辑也不用改。
 * ============================================================
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * 管理员账号
 *
 * 个人博客只有作者一个人用，所以不做角色 / 权限表，
 * 一个 users 表就够了。真需要多作者时再加字段。
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),

    /** 登录名，同时也是显示名 */
    username: varchar("username", { length: 64 }).notNull(),

    /**
     * 密码**哈希**，绝不存明文。
     * 用 Node 内置的 scrypt 生成，格式见 src/db/password.ts。
     * 长度给 255 是为了容纳 `算法$盐$哈希` 这种完整字符串。
     */
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    // 用户名不能重复 —— 否则无法确定登录的是谁
    uniqueIndex("users_username_unique").on(table.username),
  ]
);

/**
 * 文章
 *
 * status 字段用字符串而不是布尔值 `published`：
 *   现在需要区分"草稿"和"已发布"，将来说不定还要"定时发布"、
 *   "已归档"。用字符串扩展时只加一个取值，不用改表结构。
 */
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),

    /**
     * 网址里用的标识，例如 /posts/hello-astro/
     * 必须是唯一的，否则两篇文章会抢同一个地址。
     */
    slug: varchar("slug", { length: 200 }).notNull(),

    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),

    /** 正文，Markdown 原文 */
    body: text("body").notNull().default(""),

    /**
     * 标签用 text[] （Postgres 原生数组）而不是单独开一张表。
     *
     * 取舍说明：
     *   独立 tag 表 + 关联表   更规范，能统计、能重命名，但多两张表和一堆 join
     *   text[] 数组           简单直接，够个人博客用
     * 现在选简单的。将来真需要"按标签统计"这类查询时再迁移。
     */
    tags: text("tags").array().notNull().default([]),

    /** draft（草稿）| published（已发布） */
    status: varchar("status", { length: 20 }).notNull().default("draft"),

    /** 是否首页精选 */
    featured: boolean("featured").notNull().default(false),

    /** 发布时间。草稿阶段可以为空，发布时必须填 */
    publishedAt: timestamp("published_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** 每次保存都更新，用来显示"最后修改于" */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    // slug 唯一：两篇文章不能抢同一个网址
    uniqueIndex("posts_slug_unique").on(table.slug),

    // 列表页永远是"只看已发布的，按发布时间倒序"，
    // 给这两列建个联合索引，文章多了以后查询不会变慢
    index("posts_status_published_at_idx").on(table.status, table.publishedAt),

    /**
     * 已发布的文章必须有发布时间。
     *
     * 为什么把这个规则交给数据库而不是只写在代码里：
     *   "已发布但没有发布时间"是一份**自相矛盾**的数据。
     *   如果不挡在数据库层，排序时它既排不到前面也排不到后面
     *   （NULL 排序行为反直觉），列表会出现难以复现的错乱。
     *
     *   放在数据库层还有个好处：不管是通过后台、脚本还是手工 SQL
     *   写入，都不可能绕过这条规则。
     *
     * 有了这个约束，查询里就不用再写 "nulls last" 之类的东西了 ——
     * 已发布的文章必然有发布时间。
     */
    check(
      "posts_published_requires_date",
      sql`${table.status} <> 'published' OR ${table.publishedAt} IS NOT NULL`
    ),
  ]
);

/** 从表定义推导出的行类型，供仓库函数使用 */
export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PostRow = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

/** 文章状态的可选值 */
export const POST_STATUS = {
  draft: "draft",
  published: "published",
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];
