/**
 * API 的统一错误格式
 * ============================================================
 * 为什么要有这个文件：
 *   如果每个路由各写各的错误返回，前端就得猜"这次是什么形状"。
 *   统一成一种格式，前端只写一次处理逻辑。
 *
 * 格式保持简单，只有两个字段：
 *   { error: "给用户看的中文说明", code: "机器判断用的英文标识" }
 *
 * 为什么错误信息用中文：
 *   这个后台只有你一个人用，中文说明比英文枚举值有用得多。
 *   code 保留英文是给代码判断用的（比如 401 时跳转登录页）。
 * ============================================================
 */

/** 机器判断用的错误标识 */
export const API_ERROR = {
  /** 没登录，或登录已过期 */
  unauthorized: "UNAUTHORIZED",
  /** 登录了，但没权限做这件事（本轮还用不到，留给多作者场景） */
  forbidden: "FORBIDDEN",
  /** 请求的数据不合法 */
  badRequest: "BAD_REQUEST",
  /** 找不到资源 */
  notFound: "NOT_FOUND",
  /** 用户名或密码不对 */
  invalidCredentials: "INVALID_CREDENTIALS",
  /** 服务器内部出错 */
  internal: "INTERNAL",
  /** 路由不存在 */
  noRoute: "NO_ROUTE",
} as const;

export type ApiErrorCode = (typeof API_ERROR)[keyof typeof API_ERROR];

/**
 * 构造一个错误响应。
 *
 * 用 Response.json 而不是抛异常，是因为 Elysia 里
 * "直接返回 Response"是表达"这个请求到此为止"最清楚的方式。
 */
export function apiError(
  status: number,
  message: string,
  code: ApiErrorCode
): Response {
  return Response.json({ error: message, code }, { status });
}

/** 常用错误的快捷方法 —— 让路由代码更短更好读 */
export const errors = {
  unauthorized: () => apiError(401, "请先登录。", API_ERROR.unauthorized),

  invalidCredentials: () =>
    apiError(401, "用户名或密码不正确。", API_ERROR.invalidCredentials),

  notFound: (what = "内容") =>
    apiError(404, `找不到该${what}。`, API_ERROR.notFound),

  badRequest: (message: string) => apiError(400, message, API_ERROR.badRequest),

  internal: (message = "服务器出错了，请稍后再试。") =>
    apiError(500, message, API_ERROR.internal),
};
