/**
 * API 集成测试
 * ============================================================
 * 用真实的 HTTP 请求打真实的 Elysia 应用，只把数据库换成内存版。
 *
 * 为什么用真实请求而不是直接调函数：
 *   直接调函数测不到 Cookie 是否真的写进响应头、
 *   状态码对不对、校验中间件有没有拦住请求。
 *   而这些恰恰是最容易出错的地方。
 *
 * 跑法：
 *   node practice/tests/api.ts
 *   （需要 SESSION_SECRET，脚本会自己设一个测试用的）
 * ============================================================
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { applyMigrations } from "../../src/db/migrate-for-test.ts";
import * as schema from "../../src/db/schema.ts";
import { createUser } from "../../src/db/repositories/users.ts";
import { createApi } from "../../src/pages/api/_routes/index.ts";
import { resetAllFailures } from "../../src/lib/rate-limit.ts";

/* ------------------------------------------------------------------
 * 测试环境准备
 * ----------------------------------------------------------------- */

/**
 * 会话密钥。
 * 必须在 import session.ts **之前**设好 —— 不过它是函数内读的，
 * 所以这里设就够了。用固定值让测试可复现。
 */
process.env.SESSION_SECRET = "test-secret-for-api-tests-0123456789abcdef";

const client = new PGlite();
const db = drizzle(client, { schema });
await applyMigrations(client);

/** 建一个管理员账号，密码故意用中文和特殊字符 */
const ADMIN_USERNAME = "ethergray";
const ADMIN_PASSWORD = "测试密码!@#123";
await createUser(db, ADMIN_USERNAME, ADMIN_PASSWORD);

const app = createApi(db);

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
  /** 响应头里的 Set-Cookie 值，用来模拟浏览器的 Cookie 行为 */
  setCookie: string | null;
};

/**
 * 发一个请求。
 *
 * @param cookie 要带上的 Cookie，模拟浏览器保存下来的登录凭证
 * @param origin 请求的源。默认 http（本地开发），
 *               传 https 可以验证 Secure 属性是否加上
 */
