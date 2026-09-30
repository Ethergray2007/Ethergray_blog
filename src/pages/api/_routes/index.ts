/**
 * API 应用装配
 * ============================================================
 * 把各模块的路由拼成一个 Elysia 应用，并统一处理错误。
 *
 * 【为什么做成 createApi(db, resolveUser) 而不是导出成品 app】
 * 这样测试时可以把内存数据库（PGlite）和"假装已登录"的替身传进来，
 * 不需要真实的数据库和 GitHub 账号。
 *
 * 【组合方式】
 * 每个模块导出一个返回 Elysia 实例的函数，这里用 .use() 拼起来 ——
 * 这是 Elysia 的标准插件写法（也是官方文档推荐的）。
 *
 * ⚠️ 排查笔记：曾经有段时间路由全部返回 404，我一度以为
 *   是 .use() 组合方式的问题，还为此改成了扁平结构。
 *   后来发现真正原因是**探测脚本用了 http://x 这种单字母主机名**，
 *   Elysia 匹配不上路由。换成正常主机名就对了。
 *   所以看到 404 先确认请求的 URL 本身是否正常，别急着改架构。
 *
 * 想删掉整个 API？
 *   1. 删掉 src/pages/api/ 目录
 *   2. 删掉 src/lib/auth.ts 和 src/lib/api-errors.ts
 *   3. 删掉 src/db/ 目录（如果连数据库也不要了）
 * ============================================================
 */
import { Elysia } from "elysia";

import type { Db } from "../../../db/client.ts";
import { API_ERROR } from "../../../lib/api-errors.ts";

import {
  authRoutes,
  resolveUserFromSession,
  type ResolveUser,
} from "./auth.ts";
import { postRoutes } from "./posts.ts";

/**
 * @param db          数据库连接。测试时传内存数据库
 * @param resolveUser 怎么判断当前登录用户。测试时传替身
 */
export function createApi(
  db: Db,
  resolveUser: ResolveUser = resolveUserFromSession
) {
  return (
    new Elysia({ prefix: "/api" })
      /** 把数据库放进上下文，供所有路由使用 */
      .decorate("db", db)

      /** 统一错误处理 */
      .onError(({ code, error, set }) => {
        /**
         * 路由不存在。
         * Elysia 默认把 NOT_FOUND 也当 500，那会让调用方以为服务器挂了。
         */
        if (code === "NOT_FOUND") {
          set.status = 404;
          return { error: "这个接口不存在。", code: API_ERROR.noRoute };
        }

        /** 请求体校验失败：返回 422 并说明哪个字段不对 */
        if (code === "VALIDATION") {
          set.status = 422;
          return {
            error: "提交的数据格式不对。",
            code: API_ERROR.badRequest,
            detail: error.message,
          };
        }

        /**
         * 请求体解析失败（比如提交了不合法的 JSON）。
         *
         * 不单独处理的话，会被下面的兜底分支当成"未知服务器错误"返回 500。
         * 但这是调用方发错了数据，属于"请求有问题"，应该是 4xx。
         *
         * ⚠️ 排查笔记：这里曾经写过一个很自信但**错误**的注释，
         *   说"DELETE 带 content-type 就会走到这里"。
         *   后来发现真正原因是当时我们自己的 readJsonBody() 抢先读掉了
         *   请求体，导致后续出错 —— 和 content-type 无关。
         *   那段代码随 Better Auth 一起删掉之后，带 content-type 的 DELETE
         *   完全正常（有测试锁着这个行为）。
         */
        if (code === "PARSE") {
          set.status = 400;
          return {
            error: "请求体无法解析，请检查提交的内容是否是合法 JSON。",
            code: API_ERROR.badRequest,
          };
        }

        /**
         * 其余都是真出错。
         * 开发时把真实错误抛出来方便调试；线上只回一句人话，
         * 避免把数据库结构、文件路径之类的信息泄露给访问者。
         */
        const isDev = process.env.NODE_ENV !== "production";

        set.status = 500;

        return {
          error: isDev
            ? `服务器错误：${error instanceof Error ? error.message : String(error)}`
            : "服务器出错了，请稍后再试。",
          code: API_ERROR.internal,
        };
      })

      /**
       * 各个模块的路由。
       *
       * 每个模块导出一个返回 Elysia 实例的函数，这里用 .use() 拼起来。
       * 把 resolveUser 传下去，是为了让测试能替换掉登录判断。
       */
      .use(authRoutes(resolveUser))
      .use(postRoutes(resolveUser))
  );
}

export type Api = ReturnType<typeof createApi>;
