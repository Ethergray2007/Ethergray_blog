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
 * 【撤销登录怎么办】
 * 无状态模式的代价是没法"立刻踢掉某个会话"。要作废全部登录，
 * 改一下 session.cookieCache.version 再部署一次即可
 * （见下面被注释掉的那行）。
 * 个人博客没有这个需求，这个代价可以接受。
 *
 * 想删掉登录功能？
 *   1. 删掉这个文件
 *   2. 删掉 src/pages/api/_routes/auth.ts 和 src/pages/admin/
 *   3. 从 package.json 移除 better-auth
 * ============================================================
 */
import { betterAuth } from "better-auth";

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
 * 这个检查在 src/pages/api/_routes/auth.ts 里、拿到会话之后执行。
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
function trustedOrigins(): string[] {
  const origins = ["http://localhost:4321", "http://127.0.0.1:4321"];

  if (process.env.URL) {
    origins.push(process.env.URL);
  }

  // Netlify 的预览站地址（每次部署都不同，用通配符匹配）
  if (process.env.DEPLOY_PRIME_URL) {
    origins.push(process.env.DEPLOY_PRIME_URL);
  }

  return origins;
}

export const auth = betterAuth({
  /**
   * 加密用的密钥，至少 32 个字符。
   * 生成方法：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   */
  secret: process.env.BETTER_AUTH_SECRET,

  /**
   * 服务自身的地址。
   * 本地开发时这个变量不存在，用它自己的默认值（localhost:3000）会出错，
   * 所以显式给一个。线上由 Netlify 的 URL 变量提供。
   */
  baseURL:
    process.env.BETTER_AUTH_URL ?? process.env.URL ?? "http://localhost:4321",

  /**
   * 换个路径，避开 /api/auth/。
   *
   * 原因：这个前缀下的 /api/auth/* 全部由 Better Auth 接管，
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
   * 【为什么要有这一步】
   * GitHub 上任何人都能完成 OAuth 授权流程 —— 能拿到 token、能读到
   * 自己的资料，全都是正常行为。不核对身份的话，**任何人都能进你的后台**。
   *
   * 【为什么钩子挂在 account 上，不是 user 上】
   * 我第一版写在 `user.create.before` 里，判断 userId 等于 GITHUB_OWNER_ID，
   * 结果把你自己也拦在门外了。查 Better Auth 的源码才发现原因：
   *
   *   GitHub provider 的映射是：
   *     accountSubject: ({ profile }) => profile.id     ← GitHub id 给了 account
   *     user: { name, email, image, emailVerified }     ← user 里【没有】id
   *
   * 也就是说 GitHub 的数字 id 只会成为 account.accountId，
   * 永远不会出现在 user 对象上。所以必须在 account 钩子里判断。
   *
   * 【关于 fail-closed】
   * 取不到 accountId 时**拒绝**而不是放行。宁可登不进去，
   * 也不能让陌生人进来。这条原则下，误伤自己是可以接受的失败模式。
   */
  databaseHooks: {
    account: {
      create: {
        before: async account => {
          const record = account as Record<string, unknown> | undefined;

          /**
           * 只校验 GitHub。将来如果加了别的登录方式，
           * 它不该被这道"GitHub 主人"的检查误伤。
           */
          if (record?.providerId !== "github") {
            return { data: account };
          }

          const accountId = String(record.accountId ?? "");

          if (accountId !== String(readOwnerId())) {
            throw new Error("这个 GitHub 账号不是本博客的主人，无权登录。");
          }

          return { data: account };
        },
      },
    },
  },
});
