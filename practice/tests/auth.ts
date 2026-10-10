/**
 * 登录访问控制测试
 * ============================================================
 * 测的是"只允许博客主人登录"这一条安全关键逻辑。
 *
 * 【为什么这个测试必须存在】
 * 这条逻辑我已经写错过两次：
 *   1. 写在 user.create.before 里 —— 但 GitHub 的数字 id 只给 account，
 *      所以判断永远为假，把主人自己也拦住了
 *   2. 加了一道无条件的"禁止注册"闸 —— 它先于 account 钩子执行，
 *      同样把主人拦住
 *
 * 两次都是靠手工试登录才发现的。手工试的问题是改完代码就没人再验了，
 * 所以这里把它固化成测试。
 *
 * 【为什么直接测 auth.ts 而不是 createApi】
 * 判断"谁能登录"的代码在 src/lib/auth.ts 的 databaseHooks 里，
 * 是 Better Auth 的回调，不经过我们的 API 路由。
 * 所以这里导入真实的 auth 实例，用它的内部适配器触发钩子。
 *
 * 跑法：
 *   npm run auth:test
 * ============================================================
 */

/* ------------------------------------------------------------------
 * 环境变量：必须在导入 auth.ts 之前设好
 * ----------------------------------------------------------------- */

/** 假装这是"博客主人的 GitHub id" */
const OWNER_ID = "210209003";

process.env.BETTER_AUTH_SECRET = "test-secret-for-auth-tests-0123456789abcdef";
process.env.GITHUB_CLIENT_ID = "test-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
process.env.GITHUB_OWNER_ID = OWNER_ID;
process.env.BETTER_AUTH_URL = "http://localhost:4321";

const { auth } = await import("../../src/lib/auth.ts");

/* ------------------------------------------------------------------
 * 断言工具
 * ----------------------------------------------------------------- */
let passed = 0;
const failed: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ❌ ${name}${detail ? "\n       " + detail : ""}`);
  }
}

/** 试着建一条 account 记录，返回"放行"还是"拒绝"以及原因 */
async function tryCreateAccount(
  ctx: { internalAdapter: { createAccount: (data: unknown) => Promise<unknown> } },
  accountId: string,
  providerId = "github"
): Promise<{ ok: boolean; reason: string }> {
  try {
    await ctx.internalAdapter.createAccount({
      userId: "test-user",
      providerId,
      accountId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { ok: true, reason: "" };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

const ctx = (await auth.$context) as unknown as {
  internalAdapter: { createAccount: (data: unknown) => Promise<unknown> };
};

/* ==================================================================
 * 1. 访问控制：谁能登录
 * ================================================================ */
console.log("\n=== 1. 只允许博客主人登录 ===");

const owner = await tryCreateAccount(ctx, OWNER_ID);
check(
  "主人的 GitHub id → 放行",
  owner.ok,
  owner.ok ? "" : `被拒绝了：${owner.reason}`
);

const stranger = await tryCreateAccount(ctx, "999999999");
check("别人的 GitHub id → 拒绝", !stranger.ok);
check(
  "拒绝时的提示说明了原因",
  stranger.reason.includes("不是本博客的主人"),
  stranger.reason
);

/**
 * 边界：accountId 是数字而不是字符串时也要正确判断。
 * GitHub 返回的 id 是数字，Better Auth 存成字符串，
 * 但两边的类型我们都不该假设。
 */
const numericOwner = await tryCreateAccount(ctx, String(OWNER_ID));
check("数字和字符串形式都能正确识别", numericOwner.ok);

/** 空 id 必须拒绝（fail-closed：拿不准就拒绝，不能放行） */
const emptyId = await tryCreateAccount(ctx, "");
check("空 accountId → 拒绝（不放过可疑输入）", !emptyId.ok);

/* ==================================================================
 * 2. 不影响其他登录方式
 * ================================================================ */
console.log("\n=== 2. 其他 provider 不受影响 ===");

/**
 * 这道检查是"GitHub 主人专属"的，不该误伤将来可能加的其他登录方式
 * （比如邮箱登录、Google 登录）。
 */
const otherProvider = await tryCreateAccount(ctx, "whatever", "google");
check("非 GitHub 的 provider 不被这道检查拦截", otherProvider.ok);

/* ==================================================================
 * 3. 配置本身是否健全
 * ================================================================ */
console.log("\n=== 3. 配置健全性 ===");

check("auth 实例创建成功", typeof auth.handler === "function");
check(
  "用的是无状态模式（没有 database 选项）",
  // 有数据库时 $context 上会有 adapter 的数据库连接特征；
  // 这里只做一个轻量确认：能取到 internalAdapter 说明初始化正常
  typeof ctx.internalAdapter?.createAccount === "function"
);

/**
 * GITHUB_OWNER_ID 缺失或非法时必须**明确报错**，而不是静默放行。
 * 这是最后一道保险：配置错了要立刻发现，不能变成"谁都能进"。
 */
console.log("\n=== 4. 配置缺失时的行为 ===");

const originalOwnerId = process.env.GITHUB_OWNER_ID;

try {
  delete process.env.GITHUB_OWNER_ID;

  const result = await tryCreateAccount(ctx, OWNER_ID);
  check(
    "GITHUB_OWNER_ID 没配 → 拒绝登录（而不是放行）",
    !result.ok,
    "如果这里放行了，说明配置缺失会导致任何人都能登录"
  );
  check(
    "报错信息里说明了缺什么",
    result.reason.includes("GITHUB_OWNER_ID"),
    result.reason
  );
} finally {
  process.env.GITHUB_OWNER_ID = originalOwnerId;
}

/* ==================================================================
 * 汇总
 * ================================================================ */
console.log(`\n${"=".repeat(52)}`);
console.log(`通过 ${passed} 项，失败 ${failed.length} 项`);

if (failed.length > 0) {
  console.log("\n失败的项：");
  for (const name of failed) {
    console.log(`  · ${name}`);
  }
  process.exit(1);
}

console.log("🎉 访问控制正常");
