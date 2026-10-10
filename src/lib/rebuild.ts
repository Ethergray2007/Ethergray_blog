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
 *   新建一个，把给出的地址填进 **Netlify 的环境变量** NETLIFY_BUILD_HOOK_URL。
 *
 *   ⚠️ 建 hook 时**分支要选生产分支**（这个项目是 main）。选成 develop 的话
 *      触发的是免费的预览部署 —— 文章不会出现在正式站点上。
 *
 *   ⚠️ 本地 .env 里**不要填**这个变量。填了之后，本地开发时随手点一下保存
 *      就会真的触发一次线上生产构建（15 积分）。本地不填的表现是后台提示
 *      "没配置，点了也不会重建" —— 那正是本地该有的样子。
 *
 * 【什么时候会触发 —— 这条和钱有关，别随手改】
 *   Netlify 免费套餐**每次生产部署花 15 积分**，一个月总共 300。
 *   也就是说一次手滑的自动重建 = 少一次上线机会。所以规则定得很紧：
 *
 *     自动（见 api/_routes/posts.ts 的 changesPublicationStatus）
 *       新建并直接发布 · 草稿→已发布 · 已发布→草稿 · 删除已发布的文章
 *       —— 这些都会让**站点上该有哪些页面**发生变化，不重建就是错的
 *
 *     靠后台的「立即重建」按钮（POST /api/rebuild）
 *       改一篇已发布文章的正文/标题/标签
 *       —— 页面还是那个页面，只是内容旧了。改五遍错别字就自动重建
 *          五次要 75 积分，而按一次按钮只花 15 分
 *
 *     永远不触发
 *       草稿的任何改动（站点上本来就看不到）
 *
 *   代价是"改完已发布的文章，站点不会自己更新"。所以后台保存后必须
 *   **明确提示**要去点那个按钮，不能让人以为保存完就上线了。
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
