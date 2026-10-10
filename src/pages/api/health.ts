/**
 * 健康检查接口 GET /api/health
 * ============================================================
 * 这个接口的存在只有一个目的：**验证站点真的能跑服务端代码**。
 *
 * 它不碰数据库、不碰登录，所以就算以后数据库出问题，
 * 也能用它区分清楚"是服务端挂了"还是"是数据库连不上"。
 *
 * 怎么判断它是不是真的在服务端跑？
 *   看返回的 `timestamp`。多刷新几次，如果时间一直在变，
 *   说明每次请求都真的执行了代码；如果时间固定不变，
 *   那就是构建时生成死的（说明配置没生效）。
 *
 * 想删掉？
 *   删掉这个文件即可，没有别的地方依赖它。
 * ============================================================
 */
import type { APIRoute } from "astro";

/**
 * 这一行就是这个接口的全部魔法。
 *
 * Astro 7 里 `output: "static"` 表示"默认所有页面都预渲染"，
 * 而这一行给当前文件开了例外：不要预渲染，改成每次请求时执行。
 *
 * 删掉这一行，这个接口就会被构建成 dist/api/health 下的一个静态
 * JSON 文件，timestamp 永远停在构建那一刻。
 */
export const prerender = false;

export const GET: APIRoute = () => {
  return Response.json({
    ok: true,
    /** 每次请求都会变，是"服务端真的在跑"的证据 */
    timestamp: new Date().toISOString(),
    /** 当前运行环境：开发时是 dev，线上是 Netlify 的函数环境 */
    mode: import.meta.env.MODE,
    /** 部署上下文，只有部署到 Netlify 之后才有值 */
    deployContext: process.env.CONTEXT ?? "本地开发",
    message: "服务端渲染已启用。",
  });
};
