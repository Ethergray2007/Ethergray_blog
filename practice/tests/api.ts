/**
 * API 集成测试
 * ============================================================
 * 用真实的 HTTP 请求打真实的 Elysia 应用，只把三处换成测试替身：
 *   · 数据库      → 内存版（PGlite，不碰线上数据）
 *   · 登录判断    → 假的（不走 GitHub OAuth，那需要浏览器和真实网络）
 *   · 触发重建    → 只记录不做事的替身（否则测试会真的去请求 Netlify）
 *
 * 【为什么测的是"我们自己的代码"而不是整套认证】
 * 登录流程（GitHub OAuth、会话 Cookie 的签名与加密）由 Better Auth 负责，
 * 它有官方的测试工具和自己的测试。我们再去测一遍没有意义，
 * 而且它一升级我们的测试就会碎。
 *
 * 所以这里只测我们写的部分：
 *   · 未登录时接口是否一律拒绝（401）
 *   · 已登录时文章增删改查是否正确
 *   · 参数校验、状态码、错误格式
 *   · 路由不存在时返回 404 而不是 500
 *   · 文章改动后**该不该**触发站点重建
 *
 * 跑法：
 *   npm run api:test
 * ============================================================
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { applyMigrations } from "../../src/db/migrate-for-test.ts";
import * as schema from "../../src/db/schema.ts";
import { createApi } from "../../src/pages/api/_routes/index.ts";
import type { ResolveUser } from "../../src/pages/api/_routes/auth.ts";
import type { NotifyRebuild } from "../../src/lib/rebuild.ts";

/* ------------------------------------------------------------------
 * 测试替身
 * ----------------------------------------------------------------- */

/** 假装已登录的博主 */
const FAKE_USER = { id: "test-user-id", username: "ethergray" };

/**
 * 「永远已登录」。
 *
 * 真实实现要解 Better Auth 的加密 Cookie，测试里没法造出合法的 Cookie
 * （那需要走完整的 GitHub 授权流程）。所以这里直接返回一个用户。
 */
const alwaysLoggedIn: ResolveUser = async () => FAKE_USER;

/** 「永远未登录」，用来验证访问控制 */
const neverLoggedIn: ResolveUser = async () => null;

/**
 * 「只记录、不请求」的重建通知。
 *
 * ⚠️ 必须显式传进去。默认实现会去 POST 环境变量里的 Netlify Build Hook ——
 *    如果开发者本地正好配了那个变量，跑一次测试就会触发一串真实构建。
 *    测试不该有这种副作用。
 */
const rebuildCalls: string[] = [];
const spyNotifyRebuild: NotifyRebuild = async reason => {
  rebuildCalls.push(reason);

  return "triggered";
};

/* ------------------------------------------------------------------
 * 准备数据库和两个应用实例
 * ----------------------------------------------------------------- */

const client = new PGlite();
const db = drizzle(client, { schema });
await applyMigrations(client);

/**
 * 准备两个应用：
 *   authedApp    所有请求都当作已登录 —— 用来测业务逻辑
 *   anonApp      所有请求都当作未登录 —— 用来测访问控制
 *
 * 分开建比在一个应用里切换更清楚，也不会互相干扰。
 */
const authedApp = createApi(db, alwaysLoggedIn, spyNotifyRebuild);
const anonApp = createApi(db, neverLoggedIn, spyNotifyRebuild);

/* ------------------------------------------------------------------
 * 断言与请求工具
 * ----------------------------------------------------------------- */
