/**
 * 测试专用：把迁移文件应用到内存数据库
 * ============================================================
 * 【只在测试里用】
 *   PGlite 是全新的空数据库，测试前必须先把 drizzle/ 里的迁移跑一遍，
 *   才有和线上一样的表结构。
 *
 *   ⚠️ 不要用它给真实数据库建表。
 *   它只执行 SQL、**不记账**（drizzle-kit 有一张表记录哪些迁移跑过了）。
 *   用它建完表之后再跑 `npm run db:migrate`，会因为表已存在而报错。
 *   真实数据库一律走 `npm run db:migrate`。
 * ============================================================
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * drizzle 生成的迁移文件里，多条语句用这个注释分隔。
 * 见 drizzle/0000_*.sql 里的 `--> statement-breakpoint`。
 *
 * 必须切开逐条执行：一次发多条语句时，只有部分驱动支持。
 */
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

/** 迁移文件所在目录（相对项目根目录） */
const MIGRATIONS_DIR = "drizzle";

/**
 * 能执行原始 SQL 的对象。
 *
 * 两种数据库的接口不一样，所以两个方法都写成可选：
 *   PGlite        有 exec(sql)
 *   postgres-js   有 unsafe(sql)
 * 由下面的 runStatement 挑一个用。
 */
export type ExecutableDb = {
  exec?: (sql: string) => Promise<unknown>;
  unsafe?: (sql: string) => Promise<unknown>;
};

/** 根据拿到的是哪种客户端，选对应的方法执行 SQL */
async function runStatement(db: ExecutableDb, sql: string): Promise<void> {
  if (typeof db.exec === "function") {
    await db.exec(sql);
    return;
  }

  if (typeof db.unsafe === "function") {
    await db.unsafe(sql);
    return;
  }

  throw new Error(
    "传进来的数据库对象既没有 exec() 也没有 unsafe()，无法执行 SQL。"
  );
}

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
      await runStatement(db, statement);
    }
  }

  return files.length;
}
