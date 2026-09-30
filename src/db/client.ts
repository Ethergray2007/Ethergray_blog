/**
 * 数据库连接
 * ============================================================
 * 用 `postgres` 这个驱动（不是 node-postgres/pg），原因：
 *   - 它更轻，而且是纯 JavaScript，Serverless 环境友好
 *   - 内置连接池和重连
 *
 * 为什么用 process.env 而不是 astro:env：
 *   astro:env 是 Astro 的虚拟模块，**只有 Astro 构建时才能解析**。
 *   而我们需要在普通 node 脚本里也能量到数据库（比如跑迁移、写测试）。
 *   用 process.env 两边都能用。
 *
 * 连接串从哪来：
 *   本地开发   放到 .env 文件（已在 .gitignore 里，不会提交）
 *   线上       配到 Netlify 的环境变量里
 * ============================================================
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// 这里写全 `.ts` 后缀，原因见 repositories/posts.ts 的说明
import * as schema from "./schema.ts";

/**
 * 创建数据库连接。
 *
 * 做成函数而不是模块级单例，有两个原因：
 *   1. 测试时可以传一个假的连接串（比如指向 PGlite）
 *   2. Serverless 环境下模块可能被复用，显式创建更好控制生命周期
 *
 * @param url 连接串。不传则读环境变量 DATABASE_URL
 */
export function createDb(url: string = requireDatabaseUrl()) {
  const client = postgres(url, {
    /**
     * Serverless 环境必须限制连接数。
     *
     * 每个函数实例都会被 Netlify 拉起，如果每个都开一堆连接，
     * 数据库很快就到连接上限了。1 个就够 —— 请求是串行处理的。
     */
    max: 1,

    /**
     * 空闲连接保留时间（秒）。设短一点，让 Serverless 实例冷下来时
     * 连接能及时还给数据库。
     */
    idle_timeout: 20,

    /**
     * 连接超时（秒）。不设的话连不上会一直挂着，
     * 表现为页面一直转圈而不是报错。
     */
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
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
