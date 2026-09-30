/**
 * 测试专用：把迁移文件应用到内存数据库
 * ============================================================
 * 为什么需要这个：
 *   PGlite 是一个全新的空数据库，里面什么表都没有。
 *   测试前必须先把 drizzle/ 里的迁移跑一遍，才有和线上一样的表结构。
 *
 * 这个文件放在 src 下（而不是 test 下）是有意的：
 *   它只依赖 node:fs 和 node:path，任何地方都能用，
 *   不影响 Astro 构建（没有页面会 import 它）。
 *
 * 正式环境不需要它：线上用 `npm run db:migrate`（drizzle-kit）来建表。
 * ============================================================
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * drizzle 生成的迁移文件里，多条语句用这个注释分隔。
 * 见 drizzle/0000_*.sql 里的 `--> statement-breakpoint`。
 *
 * PGlite 的 exec() 不能一次执行多条语句，所以要按它切开逐条跑。
 */
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

/** 迁移文件所在目录（相对项目根目录） */
const MIGRATIONS_DIR = "drizzle";

/** 最小可用的数据库接口 —— 只要有 exec 就够，不要求完整的 PGlite 类型 */
export type ExecutableDb = {
  exec: (sql: string) => Promise<unknown>;
};

/**
 * 按文件名顺序，把所有迁移应用到给定的数据库。
 *
 * @returns 应用了几个迁移文件
 */
export async function applyMigrations(
  db: ExecutableDb,
  migrationsDir: string = MIGRATIONS_DIR
): Promise<number> {
  const files = (await readdir(migrationsDir))
    .filter(name => name.endsWith(".sql"))
    // 文件名形如 0000_xxx.sql、0001_yyy.sql，
    // 直接按字符串排序就是正确的时间顺序
    .sort();

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");

    const statements = sql
      .split(STATEMENT_BREAKPOINT)
      .map(part => part.trim())
      .filter(part => part.length > 0);

    for (const statement of statements) {
      await db.exec(statement);
    }
  }

  return files.length;
}
