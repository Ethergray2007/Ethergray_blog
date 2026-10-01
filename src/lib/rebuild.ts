/**
 * 通知 Netlify 重新构建站点
 * ============================================================
 * 【为什么需要它】
 *   文章存在数据库里，而页面是**构建时**生成的静态 HTML
 *   （为什么这么选，见 src/db/loaders/posts.ts 的文件头）。
 *   所以在后台保存文章之后，得让 Netlify 重新构建一次，
 *   改动才会出现在读者看得到的页面上 —— 不用你手动 deploy。
 *
 *   没配这个功能也能用，只是改完文章要等下一次推送代码才生效。
 *
 * 【怎么配】
 *   Netlify 后台 → Site configuration → Build & deploy → Build hooks
 *   新建一个，把给出的地址填进环境变量 NETLIFY_BUILD_HOOK_URL
 *   （本地 .env 和 Netlify 的环境变量里都要有）。
 *
 * 【为什么失败不抛错】
 *   文章**已经存进数据库了**。这时如果因为"通知失败"让接口返回 500，
 *   用户会以为文章没保存，然后重写一遍 —— 那才是真的麻烦。
 *   所以这里只记日志，让保存照常成功；下次保存或手动重建都能补上。
 *
 * 【为什么要设超时】
 *   这个请求打的是外部服务。不设上限的话，万一 Netlify 那边不响应，
 *   后台页面就会一直转圈。Netlify Functions 本身也有执行时间上限。
 *
 * 【为什么这个文件允许用 console】
 *   项目里 no-console 是开着的（见 eslint.config.js），唯一的例外是
 *   scripts/ 下的命令行工具。这里再开一个口子，理由是：
 *   重建失败在**别的地方看不到** —— 接口照样返回成功，
 *   而"文章改了、站点没更新"是个必须查得出来的问题。
 *   Astro 自己的 logger 只在集成和 loader 里可用，API 路由里拿不到。
 *   所以下面那行豁免是有意的，不是忘了删的调试代码。
 *
 * 想删掉这个功能？
 *   1. 删掉这个文件
 *   2. 删掉 src/pages/api/_routes/index.ts 里的第三个参数，
 *      和 posts.ts 里的三处 notifyRebuild 调用
 *   3. 删掉环境变量 NETLIFY_BUILD_HOOK_URL（本地 .env、.env.example、线上）
 * ============================================================
 */
/* eslint-disable no-console -- 理由见上面「为什么这个文件允许用 console」 */

/**
 * 触发重建的函数形状。
 *
 * 做成类型并作为参数传给 createApi，是为了让测试能塞一个替身进来
 * （否则测试会真的去请求 Netlify）。这就是依赖注入 ——
 * 和 createApi 的 db、resolveUser 是同一个套路。
 */
export type NotifyRebuild = (reason: string) => Promise<void>;

/**
 * 等 Netlify 响应的时间上限。
 *
 * 5 秒是个折中：正常响应在 1 秒内，而万一出问题也不能让后台卡太久。
 */
const REBUILD_TIMEOUT_MS = 5000;

/**
 * 生产环境用的实现：POST 一下 Netlify 给的 Build Hook 地址。
 *
 * @param reason 为什么重建。只用于日志 —— 出问题时能看出是谁触发的
 */
export const notifyNetlifyRebuild: NotifyRebuild = async reason => {
  const url = process.env.NETLIFY_BUILD_HOOK_URL;

  /**
   * 没配就当没事发生。
   *
   * 不抛错的理由和上面一样：没配这个功能只是"改动晚一点生效"，
   * 不该让"保存文章"这件事失败。
   */
  if (!url) {
    console.log(
      `[rebuild] 没配置 NETLIFY_BUILD_HOOK_URL，跳过自动重建（${reason}）`
    );

    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(REBUILD_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[rebuild] Netlify 拒绝了重建请求：HTTP ${response.status}（${reason}）`
      );

      return;
    }

    console.log(`[rebuild] 已通知 Netlify 重建：${reason}`);
  } catch (error) {
    console.error(
      `[rebuild] 通知重建失败：${
        error instanceof Error ? error.message : String(error)
      }（${reason}）`
    );
  }
};