let passed = 0;
const failed: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ❌ ${name}${detail ? "\n       " + detail : ""}`);
  }
}

type ApiResponse = {
  status: number;
  body: Record<string, unknown> | null;
};

/**
 * 发一个请求。
 *
 * ⚠️ 主机名必须写正常的域名形式。
 *    用 "http://x" 这种单字母主机名时 Elysia 匹配不上路由，
 *    所有请求都会变成 404 —— 这个坑我踩过，排查了很久。
 */
async function call(
  app: { handle: (request: Request) => Promise<Response> },
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse> {
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );

  return {
    status: response.status,
    body: (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null,
  };
}

/** 已登录状态下的请求 */
const asUser = (method: string, path: string, body?: unknown) =>
  call(authedApp, method, path, body);

/** 未登录状态下的请求 */
const asGuest = (method: string, path: string, body?: unknown) =>
  call(anonApp, method, path, body);

/* ==================================================================
 * 1. 未登录时的访问控制
 * ================================================================ */
console.log("\n=== 1. 未登录时的访问控制 ===");

check(
  "GET /api/posts 未登录返回 401",
  (await asGuest("GET", "/api/posts")).status === 401
);
check(
  "GET /api/posts/1 未登录返回 401",
  (await asGuest("GET", "/api/posts/1")).status === 401
);
check(
  "POST /api/posts 未登录返回 401",
  (await asGuest("POST", "/api/posts", { title: "偷偷发的" })).status === 401
);
check(
  "PATCH /api/posts/1 未登录返回 401",
  (await asGuest("PATCH", "/api/posts/1", { title: "改一下" })).status === 401
);
check(
  "DELETE /api/posts/1 未登录返回 401",
  (await asGuest("DELETE", "/api/posts/1")).status === 401
);
check("GET /api/me 未登录返回 401", (await asGuest("GET", "/api/me")).status === 401);

/**
 * 顺序检查：未登录 + 数据格式错误时，应该先回 401 而不是 422。
 *
 * 这条很重要 —— 如果先校验数据，等于告诉未登录的人"这个接口要哪些字段"。
 * 我为此特意把校验从框架的声明式写法改成了处理函数内部手动调用。
 */
const unauthorizedBeatsValidation = await asGuest("POST", "/api/posts", {
  // 故意缺 title，格式一定不合格
  description: "只有描述",
});
check(
  "未登录 + 数据不合法 → 先回 401（不泄露字段要求）",
  unauthorizedBeatsValidation.status === 401,
  `实际 ${unauthorizedBeatsValidation.status}`
);

/* ==================================================================
 * 2. 登录状态查询
 * ================================================================ */
console.log("\n=== 2. 登录状态查询 ===");

const me = await asUser("GET", "/api/me");
check("已登录时 /api/me 返回 200", me.status === 200);
check(
  "返回的是当前登录用户",
  (me.body?.user as { username?: string } | undefined)?.username ===
    FAKE_USER.username
);

/* ==================================================================
 * 3. 文章列表
 * ================================================================ */
console.log("\n=== 3. 文章列表 ===");

const emptyList = await asUser("GET", "/api/posts");
check("空库时能取到列表", emptyList.status === 200);
check(
  "列表为空",
  Array.isArray(emptyList.body?.posts) &&
    (emptyList.body.posts as unknown[]).length === 0
);

/* ==================================================================
 * 4. 新建文章
 * ================================================================ */
console.log("\n=== 4. 新建文章 ===");

const created = await asUser("POST", "/api/posts", {
  title: "测试文章标题",
  description: "这是摘要",
  body: "正文内容",
  tags: ["测试", "astro"],
});
check("创建成功返回 201", created.status === 201, `实际 ${created.status}`);

const post = created.body?.post as Record<string, unknown> | undefined;
const postId = post?.id as number | undefined;

check("返回了文章 id", typeof postId === "number" && postId > 0);
check("标题正确", post?.title === "测试文章标题");
check(
  "中文标题生成了 slug",
  typeof post?.slug === "string" && (post.slug as string).length > 0,
  `slug = ${String(post?.slug)}`
);
check("默认是草稿", post?.status === "draft");
check("草稿没有发布时间", post?.publishedAt === null);
check(
  "标签存下来了",
  Array.isArray(post?.tags) && (post.tags as string[]).length === 2
);

check(
  "空标题返回 422",
  (await asUser("POST", "/api/posts", { title: "" })).status === 422
);
check(
  "标题超长返回 422",
  (await asUser("POST", "/api/posts", { title: "字".repeat(300) })).status === 422
);

// slug 冲突
const takenSlug = post?.slug as string;
const conflict = await asUser("POST", "/api/posts", {
  title: "另一篇",
  slug: takenSlug,
});
check("slug 重复返回 409", conflict.status === 409, `实际 ${conflict.status}`);

/* ==================================================================
 * 5. 读取单篇
 * ================================================================ */
console.log("\n=== 5. 读取单篇 ===");

const one = await asUser("GET", `/api/posts/${postId}`);
check("按 id 能查到", one.status === 200);
check(
  "内容正确",
  (one.body?.post as { body?: string } | undefined)?.body === "正文内容"
);
check("不存在的 id 返回 404", (await asUser("GET", "/api/posts/99999")).status === 404);
check("非数字 id 返回 400", (await asUser("GET", "/api/posts/abc")).status === 400);

/**
 * ⚠️ 这几条是踩坑之后补的回归测试。
 *
 * 起因：id 之前是直接 Number() 转的，而 Number 比想象中宽容得多 ——
 * Number("0x10") === 16、Number("1e2") === 100、Number("1.0") === 1，
 * 全都通过 Number.isInteger。于是 /api/posts/0x10 不是回 400，
 * 而是命中第 16 篇真实文章 —— 改错、删错都从这里来。
 */
check(
  "十六进制写法的 id 返回 400",
  (await asUser("GET", "/api/posts/0x10")).status === 400
);
check(
  "科学计数法写法的 id 返回 400",
  (await asUser("GET", "/api/posts/1e2")).status === 400
);
check(
  "带空格的 id 返回 400",
  (await asUser("GET", "/api/posts/%20" + String(postId))).status === 400
);

/* ==================================================================
 * 6. 修改文章
 * ================================================================ */
console.log("\n=== 6. 修改文章 ===");

const patched = await asUser("PATCH", `/api/posts/${postId}`, {
  title: "改过的标题",
});
check("修改成功", patched.status === 200);

const patchedPost = patched.body?.post as Record<string, unknown> | undefined;
check("标题已更新", patchedPost?.title === "改过的标题");
check(
  "只改标题时其他字段不变",
  patchedPost?.description === "这是摘要" && patchedPost?.status === "draft"
);

/**
 * ⚠️ 回归测试：后台的「网址标识」是**每次保存都跟着表单一起发**的
 * （留空时发的是空串），而提示文案承诺"留空就根据标题自动生成"。
 *
 * 原来的实现在 PATCH 里直接走 toSlug(body.slug)，而 toSlug("") 的兜底值
 * 是 "post" —— 于是"清空 slug 再保存"不是按标题重新生成，
 * 而是把网址**静默改成 /posts/post**，旧链接全部 404。
 */
const clearedSlug = await asUser("PATCH", `/api/posts/${postId}`, {
  slug: "",
  title: "换个标题",
});

const clearedSlugPost = clearedSlug.body?.post as
  | Record<string, unknown>
  | undefined;

check(
  "slug 留空时不会退化成 post",
  clearedSlugPost?.slug !== "post",
  `实际 ${String(clearedSlugPost?.slug)}`
);
check(
  "slug 留空时按标题重新生成",
  clearedSlugPost?.slug === "换个标题",
  `实际 ${String(clearedSlugPost?.slug)}`
);

const published = await asUser("PATCH", `/api/posts/${postId}`, {
  status: "published",
});

const publishedPost = published.body?.post as Record<string, unknown> | undefined;
check("改为已发布", publishedPost?.status === "published");
check(
  "自动补上了发布时间",
  typeof publishedPost?.publishedAt === "string" &&
    (publishedPost.publishedAt as string).length > 0
);

check(
  "修改不存在的文章返回 404",
  (await asUser("PATCH", "/api/posts/99999", { title: "x" })).status === 404
);

/* ==================================================================
 * 7. 删除
 * ================================================================ */
console.log("\n=== 7. 删除 ===");

check("删除成功", (await asUser("DELETE", `/api/posts/${postId}`)).status === 200);
check("删除后查不到", (await asUser("GET", `/api/posts/${postId}`)).status === 404);
check(
  "重复删除返回 404",
  (await asUser("DELETE", `/api/posts/${postId}`)).status === 404
);

/* ==================================================================
 * 8. 路由与错误处理
 * ================================================================ */
console.log("\n=== 8. 路由与错误处理 ===");

const noRoute = await asUser("GET", "/api/不存在的接口");
check("不存在的接口返回 404 而不是 500", noRoute.status === 404, `实际 ${noRoute.status}`);
check(
  "错误格式统一",
  typeof noRoute.body?.error === "string" &&
    typeof noRoute.body?.code === "string"
);

/* ==================================================================
 * 9. 请求体边界情况
 * ================================================================ */
console.log("\n=== 9. 请求体边界情况 ===");

/**
 * DELETE 带 content-type: application/json。
 *
 * 【这条测试记录了一个被推翻的结论】
 * 早先这里会返回 500 "Bad Request"。我当时以为原因是
 * "Elysia 看到 content-type 就去解析一个不存在的 body"。
 *
 * 那个判断是错的。真正的原因是我们自己的代码（readJsonBody）
 * 抢先读掉了请求体，导致后续出问题。改用 Better Auth 之后
 * 那段代码没了，DELETE 带 content-type 完全正常。
 *
 * 所以现在断言的是"能正常删除"，而不是"返回 400"。
 */
const toDelete = await asUser("POST", "/api/posts", { title: "待删除" });
const toDeleteId = (toDelete.body?.post as { id?: number } | undefined)?.id;

const deleteWithContentType = await authedApp.handle(
  new Request(`http://localhost/api/posts/${toDeleteId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  })
);
check(
  "DELETE 带 content-type 也能正常删除",
  deleteWithContentType.status === 200,
  `实际 ${deleteWithContentType.status}`
);

