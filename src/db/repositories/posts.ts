/**
 * 文章仓库（数据访问层）
 * ============================================================
 * 这一层只做一件事：**和数据库打交道**。
 * 不碰 HTTP、不碰 Astro、不判断权限 —— 那些是上层的事。
 *
 * 为什么每个函数都接收 db 参数，而不是在文件顶部建一个连接：
 *   这样测试时可以塞一个内存数据库（PGlite）进来，
 *   不用真的连线上库，也不会污染数据。
 *   这就是"依赖注入"最简单的一种形式。
 *
 * 约定：
 *   所有返回单条记录的函数，查不到时返回 null（不抛异常）。
 *   "查不到"是正常情况，不是错误；由调用方决定怎么处理。
 * ============================================================
 */
import { and, desc, eq, sql } from "drizzle-orm";

/**
 * 注意这里写了 `.ts` 后缀，和项目其他地方（省略后缀）不一样。
 *
 * 原因是这一层要在 Astro 之外单独跑测试（见 practice/_repo-probe.ts）：
 * Node 直接执行 TS 时不支持省略后缀，会报 MODULE_NOT_FOUND。
 * 写全后缀之后，Astro 构建和 node 脚本两边都能解析。
 */
import type { Db } from "../client.ts";
import { POST_STATUS, posts, type NewPost, type PostRow } from "../schema.ts";

/**
 * 列出已发布的文章，按发布时间从新到旧。
 *
 * @param limit  最多返回几条。不传则全部
 */
export async function listPublishedPosts(
  db: Db,
  limit?: number
): Promise<PostRow[]> {
  const query = db
    .select()
    .from(posts)
    .where(eq(posts.status, POST_STATUS.published))
    /**
     * 排序：发布时间从新到旧。
     *
     * 这里不需要处理 NULL（比如 SQL 的 "nulls last"），
     * 因为 schema.ts 里加了检查约束：
     * **已发布的文章必然有发布时间**，不可能出现 NULL。
     * 把规则放到数据库层，查询就能写得这么简单。
     */
    .orderBy(desc(posts.publishedAt));

  return limit === undefined ? query : query.limit(limit);
}

/**
 * 列出所有文章，包含草稿。给后台管理用。
 */
export async function listAllPosts(db: Db): Promise<PostRow[]> {
  return (
    db
      .select()
      .from(posts)
      // 草稿还没有发布时间，所以排序用"发布时间，没有就退回创建时间"。
      // coalesce 是 SQL 的"取第一个非空值"。
      .orderBy(desc(sql`coalesce(${posts.publishedAt}, ${posts.createdAt})`))
  );
}

/**
 * 按 slug 查单篇文章。
 *
 * @param db
 * @param slug  网址里的标识，例如 "hello-astro"
 * @returns 查不到返回 null
 */
export async function getPostBySlug(
  db: Db,
  slug: string
): Promise<PostRow | null> {
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * 按 id 查单篇文章。
 *
 * 后台是按 id 编辑的（这样改 slug 时链接不会失效），所以需要这个。
 *
 * 为什么不复用"列出全部再过滤"：
 *   那是把所有数据读进内存里筛。现在只有几篇文章看不出差别，
 *   但这是个会随文章数变慢的写法，不值得为了少写几行而留下。
 */
export async function getPostById(db: Db, id: number): Promise<PostRow | null> {
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  return rows[0] ?? null;
}

/**
 * 新建文章。
 *
 * status 为 published 而 publishedAt 为空时，自动补上当前时间 ——
 * 否则文章会"已发布但没有发布时间"，在按时间排序的列表里行为诡异。
 */
export async function createPost(db: Db, input: NewPost): Promise<PostRow> {
  const values: NewPost = { ...input };

  if (values.status === POST_STATUS.published && !values.publishedAt) {
    values.publishedAt = new Date();
  }

  const rows = await db.insert(posts).values(values).returning();

  return rows[0]!;
}

/**
 * 按 slug 新增或更新一篇文章。
 *
 * 只给"把 Markdown 导入数据库"用（scripts/import-posts.ts）。
 * 导入必须能**重复运行** —— 中途出错重跑时，已有的文章应该被更新，
 * 而不是变成两份内容一样的文章。
 *
 * 【为什么不写成"先查再决定插入还是更新"】
 *   那是两次查询加一次判断，而且把"slug 不能重复"这条规则在代码里
 *   又写了一遍（数据库里已经有 posts_slug_unique 唯一索引）。
 *   交给数据库的 ON CONFLICT 一次完成，规则只有一处。
 *
 * 【为什么 createdAt / updatedAt 是必填的】
 *   它们有数据库默认值（now()），但默认值只在**插入**时生效。
 *   走冲突分支（UPDATE）时如果调用方没给，就会把这两列写成 NULL，
 *   或者把"最后修改时间"刷成现在 —— 后者会让同一篇文章导入两次
 *   得到不同的数据，那就不算幂等了。
 *
 * ⚠️ 注意 insert 和 update 两个分支共用同一份 values：
 *   否则容易出现"插入时用了默认值，更新时却写成 NULL"的不一致。
 */
export async function upsertPostBySlug(
  db: Db,
  input: NewPost & { slug: string; createdAt: Date; updatedAt: Date }
): Promise<PostRow> {
  const values: NewPost & { slug: string } = {
    slug: input.slug,
    title: input.title,
    description: input.description ?? "",
    body: input.body ?? "",
    tags: input.tags ?? [],
    status: input.status ?? POST_STATUS.draft,
    featured: input.featured ?? false,
    publishedAt: input.publishedAt ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };

  const rows = await db
    .insert(posts)
    .values(values)
    .onConflictDoUpdate({ target: posts.slug, set: values })
    .returning();

  return rows[0]!;
}

/**
 * 更新文章。
 *
 * 会自动刷新 updatedAt，调用方不用自己传 —— 忘传的话
 * "最后修改时间"就不准了，还不容易发现。
 *
 * @returns 更新后的文章；id 不存在则返回 null
 */
export async function updatePost(
  db: Db,
  id: number,
  changes: Partial<NewPost>
): Promise<PostRow | null> {
  const values: Partial<NewPost> = {
    ...changes,
    updatedAt: new Date(),
  };

  // 从草稿改成已发布时，补上发布时间
  if (values.status === POST_STATUS.published) {
    const existing = await db
      .select({ publishedAt: posts.publishedAt })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (existing[0] && !existing[0].publishedAt && !values.publishedAt) {
      values.publishedAt = new Date();
    }
  }

  const rows = await db
    .update(posts)
    .set(values)
    .where(eq(posts.id, id))
    .returning();

  return rows[0] ?? null;
}

/**
 * 删除文章。
 *
 * @returns 删掉了返回 true；id 不存在返回 false
 */
export async function deletePost(db: Db, id: number): Promise<boolean> {
  const rows = await db.delete(posts).where(eq(posts.id, id)).returning({
    id: posts.id,
  });

  return rows.length > 0;
}

/**
 * 判断某个 slug 是否已被占用。
 *
 * 编辑文章时如果没改 slug，它当然会"被自己占用"，
 * 所以可以传 excludeId 把当前文章排除掉。
 */
export async function isSlugTaken(
  db: Db,
  slug: string,
  excludeId?: number
): Promise<boolean> {
  const where =
    excludeId === undefined
      ? eq(posts.slug, slug)
      : and(eq(posts.slug, slug), sql`${posts.id} <> ${excludeId}`);

  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(where)
    .limit(1);

  return rows.length > 0;
}
