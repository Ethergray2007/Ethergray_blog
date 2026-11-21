/**
 * 旧版显式部署接口的兼容工具
 * ============================================================
 * 文章页面已经动态读取数据库，文章增删改和发布状态切换都不调用此模块，
 * 后台编辑器也不提供重建按钮。保留它是为了旧版 POST /api/rebuild 调用方。
 *
 * 显式调用仍会请求 Netlify Build Hook，并可能消耗生产部署额度。
 * 本地 .env 不要配置 NETLIFY_BUILD_HOOK_URL，避免调试时触发真实生产部署。
 * 未配置、网络失败或超时时返回结果，由调用方处理，不把未知结果当成成功。
 *
 * 想删掉兼容接口？
 *   1. 删除本文件
 *   2. 删除 posts.ts 的 /rebuild 路由和 createApi 的通知函数参数
 *   3. 删除 adminApi.ts 的 rebuildApi 与对应兼容测试，再移除 Build Hook 环境变量
 * ============================================================
 */
/* eslint-disable no-console -- 理由见上面「为什么这个文件允许用 console」 */

/**
 * 触发重建的结果。
 *
 * 【为什么要把结果返回出去，而不是只记日志】
 *   这个功能会花掉 Netlify 的部署额度（免费套餐一次生产部署 15 积分），
 *   所以"到底触发了没有"必须让调用方知道 —— 后台要能如实告诉作者
 *   "已请求重建"还是"没配置，点了也没用"。
 *   只写日志的话，界面上永远是"成功"，而作者会一直刷新等一个不会来的部署。
 */
export type RebuildOutcome = "triggered" | "not-configured" | "failed";

/**
 * 触发重建的函数形状。
 *
 * 做成类型并作为参数传给 createApi，是为了让测试能塞一个替身进来
 * （否则测试会真的去请求 Netlify）。这就是依赖注入 ——
 * 和 createApi 的 db、resolveUser 是同一个套路。
 */
export type NotifyRebuild = (reason: string) => Promise<RebuildOutcome>;

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
      `[rebuild] 没配置 NETLIFY_BUILD_HOOK_URL，跳过重建（${reason}）`
    );

    return "not-configured";
  }

  try {
    /**
     * 拼上 trigger_title —— Netlify 支持的一个可选查询参数，
     * 它会**替换部署列表里那条默认消息**。
     *
     * 加了之后，Netlify 的 Deploys 页面直接能看出"这次部署是哪次保存
     * 触发的"（比如「发布了《xxx》」），而不是一串要自己对照时间的默认文字。
     * 代价为零，排查"文章改了怎么没上线"时省很多事。
     *
     * ⚠️ 必须用 URLSearchParams 拼，不能手工字符串拼接 ——
     *    reason 里是中文和《》，直接拼进查询串会坏掉。
     *
     * 参数说明见官方文档的 Parameters 一节：
     *   https://docs.netlify.com/build/configure-builds/build-hooks/
     */
    const hookUrl = new URL(url);
    hookUrl.searchParams.set("trigger_title", reason);

    const response = await fetch(hookUrl, {
      method: "POST",
      signal: AbortSignal.timeout(REBUILD_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[rebuild] Netlify 拒绝了重建请求：HTTP ${response.status}（${reason}）`
      );

      return "failed";
    }

    console.log(`[rebuild] 已通知 Netlify 重建：${reason}`);

    return "triggered";
  } catch (error) {
    console.error(
      `[rebuild] 通知重建失败：${
        error instanceof Error ? error.message : String(error)
      }（${reason}）`
    );

    return "failed";
  }
};