async function call(
  method: string,
  path: string,
  options: { body?: unknown; cookie?: string; origin?: string } = {}
): Promise<ApiResponse> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (options.cookie) {
    headers.cookie = options.cookie;
  }

  const response = await app.handle(
    new Request(`${options.origin ?? "http://localhost"}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  );

  const text = await response.text();

  let body: Record<string, unknown> | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  return {
    status: response.status,
    body,
    setCookie: response.headers.get("set-cookie"),
  };
}

/** 从 Set-Cookie 里提取出 "session=xxx" 这一段，供后续请求携带 */
function extractSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;

  const match = /(session=[^;]+)/.exec(setCookie);

  return match ? match[1]! : null;
}

/* ==================================================================
 * 1. 未登录时的访问控制
 * ================================================================ */
console.log("\n=== 1. 未登录时的访问控制 ===");

for (const [method, path] of [
  ["GET", "/api/posts"],
  ["GET", "/api/posts/1"],
  ["POST", "/api/posts"],
  ["PATCH", "/api/posts/1"],
  ["DELETE", "/api/posts/1"],
] as const) {
  const res = await call(method, path, { body: method === "GET" ? undefined : {} });
  check(
    `${method} ${path} 未登录返回 401`,
    res.status === 401,
    `实际 ${res.status}：${JSON.stringify(res.body)}`
  );
}

const me = await call("GET", "/api/me");
check("GET /api/me 未登录返回 401", me.status === 401);

/* ==================================================================
 * 2. 登录
 * ================================================================ */
console.log("\n=== 2. 登录 ===");

const wrongPassword = await call("POST", "/api/login", {
  body: { username: ADMIN_USERNAME, password: "错的密码" },
});
check("密码错误返回 401", wrongPassword.status === 401);
check(
  "错误信息不透露是用户名还是密码错",
  String(wrongPassword.body?.error).includes("用户名或密码"),
  JSON.stringify(wrongPassword.body)
);

const wrongUser = await call("POST", "/api/login", {
  body: { username: "不存在的用户", password: "随便" },
});
check("用户不存在返回 401", wrongUser.status === 401);
check(
  "与密码错误返回**同一句**话",
  wrongUser.body?.error === wrongPassword.body?.error,
  `"${wrongUser.body?.error}" vs "${wrongPassword.body?.error}"`
);

const missingField = await call("POST", "/api/login", { body: { username: "x" } });
check("缺字段返回 422（校验拦住了）", missingField.status === 422);

const login = await call("POST", "/api/login", {
  body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
});
check("正确密码登录成功", login.status === 200);
check("返回用户名", (login.body?.user as { username?: string })?.username === ADMIN_USERNAME);

const sessionCookie = extractSessionCookie(login.setCookie);
check("响应里带了 session Cookie", sessionCookie !== null);
check(
  "Cookie 是 HttpOnly（JS 读不到）",
  login.setCookie?.toLowerCase().includes("httponly") === true,
  login.setCookie ?? "(无)"
);
check(
  "Cookie 带 SameSite（防 CSRF）",
  login.setCookie?.toLowerCase().includes("samesite") === true
);

/**
 * Secure 属性必须跟着**协议**走，不能跟着 NODE_ENV 走。
 *
 * 原因：本地开发是 http，Netlify Functions 运行时也不保证
 * NODE_ENV=production。用 NODE_ENV 判断的话：
 *   线上可能漏加 Secure
 *   本地可能误加 Secure，浏览器直接丢掉 Cookie，导致永远登不上
 */
check(
  "http 请求下不加 Secure（否则本地登不上）",
  login.setCookie?.toLowerCase().includes("secure") === false,
  login.setCookie ?? "(无)"
);

const httpsLogin = await call("POST", "/api/login", {
  origin: "https://example.com",
  body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
});
check(
  "https 请求下会加 Secure",
  httpsLogin.setCookie?.toLowerCase().includes("secure") === true,
  httpsLogin.setCookie ?? "(无)"
);

resetAllFailures();

const loginCookie = sessionCookie!;
resetAllFailures();

/* ==================================================================
 * 3. 登录后的正常操作
 * ================================================================ */
console.log("\n=== 3. 登录后的操作 ===");

const meLoggedIn = await call("GET", "/api/me", { cookie: loginCookie });
check("登录后 /api/me 返回用户", meLoggedIn.status === 200);
check(
  "返回的是当前登录用户",
  (meLoggedIn.body?.user as { username?: string })?.username === ADMIN_USERNAME
);

const emptyList = await call("GET", "/api/posts", { cookie: loginCookie });
check("空库时文章列表为空", Array.isArray(emptyList.body?.posts));
check("列表长度为 0", (emptyList.body?.posts as unknown[])?.length === 0);

/* ==================================================================
 * 4. 新建文章
 * ================================================================ */
console.log("\n=== 4. 新建文章 ===");

const created = await call("POST", "/api/posts", {
  cookie: loginCookie,
  body: {
    title: "我的第一篇数据库文章",
    description: "通过 API 创建的",
    body: "# 标题\n\n正文内容",
    tags: ["测试", "API"],
  },
});
check("创建成功返回 201", created.status === 201, `实际 ${created.status}`);

const post = created.body?.post as Record<string, unknown>;
check("返回了文章 id", typeof post?.id === "number");
check("标题正确", post?.title === "我的第一篇数据库文章");
check("中文标题生成了 slug", typeof post?.slug === "string" && (post.slug as string).length > 0);
check("默认是草稿", post?.status === "draft");
check("草稿没有发布时间", post?.publishedAt === null);
check("标签存下来了", Array.isArray(post?.tags) && (post.tags as string[]).length === 2);

const postId = post.id as number;

const emptyTitle = await call("POST", "/api/posts", {
  cookie: loginCookie,
  body: { title: "" },
});
check("空标题返回 422", emptyTitle.status === 422);

const tooLong = await call("POST", "/api/posts", {
  cookie: loginCookie,
  body: { title: "a".repeat(201) },
});
check("标题超长返回 422", tooLong.status === 422);

const duplicate = await call("POST", "/api/posts", {
  cookie: loginCookie,
  body: { title: "我的第一篇数据库文章" },
});
check("slug 重复返回 409", duplicate.status === 409, `实际 ${duplicate.status}`);

/* ==================================================================
 * 5. 读取单篇
 * ================================================================ */
console.log("\n=== 5. 读取单篇 ===");

const one = await call("GET", `/api/posts/${postId}`, { cookie: loginCookie });
check("按 id 能查到", one.status === 200);
check("内容正确", (one.body?.post as { title?: string })?.title === "我的第一篇数据库文章");

const notFound = await call("GET", "/api/posts/99999", { cookie: loginCookie });
check("不存在的 id 返回 404", notFound.status === 404);

const badId = await call("GET", "/api/posts/abc", { cookie: loginCookie });
check("非数字 id 返回 400", badId.status === 400);

/* ==================================================================
 * 6. 修改文章
 * ================================================================ */
console.log("\n=== 6. 修改文章 ===");

const updated = await call("PATCH", `/api/posts/${postId}`, {
  cookie: loginCookie,
  body: { title: "改过的标题" },
});
check("修改成功", updated.status === 200);
check("标题已更新", (updated.body?.post as { title?: string })?.title === "改过的标题");
check(
  "只改标题时其他字段不变",
  Array.isArray((updated.body?.post as { tags?: unknown })?.tags)
);

const published = await call("PATCH", `/api/posts/${postId}`, {
  cookie: loginCookie,
  body: { status: "published" },
});
check("改为已发布", (published.body?.post as { status?: string })?.status === "published");
check(
  "自动补上了发布时间",
  (published.body?.post as { publishedAt?: unknown })?.publishedAt !== null
);

const patchMissing = await call("PATCH", "/api/posts/99999", {
  cookie: loginCookie,
  body: { title: "x" },
});
check("修改不存在的文章返回 404", patchMissing.status === 404);

/* ==================================================================
 * 7. 删除
 * ================================================================ */
console.log("\n=== 7. 删除 ===");

const removed = await call("DELETE", `/api/posts/${postId}`, { cookie: loginCookie });
check("删除成功", removed.status === 200);

const afterDelete = await call("GET", `/api/posts/${postId}`, { cookie: loginCookie });
check("删除后查不到", afterDelete.status === 404);

const removeAgain = await call("DELETE", `/api/posts/${postId}`, { cookie: loginCookie });
check("重复删除返回 404", removeAgain.status === 404);

/* ==================================================================
 * 8. 登出与失效凭证
 * ================================================================ */
console.log("\n=== 8. 登出 ===");

const logout = await call("POST", "/api/logout", { cookie: loginCookie });
check("登出返回 200", logout.status === 200);
check(
  "登出会清掉 Cookie",
  logout.setCookie?.includes("session=;") === true ||
    logout.setCookie?.toLowerCase().includes("max-age=0") === true,
  logout.setCookie ?? "(没有 Set-Cookie)"
);

const tampered = await call("GET", "/api/me", { cookie: "session=forged.signature" });
check("伪造的 Cookie 被拒绝", tampered.status === 401);

/**
 * 畸形 Cookie。
 *
 * ⚠️ 这里只能用 ASCII 字符。
 * HTTP 头按规范只能包含字节（0~255），往里面塞中文时
 * Node 的 fetch 会在**发请求之前**就抛 ByteString 错误 ——
 * 那是测试写法的问题，不是被测代码的问题
 * （浏览器同样不会发出这种请求，所以那个前提本身也不成立）。
 */
for (const bad of ["session=...", "session=", "session", "session=a.b.c.d"]) {
  const res = await call("GET", "/api/me", { cookie: bad });
  check(`畸形 Cookie "${bad}" → 401 且不崩`, res.status === 401, `实际 ${res.status}`);
}

/* ==================================================================
 * 9. 路由与错误处理
 * ================================================================ */
console.log("\n=== 9. 路由与错误处理 ===");

const noRoute = await call("GET", "/api/不存在的接口", { cookie: loginCookie });
check("不存在的接口返回 404 而不是 500", noRoute.status === 404, `实际 ${noRoute.status}`);
check("错误格式统一", typeof noRoute.body?.code === "string");

/* ==================================================================
 * 10. 登录限流
 * ================================================================ */
console.log("\n=== 10. 登录限流 ===");

// 前面已经重置过一次，这里连错 5 次触发锁定
for (let i = 0; i < 5; i++) {
  await call("POST", "/api/login", {
    body: { username: ADMIN_USERNAME, password: `错的${i}` },
  });
}

const locked = await call("POST", "/api/login", {
  body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
});
check(
  "连续失败 5 次后被锁定（即使密码正确）",
  locked.status === 429,
  `实际 ${locked.status}：${JSON.stringify(locked.body)}`
);
check("锁定提示里说明了等待时间", typeof locked.body?.error === "string");

resetAllFailures();

const afterReset = await call("POST", "/api/login", {
  body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
});
check("计数清空后可以正常登录", afterReset.status === 200);

/* ==================================================================
 * 结果
 * ================================================================ */
await client.close();

console.log(`\n${"=".repeat(52)}`);
console.log(`通过 ${passed} 项，失败 ${failed.length} 项`);
if (failed.length > 0) {
  console.log("失败项：");
  failed.forEach(name => console.log(`  - ${name}`));
  process.exit(1);
}
console.log("🎉 API 全部正常");
