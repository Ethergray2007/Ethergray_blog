/**
 * 认证配置（Better Auth）
 * ============================================================
 * 整个登录功能就是下面这一段配置。
 *
 * 【为什么用 Better Auth 而不是自己写】
 * 自己写一套 GitHub OAuth + 会话 Cookie 需要 800 多行安全代码
 * （state 防 CSRF、PKCE、HMAC 签名、防时序攻击……），
 * 每一行写错都可能变成漏洞。这是别人已经写好并持续维护的部分。
 *
 * Astro 官方文档推荐它：
 *   https://docs.astro.build/en/guides/authentication/
 *
 * 【无状态模式：不需要数据库】
 * 这里**没有传 database 选项**，Better Auth 会自动进入无状态模式：
 * 登录状态存在**加密**的 Cookie 里（JWE，不只是签名，是加密），
 * GitHub 身份存在加密的 account Cookie 里。
 * 服务端验证时只解 Cookie，不查数据库 —— 所以连 users 表都不需要。
 *
 * 文档：https://better-auth.com/docs/concepts/session-management#stateless-session-management
 *
 * 【为什么做成惰性初始化 getAuth()，而不是模块顶层立刻创建】
 * 和 src/db/index.ts 的 getDb() 同理：
 *   1. requireAuthSecret() 永远 fail-closed（绝不静默退化到框架默认密钥），
 *      惰性初始化能让不涉及真实登录的测试与构建不受环境变量缺失干扰
 *   2. 真正有请求访问登录或鉴权接口时，缺配置会立刻明确报错
 *
 * 【撤销登录怎么办】
 * 无状态模式的代价是没法"立刻踢掉某个会话"。要作废全部登录，
 * 改一下 session.cookieCache.version 再部署一次即可
 * （见下面被注释掉的那行）。
 * 个人博客没有这个需求，这个代价可以接受。
 *
 * 想删掉登录功能？
 *   1. 删掉这个文件
 *   2. 删掉 src/pages/api/session/、src/pages/api/_routes/auth.ts 和 src/pages/admin/
 *   3. 从 package.json 移除 better-auth
 * ============================================================
 */
import { betterAuth } from "better-auth";

/** Better Auth 源码里内置的公开默认密钥；绝不能允许线上或本地意外退化到它 */
const KNOWN_INSECURE_DEFAULT_SECRET = "better-auth-secret-12345678901234567890";

/** 加密密钥最短字符数（对应 Better Auth 安全要求） */
const MIN_AUTH_SECRET_LENGTH = 32;

/**
 * 读取并强校验会话加密密钥（永远 fail-closed）。
 *
 * 【为什么不交给 Better Auth 自己校验】
 * Better Auth 在非 NODE_ENV=production 时，若没配密钥会静默退化成
 * 源码里公开的默认常量（见 node_modules/better-auth/dist/context/create-context.mjs）。
 * 而部署平台上的 NODE_ENV 是否一定为 "production" 不可盲信；
 * 一旦两个条件叠加，任何人拿到公开常量就能伪造加密 Cookie 进入后台。
 */
