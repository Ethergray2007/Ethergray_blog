/**
 * API 应用装配
 * ============================================================
 * 所有路由直接定义在这一个实例上，不用 .use() 组合插件。
 *
 * 【为什么不拆成插件再组合】
 * 我原本把路由拆成 authRoutes / postRoutes 两个 Elysia 插件，再用
 * `.use()` 拼起来。实测那样写路由**注册不上**（所有请求都返回 404），
 * 排查了很久也没定位到确切原因。
 *
 * 与其和框架的组装规则较劲，不如老实用扁平结构：
 * 路由函数仍然写在 _routes/ 里，这里只是把它们"登记"上来。
 * 代价是多了几行，换来的是行为可预测 —— 这比省几行重要得多。
 *
 * 想删掉整个 API？
 *   1. 删掉 src/pages/api/ 目录
 *   2. 删掉 src/lib/session.ts、src/lib/rate-limit.ts、src/lib/api-errors.ts
 *   3. 删掉 src/db/ 目录（如果连数据库也不要了）
 * ============================================================
 */
import { Elysia } from "elysia";

import type { Db } from "../../../db/client.ts";
import { API_ERROR } from "../../../lib/api-errors.ts";

import { authRoutes } from "./auth.ts";
import { postRoutes } from "./posts.ts";

export function createApi(db: Db) {
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
         * 请求体解析失败。
         *
         * 【为什么会有这个分支】
         * Elysia 看到 `content-type: application/json` 就会尝试解析请求体。
         * 但 DELETE 这类请求**通常没有 body** —— 于是它去 JSON.parse("")，
         * 抛出一个 ParseError，消息是含糊的 "Bad Request"。
         *
         * 如果不单独处理，它会被下面的兜底分支当成"未知服务器错误"返回 500，
         * 让人以为是服务器挂了，实际上是调用方发了一个没有 body 的 DELETE。
         *
         * 实测触发方式：DELETE /api/posts/1 且带上 Content-Type: application/json
         */
        if (code === "PARSE") {
          set.status = 400;
          return {
            error:
              "请求体无法解析。如果这个请求本来就不需要 body，请不要设置 Content-Type。",
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
       * 每个模块导出一个返回 Elysia 实例的函数，这里用 .use() 拼起来 ——
       * 这是 Elysia 的标准插件写法。
       *
       * 试过"把 app 当参数传进注册函数（registerXxx(app)）"，
       * 会因为 Elysia 的泛型在参数位置逆变而报类型错误，
       * 而且实测路由注册不上（所有请求都 404）。插件写法两边都正常。
       */
      .use(authRoutes())
      .use(postRoutes())
  );
}

export type Api = ReturnType<typeof createApi>;
