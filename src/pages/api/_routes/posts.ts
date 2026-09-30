/**
 * 文章管理路由（全部需要登录）
 * ============================================================
 * 这个文件只负责 HTTP 层的事：解析请求、判断权限、决定状态码。
 * 真正的数据库操作在 src/db/repositories/posts.ts 里 ——
 * 那边是纯函数，已经单独测试过了。
 *
 * 分层的好处在这里很明显：
 *   要改"文章怎么存" → 只动仓库层，这个文件不用改
 *   要改"谁能操作"   → 只动守卫，仓库层不用改
 * ============================================================
 */
import { Elysia } from "elysia";

import {
  createPost,
  deletePost,
  getPostById,
  isSlugTaken,
  listAllPosts,
  updatePost,
} from "../../../db/repositories/posts.ts";
import { POST_STATUS } from "../../../db/schema.ts";
import { slugifyStr } from "../../../utils/slugify.ts";

import {
  resolveUserFromSession,
  unauthorized,
  type ResolveUser,
} from "./auth.ts";
import { asContext } from "./context.ts";
import {
  createPostSchema,
  readJsonBody,
  updatePostSchema,
  validate,
} from "./validation.ts";

/**
 * 把标题转成可用的 slug。
 *
 * 中文标题会被 slugifyStr 保留成中文（所以网址里能直接看到中文）。
 * 转出来是空串时兜底成 "post"，避免生成 /posts// 这种坏网址。
 */
function toSlug(input: string): string {
  const slug = slugifyStr(input.trim());

  return slug.length > 0 ? slug : "post";
}

/** 校验 status 是不是允许的取值 */
function isPostStatus(value: unknown): value is "draft" | "published" {
  return value === POST_STATUS.draft || value === POST_STATUS.published;
}

/**
 * 解析并校验路径里的 id。
 *
 * @returns 合法返回数字；不合法返回 null（由调用方回 400）
 */
