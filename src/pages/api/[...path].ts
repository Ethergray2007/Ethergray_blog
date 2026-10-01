/**
 * API 总入口
 * ============================================================
 * 网址形如 /api/xxx 的请求全部交给这里，再由 Elysia 分派给具体路由。
 * Elysia 的路由表在 src/pages/api/_routes/ 里。
 *
 * 【为什么需要这个文件】
 * Astro 的页面路由是按文件路径来的，不能直接把 Elysia 应用"挂"上去。
 * 所以用一个通配路由 [...path].ts 接住所有 /api/*，
 * 再把 request 转交给 Elysia 处理。
 *
 * 【为什么不预渲染】
 * prerender = false 让这个路由在**每次请求时**执行（服务端渲染）。
 * 其他页面不受影响，仍然是构建时的静态 HTML。
 *
 * 【为什么直接传 request，不传 clone】
 * 早先这里写的是 app.handle(request.clone())，因为怀疑 Astro 会先读掉
 * body。后来实测证明那个怀疑是错的 —— 真正读 body 的是 Elysia 自己：
 * 它看到 content-type 是 JSON 就自动解析，把结果放进 ctx.body。
 *
 * 所以正确的做法不是 clone，而是在处理函数里**用 ctx.body**，
 * 而不是自己去读 request（那才会报 Body has already been read）。
 * 具体见 validation.ts 的 readJsonBody()。
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

/** Astro 要求导出具体的 HTTP 方法。把所有方法都交给同一个 handler */
export const ALL: APIRoute = handler;