/** 确认真的删掉了，而不是只回了个 200 */
check(
  "删除确实生效了",
  (await asUser("GET", `/api/posts/${toDeleteId}`)).status === 404
);

/** 非法 JSON 应该被挡成 400 */
const badJson = await authedApp.handle(
  new Request("http://localhost/api/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{不是合法的 JSON",
  })
);
check("请求体不是合法 JSON 时返回 400", badJson.status === 400, `实际 ${badJson.status}`);

/* ==================================================================
 * 10. 文章改动与站点重建
 * ================================================================ */
console.log("\n=== 10. 文章改动与站点重建 ===");

/**
 * 页面是构建时生成的静态 HTML，所以文章有变动时要通知 Netlify 重建一次。
 *
 * 但**不能什么操作都触发**：Netlify 免费套餐每次生产部署花 15 积分
 * （一个月 300），而构建还要一两分钟。规则是"只有站点上该有哪些页面
 * 变了才自动重建"—— 见 posts.ts 里的 changesPublicationStatus。
 *
 * 每条断言前都清空记录，这样看到的就只是**这一次**操作的结果。
 */
rebuildCalls.length = 0;

const draftOne = await asUser("POST", "/api/posts", { title: "只是草稿" });
const draftOneId = (draftOne.body?.post as { id?: number } | undefined)?.id;

