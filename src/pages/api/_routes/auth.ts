/**
 * 认证路由
 * ============================================================
 * 【这个文件现在很薄，是有意的】
 * 登录流程本身（GitHub OAuth、state 防 CSRF、PKCE、会话 Cookie 的
 * 签名与加密）全部交给 Better Auth，挂在 /api/session/* 下
 * （见 src/pages/api/session/[...path].ts）。
 *
 * 这里只保留三件我们自己的事：
 *   1. 把"当前登录用户是谁"做成一个函数（可注入，方便测试）
 *   2. /api/me      给后台一个稳定的"查登录状态"接口
 *   3. /api/logout  一个语义清楚的登出接口
 *
 * 为什么不直接调 Better Auth 的 /api/session/sign-out：
 *   我们的接口名更直白。而且以后想换认证方案时，
 *   前端 src/utils/adminApi.ts 一行都不用改。
 *
 * 【所有权检查在哪里】
 * 在 Better Auth 的配置里（src/lib/auth.ts），不是主人的 GitHub 账号
 * 会被直接拒绝，连登录状态都不会建立。
 * ============================================================
 */
import { Elysia } from "elysia";

import { auth } from "../../../lib/auth.ts";

import { asContext, type ApiContext } from "./context.ts";

/** 登录用户的形状 */
export type CurrentUser = {
  /**
   * 无状态模式下这是 Better Auth 生成的字符串，不是数据库自增数字。
   * 我们只拿它当身份标识，不做算术，所以是 string。
   */
  id: string;
  /** 显示名 */
  username: string;
};

/**
 * 判断请求是否来自已登录的博主。
 *
 * 【为什么做成可传入的参数，而不是直接读全局】
 * 测试时没法走真实的 GitHub OAuth 流程（那要浏览器、要 GitHub 服务器）。
 * 把这个函数作为参数传进去，测试就能换成"永远已登录"或"永远未登录"
 * 的替身，专心测**我们自己的接口逻辑**。
 *
 * 这就是"依赖注入" —— 见 src/pages/api/_routes/index.ts 顶部对 createApi 的说明。
 */
export type ResolveUser = (ctx: ApiContext) => Promise<CurrentUser | null>;

/**
 * 生产环境用的实现：问 Better Auth 当前是谁。
 *
 * 无状态模式下它只解 Cookie、不查数据库，所以这个调用很便宜。
 */
export const resolveUserFromSession: ResolveUser = async ctx => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.name || session.user.email || "管理员",
  };
};

/** 统一的 401 响应，文章路由会复用 */
export function unauthorized(): Response {
  return Response.json(
    { error: "请先登录。", code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

/** 认证相关的路由 */
export function authRoutes(resolveUser: ResolveUser = resolveUserFromSession) {
  return (
    new Elysia({ name: "auth" })
      /** 当前登录状态 */
      .get("/me", async rawCtx => {
        const user = await resolveUser(asContext(rawCtx));

        return user ? { user } : unauthorized();
      })

      /**
       * 登出
       *
       * 转发给 Better Auth 的 sign-out，由它负责清 Cookie。
       * asResponse: true 让我们直接拿到它构造好的 Response（带 Set-Cookie），
       * 原样返回给浏览器即可。
       */
      .post("/logout", async rawCtx => {
        const { request } = asContext(rawCtx);

        return auth.api.signOut({
          headers: request.headers,
          asResponse: true,
        });
      })
  );
}