function parseId(raw: string | undefined): number | null {
  const id = Number(raw);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export function postRoutes(resolveUser: ResolveUser = resolveUserFromSession) {
  /**
   * 取当前登录用户，未登录返回 null。
   *
   * 【为什么每个处理函数自己调一次，而不是用 onBeforeHandle 统一拦截】
   * 我原本用 onBeforeHandle 做全局守卫，遇到两个问题：
   *   1. 数据校验发生在守卫之前，未登录时会先收到 422（"字段不对"）
   *      而不是 401（"请先登录"）—— 语义不对，还泄露了字段要求
   *   2. ctx.cookie 在部分路径下是 undefined，行为不可预测
   *
   * 现在每个处理函数第一行就取一次用户，没有框架的隐式规则。
   * 代价是每个函数多一行，换来的是"扫一眼就知道有没有鉴权"。
   */
  async function requireUser(rawCtx: unknown) {
    return resolveUser(asContext(rawCtx));
  }

  return (
    new Elysia({ name: "posts" })
      /** -------------------------------------------------------
       * 列出全部文章（含草稿）  GET /api/posts
       * ----------------------------------------------------- */
      .get("/posts", async rawCtx => {
        const user = await requireUser(rawCtx);

        if (!user) {
          return unauthorized();
        }

        const { db } = asContext(rawCtx);
        const rows = await listAllPosts(db);

        return { posts: rows };
      })

      /** -------------------------------------------------------
       * 看单篇  GET /api/posts/:id
       *
       * 后台按 id 编辑（这样改 slug 时链接不会失效）。
       * ----------------------------------------------------- */
      .get("/posts/:id", async rawCtx => {
        const user = await requireUser(rawCtx);

        if (!user) {
          return unauthorized();
        }

        const { db, set, params } = asContext(rawCtx);
        const id = parseId(params.id);

        if (id === null) {
          set.status = 400;
          return { error: "文章 id 必须是正整数。", code: "BAD_REQUEST" };
        }

        const post = await getPostById(db, id);

        if (!post) {
          set.status = 404;
          return { error: "找不到该文章。", code: "NOT_FOUND" };
        }

        return { post };
      })

      /** -------------------------------------------------------
       * 新建  POST /api/posts
       * ----------------------------------------------------- */
      .post("/posts", async rawCtx => {
        const user = await requireUser(rawCtx);

        if (!user) {
          return unauthorized();
        }

        const { db, request, set } = asContext(rawCtx);

        /**
         * 鉴权过了才读和校验数据 —— 未登录的人不该知道这个接口要哪些字段。
         *
         * 第二个参数传 ctx.body：Elysia 在 Astro 运行时里可能已经解析过
         * 请求体了（那时 request.bodyUsed 已经是 true），必须用它的结果，
         * 否则会报 "Body has already been read"。
         */
        const parsed = await readJsonBody(request, asContext(rawCtx).body);

        if (!parsed.ok) {
          set.status = 400;
          return { error: parsed.error, code: "BAD_REQUEST" };
        }

        const invalid = validate(createPostSchema, parsed.data);

        if (invalid) {
          set.status = 422;
          return { error: invalid, code: "BAD_REQUEST" };
        }

        const body = parsed.data as {
          title: string;
          description?: string;
          body?: string;
          tags?: string[];
          status?: string;
          featured?: boolean;
          slug?: string;
        };

        const slug = body.slug?.trim() ? toSlug(body.slug) : toSlug(body.title);

        /**
         * slug 必须唯一，否则两篇文章会抢同一个网址。
         * 数据库层有唯一索引兜底，但这里先查一次，
         * 能返回一句人话而不是把数据库报错抛给用户。
         */
        if (await isSlugTaken(db, slug)) {
          set.status = 409;
          return {
            error: `网址标识「${slug}」已被占用，换一个或清空让它自动生成。`,
            code: "SLUG_TAKEN",
          };
        }

        const post = await createPost(db, {
          slug,
          title: body.title,
          description: body.description ?? "",
          body: body.body ?? "",
          tags: body.tags ?? [],
          status: isPostStatus(body.status) ? body.status : POST_STATUS.draft,
          featured: body.featured ?? false,
        });

        set.status = 201;

        return { post };
      })

      /** -------------------------------------------------------
       * 修改  PATCH /api/posts/:id
       *
       * 用 PATCH 而不是 PUT：PATCH 表示"只改我给的字段"，
       * PUT 表示"用我给的整体替换"。后台是局部保存，所以用 PATCH。
       * ----------------------------------------------------- */
      .patch("/posts/:id", async rawCtx => {
        const user = await requireUser(rawCtx);

        if (!user) {
          return unauthorized();
        }

        const ctx = asContext(rawCtx);
        const { db, request, set, params } = ctx;
        const id = parseId(params.id);

        if (id === null) {
          set.status = 400;
          return { error: "文章 id 必须是正整数。", code: "BAD_REQUEST" };
        }

        // 鉴权过了才读和校验数据。ctx.body 的说明见 POST /posts 那段注释
        const parsed = await readJsonBody(request, ctx.body);

        if (!parsed.ok) {
          set.status = 400;
          return { error: parsed.error, code: "BAD_REQUEST" };
        }

        const invalid = validate(updatePostSchema, parsed.data);

        if (invalid) {
          set.status = 422;
          return { error: invalid, code: "BAD_REQUEST" };
        }

        const body = parsed.data as Partial<{
          title: string;
          description: string;
          body: string;
          tags: string[];
          status: string;
          featured: boolean;
          slug: string;
        }>;

        // 这次要改 slug 的话，得确认没和别的文章撞车
        if (body.slug !== undefined) {
          const nextSlug = toSlug(body.slug);

          if (await isSlugTaken(db, nextSlug, id)) {
            set.status = 409;
            return {
              error: `网址标识「${nextSlug}」已被占用。`,
              code: "SLUG_TAKEN",
            };
          }

          body.slug = nextSlug;
        }

        /**
         * 只把"确实传了的字段"交给仓库层。
         * 直接传 undefined 会把字段更新成 NULL，那是覆盖而不是局部修改。
         */
        const post = await updatePost(db, id, {
          ...(body.title !== undefined && { title: body.title }),
          ...(body.description !== undefined && {
            description: body.description,
          }),
          ...(body.body !== undefined && { body: body.body }),
          ...(body.tags !== undefined && { tags: body.tags }),
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.featured !== undefined && { featured: body.featured }),
          ...(isPostStatus(body.status) && { status: body.status }),
        });

        if (!post) {
          set.status = 404;
          return { error: "找不到该文章。", code: "NOT_FOUND" };
        }

        return { post };
      })

      /** -------------------------------------------------------
       * 删除  DELETE /api/posts/:id
       * ----------------------------------------------------- */
      .delete("/posts/:id", async rawCtx => {
        const user = await requireUser(rawCtx);

        if (!user) {
          return unauthorized();
        }

        const { db, set, params } = asContext(rawCtx);
        const id = parseId(params.id);

        if (id === null) {
          set.status = 400;
          return { error: "文章 id 必须是正整数。", code: "BAD_REQUEST" };
        }

        const deleted = await deletePost(db, id);

        if (!deleted) {
          set.status = 404;
          return { error: "找不到该文章。", code: "NOT_FOUND" };
        }

        return { ok: true };
      })
  );
}