export function requireAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() ?? "";

  if (!secret) {
    throw new Error(
      [
        "缺少环境变量 BETTER_AUTH_SECRET，无法初始化登录服务。",
        "生成方法：node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      ].join("\n")
    );
  }

  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET 长度至少需要 ${MIN_AUTH_SECRET_LENGTH} 个字符，当前只有 ${secret.length} 个。`
    );
  }

  if (secret === KNOWN_INSECURE_DEFAULT_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET 不能使用 Better Auth 的公开默认密钥，请重新随机生成。"
    );
  }

  return secret;
}

/**
 * 允许登录的 GitHub 用户 id（数字）。
 *
 * 【为什么用 id 而不是用户名】
 * GitHub 用户名可以改 —— 改了之后这里就对不上，等于把自己锁在门外。
 * id 是注册时定下来的，永远不变。
 *
 * 查自己的 id：访问 https://api.github.com/users/你的用户名
 * 响应里的 "id" 字段就是。
 *
 * 这个检查在下面 databaseHooks.account.{create,update}.before 里执行。
 */
export function readOwnerId(): number {
  const raw = process.env.GITHUB_OWNER_ID;

  if (!raw) {
    throw new Error(
      "缺少环境变量 GITHUB_OWNER_ID。\n" +
        "查询方法：访问 https://api.github.com/users/你的用户名 ，看 id 字段。"
    );
  }

  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`GITHUB_OWNER_ID 必须是一个数字，当前是「${raw}」。`);
  }

  return id;
}

/**
 * 允许的来源（用于回调地址校验）。
 *
 * 线上用 Netlify 自动注入的 URL，本地开发时那个变量不存在，
 * 所以要允许 localhost 的几个端口。
 */
function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");

  return trimmed || "http://localhost:4321";
}

function readBaseURL(): string {
  const envCandidates = [
    process.env.BETTER_AUTH_URL,
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NETLIFY_URL,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const configured = envCandidates[0];

  if (configured) {
    return normalizeOrigin(configured);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "缺少发布站点地址：请在 Netlify 的 Environment variables 里配置 BETTER_AUTH_URL 或 URL。"
    );
  }

  return "http://localhost:4321";
}

function trustedOrigins(): string[] {
  const origins = ["http://localhost:4321", "http://127.0.0.1:4321"];
  const baseURL = readBaseURL();

  origins.push(baseURL);

  if (baseURL.startsWith("https://")) {
    origins.push(baseURL.replace(/^https:/, "http:"));
  }

  if (process.env.URL) {
    origins.push(normalizeOrigin(process.env.URL));
  }

  if (process.env.DEPLOY_PRIME_URL) {
    origins.push(normalizeOrigin(process.env.DEPLOY_PRIME_URL));
  }

  if (process.env.DEPLOY_URL) {
    origins.push(normalizeOrigin(process.env.DEPLOY_URL));
  }

  return [...new Set(origins)];
}

/**
 * 只允许博客主人登录（GitHub 账号白名单校验）。
 *
 * 同时挂在 account.create.before 与 account.update.before：
 *   - 无状态模式下每次登录都会走 create.before
 *   - 即使将来开启 database 持久化，二次登录走 update.before 也不会绕过检查
 *
 * 【关于 fail-closed】
 * 取不到 accountId 时拒绝而不是放行。宁可登不进去，也不能让陌生人进来。
 */
function assertGithubOwner<T>(account: T): { data: T } {
  const record = account as Record<string, unknown> | undefined;

  /**
   * 只校验 GitHub。将来如果加了别的登录方式，
   * 它不该被这道"GitHub 主人"的检查误伤。
   */
  if (record?.providerId !== "github") {
    return { data: account };
  }

  const accountId = String(record.accountId ?? "");
  const expectedOwnerId = String(readOwnerId());

  if (accountId !== expectedOwnerId) {
    throw new Error(
      `这个 GitHub 账号不是本博客的主人（期望 ${expectedOwnerId}，实际 ${accountId}），无权登录。`
    );
  }

  return { data: account };
}

/** 创建 Better Auth 实例（独立导出供测试验证配置缺失场景） */
export function createAuth() {
  return betterAuth({
    /**
     * 加密用的密钥，至少 32 个字符，且由 requireAuthSecret() 强校验。
     * 生成方法：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     */
    secret: requireAuthSecret(),

    /**
     * 服务自身的地址。
     * 本地开发时这个变量不存在，用它自己的默认值（localhost:3000）会出错，
     * 所以显式给一个。线上由 Netlify 的 URL 变量提供。
     */
    baseURL: readBaseURL(),

    /**
     * 换个路径，避开 /api/auth/。
     *
     * 原因：这个前缀下的 /api/session/* 全部由 Better Auth 接管，
     * 而我们的其他接口（/api/posts 等）挂在同一棵路由树上。
     * 分开之后两边互不干扰，看路径就知道是谁在处理。
     */
    basePath: "/api/session",

    trustedOrigins: trustedOrigins(),

    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID ?? "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      },
    },

    session: {
      /** 登录有效期：7 天 */
      expiresIn: 60 * 60 * 24 * 7,

      cookieCache: {
        enabled: true,
        /** 缓存有效期，和登录有效期一致，这样无状态模式才成立 */
        maxAge: 60 * 60 * 24 * 7,

        /**
         * jwe = 加密而不只是签名。
         * 会话内容对浏览器不可读，最稳妥。
         */
        strategy: "jwe",

        /** 快过期时自动续期，不需要查库 */
        refreshCache: true,

        /**
         * 想作废所有已登录的设备时，把这个值改一下再部署。
         * 版本号对不上的旧 Cookie 会全部失效。
         */
        // version: "2",
      },
    },

    /**
     * 只允许博客主人登录。
     *
     * 【为什么钩子挂在 account 上，不是 user 上】
     * GitHub provider 的映射是：
     *   accountSubject: ({ profile }) => profile.id     ← GitHub id 给了 account
     *   user: { name, email, image, emailVerified }     ← user 里【没有】id
     *
     * 也就是说 GitHub 的数字 id 只会成为 account.accountId，
     * 永远不会出现在 user 对象上。所以必须在 account 钩子里判断。
     */
    databaseHooks: {
      account: {
        create: {
          before: async account => assertGithubOwner(account),
        },
        update: {
          before: async account => {
            const record = account as Record<string, unknown> | undefined;
            // 部分更新可能只改 token 字段、不带 providerId；只对带 GitHub 信息的更新复验
            if (record?.providerId === "github") {
              return assertGithubOwner(account);
            }
            return { data: account };
          },
        },
      },
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;

let cachedAuth: AuthInstance | undefined;

/** 取得（或首次创建）Better Auth 实例，复用同函数实例内的配置 */
export function getAuth(): AuthInstance {
  cachedAuth ??= createAuth();

  return cachedAuth;
}
