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
import { API_ERROR } from "../../../lib/api-errors.ts";
import {
  notifyNetlifyRebuild,
  type NotifyRebuild,
  type RebuildOutcome,
} from "../../../lib/rebuild.ts";
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
 * slug 的长度上限，要和数据库那列对齐（src/db/schema.ts 里的 varchar(200)）。
 *
 * ⚠️ 校验层只能管住**输入**长度，管不住**转换后**的长度 ——
 *   slugify 里有几处替换是变长的，倍率不小。实测（node 里跑出来的）：
 *
 *     "%"  → "percent"    1 → 7
 *     "$"  → "dollar"     1 → 6
 *     "&"  → "and"        1 → 3
 *     "|"  → "or"         1 → 2
 *
 *   所以 "&".repeat(200) 这串**合法输入**（恰好 200 字符，能通过校验）
 *   会变成 600 字符的 slug，插入时数据库报
 *   "value too long for type character varying(200)"，
 *   接口回 500 而不是 422。
 *
 *   所以在出口这里截断。
 */
const POST_SLUG_MAX_LENGTH = 200;

/**
 * 把标题转成可用的 slug。
 *
 * 中文标题会被 slugifyStr 保留成中文（所以网址里能直接看到中文）。
 * 转出来是空串时兜底成 "post"，避免生成 /posts// 这种坏网址。
 */
function toSlug(input: string): string {
  const slug = slugifyStr(input.trim());

  if (slug.length === 0) {
    return "post";
  }

  /*
   * 按**码点**截断而不是 .slice()：
   *   .slice() 数的是 UTF-16 码元，正好切在 emoji 中间会留下半个代理对，
   *   Array.from() 按码点切就不会。对一个允许中文的 slug 来说这不是理论问题。
   */
  return Array.from(slug).slice(0, POST_SLUG_MAX_LENGTH).join("");
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
  /**
   * ⚠️ 不能直接 Number() —— 它太宽容了：
   *      Number("0x10") === 16     Number("1e2") === 100
   *      Number("1.0")  === 1      Number(" 3 ") === 3
   *    这些全都通过 Number.isInteger，于是 /api/posts/0x10 不是回 400，
   *    而是**命中第 16 篇真实文章** —— 改错、删错都从这里来。
   *
   * 所以先卡一道"只能是十进制数字"的格式，再转数字。
   */
  if (!/^\d+$/.test(raw ?? "")) {
    return null;
  }

  const id = Number(raw);

  return id > 0 ? id : null;
}

/**
 * 这次改动会不会让**站点上该有哪些页面**发生变化？
 *
 * 【为什么问的是这个，而不是"内容变了没有"】
 *   Netlify 免费套餐**每次生产部署花 15 积分**（一个月 300），
 *   乱触发等于把上线次数烧掉。所以自动重建只留给"不重建就是错的"
 *   那几种情况：
 *
 *     新建并直接发布 / 草稿→已发布    站点上要**多**一个页面  → 重建
 *     已发布→草稿 / 删除已发布的文章   站点上要**少**一个页面  → 重建
 *     改已发布文章的正文、标题、标签    页面还在，只是内容旧了  → 不自动，
 *                                                        交给后台的「立即重建」按钮
 *     草稿之间的来回改                 站点上本来就看不到      → 不触发
 *
 *   第三类是最烧积分的：改五遍错别字就自动建五次 = 75 积分，
 *   而按一次按钮只花 15 分。
 *
 * 【三个分支不能合并成 `before !== after`】
 *   那样"新建一篇草稿"（null → draft）也会算成变化 —— 但它不该重建。
 *
 * @param before 改动前的发布状态。null 表示这是新建
 * @param after  改动后的发布状态。null 表示这是删除
 */
function changesPublicationStatus(
  before: string | null,
  after: string | null
): boolean {
  // 新建：只有"直接发布"才要重建，建草稿不用（站点上看不到）
  if (before === null) {
    return after === POST_STATUS.published;
  }

  // 删除：只有删掉的是已发布文章才要重建，删草稿不用
  if (after === null) {
    return before === POST_STATUS.published;
  }

  // 修改：发布状态变了才重建。改正文/标题/标签不算 ——
  // 那种情况请用后台的「立即重建」按钮
  return before !== after;
}

