/**
 * 认证路由：登录 / 登出 / 查询当前用户
 * ============================================================
 * 三条规则贯穿这个文件：
 *
 * 1. **失败信息不区分原因**
 *    "用户名不存在"和"密码错误"都返回同一句话。
 *    否则攻击者能靠错误信息枚举出哪些用户名是有效的。
 *
 * 2. **成功和失败的耗时也要接近**
 *    users 仓库里对不存在的用户也会走一遍密码校验，
 *    避免通过响应快慢判断用户名是否存在。
 *
 * 3. **Cookie 一律 HttpOnly + SameSite**
 *    即使页面有 XSS 漏洞，脚本也读不到登录凭证。
 *
 * 【为什么直接读写 Cookie 头，而不用 ctx.cookie】
 * 实测 Elysia 在部分调用路径下 ctx.cookie 会是 undefined，
 * 排查成本很高。而解析 Cookie 头只有几行代码，行为完全可预测。
 * 这里选可预测。
 *
 * 【为什么分成 authRoutes() / postRoutes() 两个插件】
 * Elysia 的标准组合方式是"每个模块返回一个实例，最后 .use() 拼起来"。
 * 用 app 当参数传进去会因为泛型逆变报类型错误。
 * ============================================================
 */
import { Elysia } from "elysia";

import { authenticate } from "../../../db/repositories/users.ts";
import {
  clearFailures,
  getLockRemainingSeconds,
  LOGIN_LOCK_MINUTES,
  LOGIN_MAX_FAILURES,
  recordFailure,
} from "../../../lib/rate-limit.ts";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "../../../lib/session.ts";

import { asContext, type ApiContext } from "./context.ts";
import { loginSchema, readJsonBody, validate } from "./validation.ts";

/**
 * 从 Cookie 请求头里取出某个 Cookie 的值。
 *
 * 请求头格式形如 "a=1; session=xxx.yyy; b=2"，
 * 所以按 ";" 切开、再按**第一个** "=" 分成名字和值。
 * 用 indexOf 而不是 split("=")，因为值本身可能包含 "="。
 */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");

  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");

    if (eq === -1) {
      continue;
    }

    if (trimmed.slice(0, eq) === name) {
      return trimmed.slice(eq + 1);
    }
  }

  return undefined;
}

/**
 * 判断当前请求是不是走的 https。
 *
 * 【为什么不用 NODE_ENV === "production"】
 * 实测不可靠：本地开发时它是 undefined，而 Netlify Functions
 * 运行时也**不保证**把它设成 "production"。
 * 靠它决定 Cookie 的 Secure 属性会出两种坏情况：
 *   线上忘了加 Secure（少一层防护）
 *   本地因为是 http 却带了 Secure，浏览器直接丢掉 Cookie —— 登录永远失败
 *
 * 直接从请求的 URL 判断，不依赖任何环境约定：谁在访问、什么协议，
 * 请求自己最清楚。
 */
function isSecureRequest(request: Request): boolean {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    // URL 解析不出来时保守处理：不加 Secure。
    // 宁可在 https 下少一层防护，也不要让本地开发完全登不上。
    return false;
  }
}

/** 构造设置 Cookie 的响应头 */
function buildSetCookie(
  request: Request,
  value: string,
  maxAgeSeconds: number
): string {
  const attributes = [
    `${SESSION_COOKIE}=${value}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    // HttpOnly：浏览器 JS 读不到，挡住 XSS 偷凭证
    "HttpOnly",
    // SameSite=Lax：跨站跳转不带 Cookie，挡住基础 CSRF
    "SameSite=Lax",
  ];

  if (isSecureRequest(request)) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

/** 构造删除 Cookie 的响应头（值清空 + 立即过期） */
function buildClearCookie(request: Request): string {
  const attributes = [
    `${SESSION_COOKIE}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isSecureRequest(request)) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

/**
 * 从请求里解析出当前登录用户。
 *
 * 任何一步失败都返回 null，不抛异常 ——
 * "没登录"是正常状态，不是错误。
 */
export async function resolveCurrentUser(
  ctx: ApiContext
): Promise<{ id: number; username: string } | null> {
  const token = readCookie(ctx.request, SESSION_COOKIE);

  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  /**
   * 到数据库确认这个用户还存在。
   *
   * 为什么不在签名里直接信任：
   *   如果用户被删掉了，那张旧 Cookie 在 7 天内仍能通过签名校验。
   *   查一次库就杜绝了这种情况。
   */
  const user = await ctx.db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, payload.id),
  });

  return user ? { id: user.id, username: user.username } : null;
}

/** 统一的 401 响应，文章路由也会复用 */
export function unauthorized(): Response {
  return Response.json(
    { error: "请先登录。", code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

/** 认证相关的路由 */
export function authRoutes() {
  return (
    new Elysia({ name: "auth" })
      /** -------------------------------------------------------
       * 登录  POST /api/login
       * ----------------------------------------------------- */
      .post("/login", async rawCtx => {
        const ctx = asContext(rawCtx);
        const { db, request, set } = ctx;

        /**
         * 先读并校验数据格式。
         *
         * 登录接口的校验放在前面是对的 ——
         * 它本身就是鉴权入口，不存在"未登录"一说。
         * 而且先校验能省掉一次无谓的 scrypt 计算。
         *
         * 第二个参数传 ctx.body：Elysia 在运行时可能已经解析过请求体了，
         * 那时 request.bodyUsed 会是 true，必须用它的结果。
         */
        const parsed = await readJsonBody(request, ctx.body);

        if (!parsed.ok) {
          set.status = 400;
          return { error: parsed.error, code: "BAD_REQUEST" };
        }

        const invalid = validate(loginSchema, parsed.data);

        if (invalid) {
          set.status = 422;
          return { error: invalid, code: "BAD_REQUEST" };
        }

        const body = parsed.data as { username: string; password: string };

        /**
         * 限流的 key 用 IP。取不到就退化成 "unknown" ——
         * 所有人共用一个计数，宁可误伤也不能不限流。
         */
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("x-real-ip") ??
          "unknown";

        const lockedSeconds = getLockRemainingSeconds(ip);

        if (lockedSeconds > 0) {
          set.status = 429;

          return {
            error: `尝试次数过多，请 ${Math.ceil(lockedSeconds / 60)} 分钟后再试。`,
            code: "TOO_MANY_ATTEMPTS",
          };
        }

        const user = await authenticate(db, body.username, body.password);

        if (!user) {
          recordFailure(ip);

          set.status = 401;

          return {
            error: "用户名或密码不正确。",
            code: "INVALID_CREDENTIALS",
            lockMinutes: LOGIN_LOCK_MINUTES,
            maxAttempts: LOGIN_MAX_FAILURES,
          };
        }

        clearFailures(ip);

        set.headers["set-cookie"] = buildSetCookie(
          request,
          createSessionToken(user),
          SESSION_MAX_AGE_SECONDS
        );

        return { ok: true, user: { id: user.id, username: user.username } };
      })

      /** -------------------------------------------------------
       * 登出  POST /api/logout
       * ----------------------------------------------------- */
      .post("/logout", rawCtx => {
        const { request, set } = asContext(rawCtx);

        set.headers["set-cookie"] = buildClearCookie(request);

        return { ok: true };
      })

      /** -------------------------------------------------------
       * 当前登录状态  GET /api/me
       * ----------------------------------------------------- */
      .get("/me", async rawCtx => {
        const user = await resolveCurrentUser(asContext(rawCtx));

        return user ? { user } : unauthorized();
      })
  );
}