check(
  "新建草稿不触发重建",
  rebuildCalls.length === 0,
  `实际触发 ${rebuildCalls.length} 次`
);

rebuildCalls.length = 0;

await asUser("PATCH", `/api/posts/${draftOneId}`, { title: "改个标题，还是草稿" });

check(
  "改草稿不触发重建",
  rebuildCalls.length === 0,
  `实际触发 ${rebuildCalls.length} 次`
);

rebuildCalls.length = 0;

await asUser("PATCH", `/api/posts/${draftOneId}`, { status: "published" });

check(
  "草稿改成已发布要触发重建",
  rebuildCalls.length === 1,
  `实际触发 ${rebuildCalls.length} 次`
);

rebuildCalls.length = 0;

await asUser("PATCH", `/api/posts/${draftOneId}`, {
  title: "已发布的文章改标题",
  body: "顺便改正文",
});

/**
 * 这条是本节最**省钱**的一条。
 *
 * 改一篇已发布文章的正文，站点上的页面还在、只是内容旧了 ——
 * 不重建也不会"错"，只是暂时不同步。而如果这里自动重建，
 * 改五遍错别字就是 5 × 15 = 75 积分。所以交给后台的
 * 「立即重建」按钮，作者满意了再花那 15 分。
 */
check(
  "改已发布文章的内容不触发重建（交给手动按钮）",
  rebuildCalls.length === 0,
  `实际触发 ${rebuildCalls.length} 次`
);

