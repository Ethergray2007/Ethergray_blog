/**
 * API 集成测试
 * ============================================================
 * 用真实的 HTTP 请求打真实的 Elysia 应用，只把两处换成测试替身：
 *   · 数据库    → 内存版（PGlite，不碰线上数据）
 *   · 登录判断  → 假的（不走 GitHub OAuth，那需要浏览器和真实网络）
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
const authedApp = createApi(db, alwaysLoggedIn);
const anonApp = createApi(db, neverLoggedIn);

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
