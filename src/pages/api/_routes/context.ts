/**
 * API 的类型定义
 * ============================================================
 * Elysia 的类型系统很强大，但也复杂。这个文件把我们需要的那部分
 * 收拢到一处，让路由代码里不再出现 `as unknown as` 这种自我欺骗。
 *
 * 【为什么需要它】
 * Elysia 的 handler 参数类型是深度推导出来的。我们没声明 schema，
 * db 又是自己 decorate 上去的，所以它推不出完整形状 ——
 * 之前的代码里因此到处是
 *
 *     ctx as unknown as ApiContext & { set: {...} }
 *
 * 这种写法等于关掉了类型检查：拼错属性名也不会报错。
 * 现在改成显式声明"我们期望的上下文长什么样"，
 * 拼错 `set.headers` 会立刻被发现。
 * ============================================================
 */
import type { Db } from "../../../db/client.ts";

/** HTTP 处理函数能拿到的东西 */
export type ApiContext = {
  /** 数据库连接，由 index.ts 注入。测试时可换成内存数据库 */
  db: Db;

  /** 原始请求。读 Cookie 头、读请求体都从这里来 */
  request: Request;

  /**
   * 响应的可变部分：
   *   set.status   改状态码
   *   set.headers  直接写响应头，比如 Set-Cookie
   */
  set: {
    status?: number | string;
    headers: Record<string, string>;
  };

  /** 路径参数，例如 /api/posts/:id 里的 id */
  params: Record<string, string | undefined>;

  /**
   * Elysia 自动解析好的请求体。
   *
   * Elysia 发现 `content-type: application/json` 时会**自动解析**
   * 并放在这里，同时把 request.body 标记为已消费（bodyUsed = true）。
   *
   * 所以想拿请求体，优先用它，不要自己去读 request ——
   * 那时 body 已经被读过了，会报：
   *     Body is unusable: Body has already been read
   *
   * 注意：这个行为依赖运行环境。在纯 node 里直接调用 app.handle()
   * 时它可能是 undefined，所以读取逻辑写成了兼容两种情况的
   * readBody()（见 validation.ts）。
   */
  body?: unknown;
};

/**
 * 把 Elysia 自动推导的上下文，转成我们明确声明的形状。
 *
 * Elysia 的 handler 参数类型是深度推导出来的。我们没声明 schema，
 * db 又是自己 decorate 上去的，所以它推不出完整形状。
 *
 * 【整个代码库里只有这一处类型断言】
 * 之后所有属性访问都受类型检查 —— 拼错 `set.headers` 会立刻报错，
 * 而不是等到运行时才 500。
 *
 * 为什么放在这个文件而不是各个路由里：
 *   它是"Elysia 的类型"和"我们的类型"之间的桥，
 *   属于上下文定义的一部分。放这里两边都能用，也不会循环引用。
 */
export function asContext(ctx: unknown): ApiContext {
  return ctx as ApiContext;
}