rebuildCalls.length = 0;

await asUser("PATCH", `/api/posts/${draftOneId}`, { status: "draft" });

/**
 * 这条是本节的**重点**。
 *
 * 把已发布的文章收回成草稿时，接口返回的是草稿 —— 只看返回结果，
 * 会以为"站点上看不出变化"。但线上那篇旧文章还在，
 * 必须重建才能让它消失。
 */
check(
  "已发布的收回成草稿也要触发重建",
  rebuildCalls.length === 1,
  `实际触发 ${rebuildCalls.length} 次`
);

rebuildCalls.length = 0;

await asUser("DELETE", `/api/posts/${draftOneId}`);

check(
  "删除草稿不触发重建",
  rebuildCalls.length === 0,
  `实际触发 ${rebuildCalls.length} 次`
);

rebuildCalls.length = 0;

const publishedOne = await asUser("POST", "/api/posts", {
  title: "直接发布的一篇",
  status: "published",
});
const publishedOneId = (
  publishedOne.body?.post as { id?: number } | undefined
)?.id;

check(
  "新建时直接发布要触发重建",
  rebuildCalls.length === 1,
  `实际触发 ${rebuildCalls.length} 次`
);

rebuildCalls.length = 0;

await asUser("DELETE", `/api/posts/${publishedOneId}`);

check(
  "删除已发布的文章要触发重建",
  rebuildCalls.length === 1,
  `实际触发 ${rebuildCalls.length} 次`
);

rebuildCalls.length = 0;

await asGuest("POST", "/api/posts", { title: "偷偷发的", status: "published" });

check(
  "未登录的写操作不触发重建",
  rebuildCalls.length === 0,
  `实际触发 ${rebuildCalls.length} 次`
);

/* ------------------------------------------------------------------
 * 手动重建：POST /api/rebuild
 *
 * 这是"改一篇已发布文章的错别字"之后唯一的出路 —— 那种改动不会自动
 * 重建（太贵），要作者自己按按钮。
 * ----------------------------------------------------------------- */
rebuildCalls.length = 0;

const manualRebuild = await asUser("POST", "/api/rebuild");

check(
  "手动重建接口能触发一次",
  manualRebuild.status === 200 && rebuildCalls.length === 1,
  `状态 ${manualRebuild.status}，触发 ${rebuildCalls.length} 次`
);

/**
 * 接口必须把结果回给前端。
 *
 * 没配 NETLIFY_BUILD_HOOK_URL 时，触发是"成功"了但什么都不会发生。
 * 前端要靠这个字段如实告诉作者，否则他会一直刷新等一个不会来的部署。
 */
check(
  "手动重建会把结果返回给前端",
  manualRebuild.body?.outcome === "triggered",
  `实际返回 ${JSON.stringify(manualRebuild.body)}`
);

rebuildCalls.length = 0;

const guestRebuild = await asGuest("POST", "/api/rebuild");

check(
  "手动重建未登录返回 401",
  guestRebuild.status === 401,
  `实际 ${guestRebuild.status}`
);
check(
  "未登录时手动重建不会真的触发",
  rebuildCalls.length === 0,
  `实际触发 ${rebuildCalls.length} 次`
);

/* ==================================================================
 * 汇总
 * ================================================================ */
console.log(`\n${"=".repeat(52)}`);
console.log(`通过 ${passed} 项，失败 ${failed.length} 项`);

if (failed.length > 0) {
  console.log("\n失败的项：");
  for (const name of failed) {
    console.log(`  · ${name}`);
  }
  await client.close();
  process.exit(1);
}

console.log("🎉 API 全部正常");
await client.close();