export function postRoutes(
  resolveUser: ResolveUser = resolveUserFromSession,
  notifyRebuild: NotifyRebuild = notifyNetlifyRebuild
) {
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
          return {
            error: "文章 id 必须是正整数。",
            code: API_ERROR.badRequest,
          };
        }

        const post = await getPostById(db, id);

        if (!post) {
          set.status = 404;
          return { error: "找不到该文章。", code: API_ERROR.notFound };
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
          return { error: parsed.error, code: API_ERROR.badRequest };
        }

        const invalid = validate(createPostSchema, parsed.data);

        if (invalid) {
          set.status = 422;
          return { error: invalid, code: API_ERROR.badRequest };
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
            code: API_ERROR.slugTaken,
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

        /**
         * 先写库，再通知重建 —— 顺序不能反。
         *
         * 反过来的话，Netlify 可能在数据还没落库时就开始构建，
         * 那次构建出来的页面就少一篇文章（而且没人会发现）。
         *
         * rebuild 这个字段会回给前端：后台据此决定提示哪句话 ——
         * "已请求重建" 还是 "要上线得点「立即重建」"。
         * 让前端自己推断（比如"状态没变就是没重建"）等于把规则抄两份，
         * 早晚会不一致。
         */
        let rebuild: RebuildOutcome | null = null;

        if (changesPublicationStatus(null, post.status)) {
          rebuild = await notifyRebuild(`新建了《${post.title}》`);
        }

        set.status = 201;

        return { post, rebuild };
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
          return {
            error: "文章 id 必须是正整数。",
            code: API_ERROR.badRequest,
          };
        }

        // 鉴权过了才读和校验数据。ctx.body 的说明见 POST /posts 那段注释
        const parsed = await readJsonBody(request, ctx.body);

        if (!parsed.ok) {
          set.status = 400;
          return { error: parsed.error, code: API_ERROR.badRequest };
        }

        const invalid = validate(updatePostSchema, parsed.data);

        if (invalid) {
          set.status = 422;
          return { error: invalid, code: API_ERROR.badRequest };
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

        /**
         * 后台的「网址标识」是**每次保存都跟着表单一起发**的（留空时发空串），
         * 而它的提示文案承诺的是"留空就根据标题自动生成"。
         *
         * ⚠️ 踩过的坑：原来这里直接 toSlug(body.slug)，而 toSlug("") 的兜底值
         *   是 "post" —— 于是"清空 slug 再保存"不是按标题重新生成，
         *   而是把网址**静默改成 /posts/post**，旧链接全部 404。
         *
         * 现在和 POST 的处理对齐：
         *   填了   → 用它
         *   留空   → 用（新的）标题生成
         *   都没有 → 删掉这个字段，也就是"不改"，而不是塞个兜底值进去
         */
        if (body.slug !== undefined) {
          const requested = body.slug.trim();

          if (requested) {
            body.slug = toSlug(requested);
          } else if (body.title?.trim()) {
            body.slug = toSlug(body.title);
          } else {
            delete body.slug;
          }
        }

        // 这次要改 slug 的话，得确认没和别的文章撞车
        if (body.slug !== undefined) {
          if (await isSlugTaken(db, body.slug, id)) {
            set.status = 409;
            return {
              error: `网址标识「${body.slug}」已被占用。`,
              code: API_ERROR.slugTaken,
            };
          }
        }

        /**
         * 先记下改之前的状态，用来判断"要不要重建"。
         *
         * 多这一次查询是必要的：把一篇已发布的文章收回成草稿时，
         * 返回的文章是草稿，只看它就会以为"站点上看不出变化" ——
         * 而线上那篇旧文章其实还在。
         */
        const before = await getPostById(db, id);

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
          return { error: "找不到该文章。", code: API_ERROR.notFound };
        }

        let rebuild: RebuildOutcome | null = null;

        if (changesPublicationStatus(before?.status ?? null, post.status)) {
          rebuild = await notifyRebuild(
            post.status === POST_STATUS.published
              ? `发布了《${post.title}》`
              : `下线了《${post.title}》`
          );
        }

        return { post, rebuild };
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
          return {
            error: "文章 id 必须是正整数。",
            code: API_ERROR.badRequest,
          };
        }

        /* 和 PATCH 一样，先记下删之前的状态：已发布的文章删掉后要从站点上消失 */
        const before = await getPostById(db, id);

        const deleted = await deletePost(db, id);

        if (!deleted) {
          set.status = 404;
          return { error: "找不到该文章。", code: API_ERROR.notFound };
        }

        let rebuild: RebuildOutcome | null = null;

        if (changesPublicationStatus(before?.status ?? null, null)) {
          rebuild = await notifyRebuild(`删除了《${before?.title ?? id}》`);
        }

        return { ok: true, rebuild };
      })

      /** -------------------------------------------------------
       * 手动触发重建  POST /api/rebuild
       *
       * 【为什么需要这个接口】
       *   自动重建只在"站点上该有哪些页面"变化时才触发（见上面的
       *   changesPublicationStatus）。改一篇**已发布**文章的错别字
       *   属于"页面还在、内容旧了"，不会自动重建 ——
       *   因为 Netlify 免费套餐每次生产部署要 15 积分，
       *   改五遍错别字就自动建五次太贵了。
       *
       *   所以那种情况由作者看完满意了，自己按后台的「立即重建」按钮。
       *
       * 【为什么把结果返回给前端】
       *   没配 NETLIFY_BUILD_HOOK_URL 时，触发是"成功"了但什么都不会发生。
       *   必须如实告诉作者，否则他会一直刷新等一个不会来的部署。
       * ----------------------------------------------------- */
      .post("/rebuild", async rawCtx => {
        const user = await requireUser(rawCtx);

        if (!user) {
          return unauthorized();
        }

        const outcome = await notifyRebuild("后台手动重建");

        return { outcome };
      })
  );
}
