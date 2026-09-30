/**
 * API 总入口
 * ============================================================
 * 网址形如 /api/xxx 的请求全部交给这里，再由 Elysia 分派给具体路由。
 * Elysia 的路由表在 src/pages/api/_routes/ 里。
 *
 * 【为什么需要这个文件】
 * Astro 的页面路由是按文件路径来的，不能直接把 Elysia 应用"挂"上去。
 * 所以用一个通配路由 [...path].ts 接住所有 /api/*，
 * 再把原始 Request 转交给 Elysia 处理。
 *
 * Elysia 的 handler 接收标准 Request、返回标准 Response，
 * 所以这个转交只需要一行 —— 这也是选它的原因之一。
 *
 * 【为什么不预渲染】
 * prerender = false 让这个路由在**每次请求时**执行（服务端渲染）。
 * 其他页面不受影响，仍然是构建时的静态 HTML。
 * ============================================================
 */
import type { APIRoute } from "astro";

// 显式 `.ts` 相对路径，原因见 src/db/repositories/posts.ts 的说明
import { getDb } from "../../db/index.ts";

import { createApi } from "./_routes/index.ts";

export const prerender = false;

/**
 * 每次请求都会执行。
 *
 * 这里刻意不在模块顶层创建 app：
 *   模块顶层只在实例冷启动时跑一次，而 getDb() 读环境变量、
 *   建连接池，放在顶层会让"配置错了"变成难以定位的启动失败。
 *   放在请求里，错误会规规矩矩地变成一个 500 响应。
 *
 * 代价是每个请求多几次函数调用 —— 相对于一次数据库往返可以忽略。
 */
const handler: APIRoute = ({ request }) => {
  const app = createApi(getDb());

  return app.handle(request);
};

/** Astro 要求导出具体的 HTTP 方法。先把请求交给 handler 统一处理 */
export const ALL: APIRoute = handler;
