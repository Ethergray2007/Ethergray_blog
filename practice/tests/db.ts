/**
 * 一次性验证：文章 / 用户仓库在真实 PostgreSQL 上跑得对不对。
 * 用完即删。
 *
 * 跑法：
 *   node practice/_repo-probe.ts
 *
 * 为什么用 PGlite 而不是连线上数据库：
 *   它是**进程内**的 PostgreSQL（WASM 编译版），
 *   建表、增删改查的行为和真实 Postgres 一致，
 *   但不需要任何服务、不联网、不污染线上数据。
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { applyMigrations } from "../../src/db/migrate-for-test.ts";
import * as schema from "../../src/db/schema.ts";
import {
  createPost,
  deletePost,
  getPostBySlug,
  isSlugTaken,
  listAllPosts,
  listPublishedPosts,
  updatePost,
} from "../../src/db/repositories/posts.ts";

/* ---------- 准备一个干净的测试数据库 ---------- */
const client = new PGlite();
const db = drizzle(client, { schema });

const count = await applyMigrations(client);
console.log(`✅ 应用了 ${count} 个迁移，表结构就绪`);

/** 断言小工具 */
let passed = 0;
const failed: string[] = [];
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ❌ ${name}${detail ? "  ← " + detail : ""}`);
  }
}

/**
 * 在整条错误链里找关键字。
 *
 * ⚠️ 不能只看 error.message。Drizzle 会把底层驱动的错误**包装**一层：
 *     error.message        "Failed query: insert into ..."   ← 看不到原因
 *     error.cause.message  'duplicate key value violates ...' ← 真正的原因
 * 所以要顺着 cause 一路找下去。
 */
function errorChainContains(error: unknown, keyword: string): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current; depth++) {
    const message =
      current instanceof Error ? current.message : String(current);

    if (message.includes(keyword)) {
      return true;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

/* ============================================================
 * 文章仓库
 * ========================================================== */
console.log("\n=== 文章仓库 ===");

const draft = await createPost(db, {
  slug: "draft-one",
  title: "草稿文章",
  body: "内容",
  tags: ["测试"],
  status: "draft",
});
check("创建草稿", draft.id > 0 && draft.status === "draft");
check("草稿不该有发布时间", draft.publishedAt === null);

const pub1 = await createPost(db, {
  slug: "published-one",
  title: "已发布一",
  body: "内容 A",
  tags: ["Astro", "测试"],
  status: "published",
});
check("创建已发布文章时自动补发布时间", pub1.publishedAt instanceof Date);

const pub2 = await createPost(db, {
  slug: "published-two",
  title: "已发布二",
  body: "内容 B",
  tags: [],
  status: "published",
  publishedAt: new Date("2020-01-01T00:00:00Z"),
});

const published = await listPublishedPosts(db);
check("只返回已发布的", published.length === 2, `实际 ${published.length} 条`);
check("不包含草稿", !published.some(p => p.slug === "draft-one"));
check(
  "按发布时间从新到旧",
  published[0]!.slug === "published-one",
  `第一条是 ${published[0]!.slug}`
);

const limited = await listPublishedPosts(db, 1);
check("limit 生效", limited.length === 1);

const all = await listAllPosts(db);
check("后台列表包含草稿", all.length === 3, `实际 ${all.length} 条`);

const found = await getPostBySlug(db, "published-two");
check("按 slug 查到文章", found?.title === "已发布二");
check("查不到的 slug 返回 null", (await getPostBySlug(db, "nope")) === null);

check("slug 被占用检测（占用）", await isSlugTaken(db, "published-one"));
check("slug 被占用检测（空闲）", !(await isSlugTaken(db, "brand-new")));
check(
  "排除自己后不算占用",
  !(await isSlugTaken(db, "published-one", pub1.id))
);

const updated = await updatePost(db, draft.id, { status: "published" });
check("草稿改为已发布时补上发布时间", updated?.publishedAt instanceof Date);
check("status 已变更", updated?.status === "published");

const beforeUpdate = await getPostBySlug(db, "published-two");
await new Promise(r => setTimeout(r, 10));
const afterUpdate = await updatePost(db, pub2.id, { title: "改过的标题" });
check("标题已更新", afterUpdate?.title === "改过的标题");
check(
  "updatedAt 自动刷新",
  (afterUpdate?.updatedAt.getTime() ?? 0) > (beforeUpdate?.updatedAt.getTime() ?? 0)
);

check("更新不存在的 id 返回 null", (await updatePost(db, 99999, { title: "x" })) === null);

check("删除成功返回 true", await deletePost(db, pub2.id));
check("重复删除返回 false", !(await deletePost(db, pub2.id)));

/* ============================================================
 * slug 唯一约束
 * ========================================================== */
console.log("\n=== 唯一约束 ===");
try {
  await createPost(db, {
    slug: "published-one",
    title: "重复 slug",
    body: "",
    tags: [],
  });
  check("重复 slug 应该被拒绝", false, "居然插入成功了");
} catch (error) {
  check(
    "重复 slug 被数据库拒绝",
    errorChainContains(error, "posts_slug_unique"),
    error instanceof Error ? error.message.split("\n")[0] : String(error)
  );
}

/* ============================================================
 * 用户相关测试已移除
 * ============================================================
 * 登录改用 Better Auth 的无状态模式（见 src/lib/auth.ts）：
 * 登录状态存在加密 Cookie 里，服务端验证时不查数据库，
 * 所以 users 表和它的仓库函数都不存在了。
 *
 * 这部分逻辑现在由 Better Auth 负责，它有自己的测试，
 * 我们不需要重复测一遍。
 * ========================================================== */

/* ============================================================
 * 数据库层的检查约束
 * ========================================================== */
console.log("\n=== 检查约束（数据库层挡住矛盾数据）===");

try {
  await createPost(db, {
    slug: "bad-post",
    title: "已发布但没有发布时间",
    body: "",
    tags: [],
    status: "published",
    // publishedAt 故意不传 —— 仓库函数会自动补上，所以这里绕过仓库直接写库
  });
  // 仓库会自动补时间，所以这条应该成功（这正是它的作用）
  check("仓库自动补发布时间，所以正常", true);
} catch {
  check("仓库自动补发布时间，所以正常", false, "不该失败");
}

// 直接写库，绕过仓库的自动补全逻辑，验证约束真的生效
try {
  await db.insert(schema.posts).values({
    slug: "constraint-test",
    title: "绕过仓库直接插入",
    status: "published",
    publishedAt: null,
  });
  check("已发布但无发布时间应被数据库拒绝", false, "居然插进去了");
} catch (error) {
  check(
    "已发布但无发布时间被拒绝",
    errorChainContains(error, "posts_published_requires_date"),
    error instanceof Error ? error.message.split("\n")[0] : String(error)
  );
}

// 草稿不需要发布时间，应该能正常插入
const draftOk = await db
  .insert(schema.posts)
  .values({ slug: "draft-ok", title: "草稿", status: "draft" })
  .returning();
check("草稿允许没有发布时间", draftOk.length === 1);

/* ============================================================
 * 结果
 * ========================================================== */
await client.close();

console.log(`\n${"=".repeat(50)}`);
console.log(`通过 ${passed} 项，失败 ${failed.length} 项`);
if (failed.length > 0) {
  console.log("失败项：");
  failed.forEach(name => console.log(`  - ${name}`));
  process.exit(1);
}
console.log("🎉 数据层全部正常");
