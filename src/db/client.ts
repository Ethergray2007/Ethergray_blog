/**
 * 数据库连接
 * ============================================================
 * 用 Neon 的 **HTTP 驱动**（@neondatabase/serverless）。
 *
 * 【为什么是 HTTP 驱动，不是 TCP 的 postgres 包】
 * 官方（Neon 和 Drizzle 文档）对 Serverless 场景都推荐 HTTP 驱动，
 * 理由我们自己实测过（对真实 Neon，各跑 3 轮取中位数）：
 *
 *   冷启动第一次请求    TCP 2621~5107 ms   →   HTTP 687~3613 ms（快 2~4 倍）
 *   按 slug 查单篇      TCP 447~476 ms     →   HTTP 209~237 ms  （快约一半）
 *   列文章              两者基本持平
 *
 * 原理：HTTP 驱动把每条查询发成一个 fetch 请求，
 * 不需要建 TCP 连接、不需要维护连接池 —— 正好适合"一问一答"的后台。
 *
 * 【代价，要知道】
 *   · 它只能连 Neon（连不了本地 Postgres）
 *   · 不支持会话和交互式事务（我们是一问一答，用不到）
 *   测试用的是 PGlite，走另一套适配器，不受影响。
 *
 * 出处：
 *   https://neon.com/docs/serverless/serverless-driver
 *   https://orm.drizzle.team/docs/connect-neon
 *
 * 【为什么用 process.env 而不是 astro:env】
 *   astro:env 是 Astro 的虚拟模块，**只有 Astro 构建时才能解析**。
 *   而我们需要在普通 node 脚本里也能量到数据库（跑迁移、写测试）。
 *   用 process.env 两边都能用。
 *
 * 连接串从哪来：
 *   本地开发   放到 .env 文件（已在 .gitignore 里，不会提交）
 *   线上       配到 Netlify 的环境变量里
 * ============================================================
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// 这里写全 `.ts` 后缀，原因见 repositories/posts.ts 的说明
import * as schema from "./schema.ts";

/**
 * 创建数据库连接。
 *
 * 做成函数而不是模块级单例，原因：
 *   1. 测试和脚本可以显式控制何时创建
 *   2. 配置错了会变成一个正常的错误响应，而不是难以定位的启动失败
 *
 * @param url 连接串。不传则读环境变量 DATABASE_URL
 */
export function createDb(url: string = requireDatabaseUrl()) {
  /**
   * neon() 返回的就是一个查询函数。
   *
   * 不需要配置连接池、超时、重连 —— HTTP 驱动的每条查询都是
   * 独立的 fetch 请求，没有"连接"这个东西需要管理。
   * （对比原来的 TCP 驱动：要设 max / idle_timeout / connect_timeout。）
   */
  return drizzle(neon(url), { schema });
}

/** 连接类型，给仓库函数当参数类型用 */
export type Db = ReturnType<typeof createDb>;

/**
 * 读取连接串，读不到就抛一个说得清楚的错误。
 *
 * 为什么不直接 `process.env.DATABASE_URL!`：
 *   那样拿不到值时错误会在更深的地方冒出来（比如驱动内部报
 *   "connection string is undefined"），很难定位。
 *   这里提前拦下来，并且把"该怎么办"写进错误信息。
 */
export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      [
        "缺少环境变量 DATABASE_URL，无法连接数据库。",
        "",
        "本地开发：在项目根目录创建 .env 文件，写入",
        "  DATABASE_URL=postgresql://...",
        "",
        "线上部署：在 Netlify 后台 Site configuration → Environment variables 里添加，",
        "变量名同样是 DATABASE_URL。",
      ].join("\n")
    );
  }

  return url;
}
