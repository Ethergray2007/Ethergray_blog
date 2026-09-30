/**
 * 初始化脚本：建表 + 创建管理员账号
 * ============================================================
 * 用法：
 *   1. 复制 .env.example 成 .env，填好 DATABASE_URL 和 ADMIN_PASSWORD
 *   2. npm run db:setup
 *
 * 它会做三件事：
 *   1. 检查两个必需的环境变量是否都配了（不配就给出明确提示）
 *   2. 应用数据库迁移（建表）
 *   3. 创建一个管理员账号
 *
 * 【为什么用脚本而不是让你手敲 SQL】
 *   密码必须以**哈希**形式存储。手敲 SQL 很容易把明文存进去，
 *   那是不可逆的错误 —— 一旦存了明文，泄露就是全泄露。
 *   脚本走和线上登录完全相同的哈希逻辑，不可能搞错。
 *
 * 【幂等性】
 *   账号已存在时不会重复创建，也不会改密码。
 *   所以这个脚本可以放心重复跑。
 * ============================================================
 */
import { readFile } from "node:fs/promises";

/** 手动读 .env —— 只在开发环境用，不引入 dotenv 依赖 */
async function loadEnvFile(): Promise<void> {
  try {
    const content = await readFile(".env", "utf8");

    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();

      // 跳过空行和注释
      if (line.length === 0 || line.startsWith("#")) {
        continue;
      }

      const eq = line.indexOf("=");

      if (eq === -1) {
        continue;
      }

      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();

      // 去掉可能存在的引号
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // 已经存在的环境变量优先（方便临时覆盖）
      process.env[key] ??= value;
    }
  } catch {
    console.error(
      [
        "",
        "❌ 找不到 .env 文件。",
        "",
        "请先复制模板：",
        "  Copy-Item .env.example .env",
        "",
        "然后用编辑器填好 DATABASE_URL 和 ADMIN_PASSWORD。",
        "",
      ].join("\n")
    );
    process.exit(1);
  }
}

/** 打印一行检查结果 */
function report(label: string, ok: boolean, hint = ""): boolean {
  console.log(`  ${ok ? "✅" : "❌"} ${label}${ok || !hint ? "" : `\n       ${hint}`}`);

  return ok;
}

await loadEnvFile();

console.log("\n=== 1. 检查环境变量 ===");

const hasDatabaseUrl = report(
  "DATABASE_URL 已配置",
  Boolean(process.env.DATABASE_URL),
  "从 Neon 控制台复制连接串，填到 .env 里"
);

const hasSessionSecret = report(
  "SESSION_SECRET 已配置",
  Boolean(process.env.SESSION_SECRET),
  '生成方法：node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
);

const adminUsername = process.env.ADMIN_USERNAME?.trim() || "ethergray";
const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "";

const hasAdminPassword = report(
  `ADMIN_PASSWORD 已配置（用户名：${adminUsername}）`,
  adminPassword.length >= 8,
  "至少 8 位。这是你以后登录后台用的密码，别设得太简单"
);

if (!hasDatabaseUrl || !hasSessionSecret || !hasAdminPassword) {
  console.error("\n请先把上面标 ❌ 的项目补上，然后重新运行 npm run db:setup\n");
  process.exit(1);
}

/**
 * 动态导入 —— 必须在 loadEnvFile 之后。
 * 因为 createDb 会在导入时就读取 DATABASE_URL，
 * 静态 import 会被提升到文件顶部，那时 .env 还没加载。
 */
const { createDb } = await import("../src/db/client.ts");
const { createUser, getUserByUsername } = await import(
  "../src/db/repositories/users.ts"
);

console.log("\n=== 2. 连接数据库 ===");

const db = createDb();

try {
  // 只查一行，确认能连上。连不上会在这里抛出带原因的异常
  await db.execute("select 1");
  console.log("  ✅ 连接成功");
} catch (error) {
  console.error(
    [
      "",
      "❌ 连不上数据库：",
      `   ${error instanceof Error ? error.message : String(error)}`,
      "",
      "常见原因：",
      "  · 连接串复制不完整（结尾的 ?sslmode=require 也要带上）",
      "  · Neon 项目被暂停了（免费层长时间不用会自动暂停，去控制台唤醒）",
      "",
    ].join("\n")
  );
  process.exit(1);
}

console.log("\n=== 3. 建表 ===");

/**
 * 用官方的 drizzle-kit migrate，而不是自己执行 SQL。
 *
 * 区别很重要：drizzle-kit 会在数据库里建一张表，记录哪些迁移跑过了。
 * 自己执行 SQL 就没有这个记录，以后再跑 db:migrate 会因为
 * "表已存在"而报错，而且无法判断数据库结构是否最新。
 */
const { spawnSync } = await import("node:child_process");

const migrate = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  shell: true,
});

if (migrate.status !== 0) {
  console.error(
    [
      "",
      "❌ 建表失败（见上面的输出）。",
      "",
      "如果提示表已存在，说明之前已经建过了 —— 那是正常的，",
      "可以直接继续。否则把上面的报错贴出来排查。",
      "",
    ].join("\n")
  );
  process.exit(1);
}

console.log("\n=== 4. 创建管理员账号 ===");

const existing = await getUserByUsername(db, adminUsername);

if (existing) {
  console.log(`  ℹ️  账号「${adminUsername}」已存在，不重复创建，也不改密码`);
} else {
  const user = await createUser(db, adminUsername, adminPassword);
  console.log(`  ✅ 已创建账号「${user.username}」（id=${user.id}）`);
}

console.log(
  [
    "",
    "=".repeat(52),
    "🎉 初始化完成",
    "",
    "接下来：",
    "  npm run dev",
    "  然后访问 http://localhost:4321/api/me",
    "  应该返回 401（因为还没登录）—— 说明 API 是通的",
    "",
    "⚠️ 登录成功后，可以把 .env 里的 ADMIN_PASSWORD 那行删掉。",
    "   账号已经建好了，不需要再留着明文密码。",
    "",
  ].join("\n")
);

// 显式退出，否则 postgres 驱动的连接池会让进程挂着
process.exit(0);
