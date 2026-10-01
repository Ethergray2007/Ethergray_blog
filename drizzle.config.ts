/**
 * drizzle-kit 配置（用来生成和应用数据库迁移）
 * ============================================================
 * 两条命令：
 *   npm run db:generate   读 src/db/schema.ts，生成 SQL 迁移文件
 *   npm run db:migrate    把迁移文件应用到数据库
 *
 * 迁移文件放在 drizzle/ 目录，**需要提交到 git** ——
 * 它是数据库结构的变更历史，线上部署时要靠它建表。
 *
 * 这个文件是 .ts 而不是 .ts，因为 drizzle-kit 自己会编译它，
 * 不需要走 Astro 的构建流程。
 * ============================================================
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",

  /** 表结构定义在哪 */
  schema: "./src/db/schema.ts",

  /** 迁移文件生成到哪 */
  out: "./drizzle",

  /**
   * 连哪个数据库。
   *
   * 只在 `db:migrate` / `db:push` 这类需要真的连库的命令里用到；
   * `db:generate` 只读 schema 文件，不需要连接。
   *
   * 所以这里允许为空 —— 本地想生成迁移文件时没必要先配好数据库。
   */
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },

  /** 迁移时打印实际执行的 SQL，方便学习和排查 */
  verbose: true,

  /** 需要确认时直接停下来报错，不要交互式提问（方便写进脚本） */
  strict: true,
});
