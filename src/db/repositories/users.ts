/**
 * 用户仓库（数据访问层）
 * ============================================================
 * 只负责读写 users 表。密码哈希的生成和校验在 src/db/password.ts 里，
 * 这一层只负责"存进去"和"取出来"。
 *
 * 为什么不在这里做密码校验：
 *   那样这个文件的职责就变成两件事（存数据 + 验密码），
 *   而且校验逻辑没法脱离数据库单独测试。
 * ============================================================
 */
import { eq } from "drizzle-orm";

// 这里写全 `.ts` 后缀，原因见 repositories/posts.ts 的说明
import type { Db } from "../client.ts";
import { users, type UserRow } from "../schema.ts";
import { hashPassword, verifyPassword } from "../password.ts";

/**
 * 按用户名查用户。
 *
 * @returns 查不到返回 null
 */
export async function getUserByUsername(
  db: Db,
  username: string
): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * 创建用户。
 *
 * 传入的是**明文密码**，这个函数负责哈希后存储。
 * 这样调用方不可能"不小心把明文存进去"。
 *
 * @throws 用户名已存在时抛出异常（数据库的唯一索引会拦住）
 */
export async function createUser(
  db: Db,
  username: string,
  plainPassword: string
): Promise<UserRow> {
  const passwordHash = await hashPassword(plainPassword);

  const rows = await db
    .insert(users)
    .values({ username, passwordHash })
    .returning();

  return rows[0]!;
}

/**
 * 校验用户名 + 密码。
 *
 * 两个安全细节：
 *   1. 用户不存在时也走一遍密码校验（拿一个假哈希去比），
 *      让"用户不存在"和"密码错误"耗时接近。
 *      否则攻击者能通过响应时间判断出哪些用户名是存在的。
 *   2. 无论哪种失败都返回 null，不告诉调用方具体是哪个原因，
 *      由上层统一返回"用户名或密码错误"。
 *
 * @returns 验证通过返回用户记录；否则返回 null
 */
export async function authenticate(
  db: Db,
  username: string,
  plainPassword: string
): Promise<UserRow | null> {
  const user = await getUserByUsername(db, username);

  if (!user) {
    // 一个格式合法的假哈希，用来消耗和真实校验差不多的时间
    await verifyPassword(
      plainPassword,
      "scrypt$00000000000000000000000000000000$" + "0".repeat(128)
    );
    return null;
  }

  const ok = await verifyPassword(plainPassword, user.passwordHash);

  return ok ? user : null;
}
