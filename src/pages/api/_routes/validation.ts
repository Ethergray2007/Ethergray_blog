/**
 * 请求数据校验
 * ============================================================
 * 用 typebox 定义校验规则 —— 它正是 Elysia 内部使用的库，
 * 所以不用在"用哪个校验库"上做选择，写法也和 Elysia 的示例一致。
 *
 * ⚠️ 注意：`@sinclair/typebox` **没有**写在 package.json 的 dependencies 里，
 *   它是 elysia 带进来的传递依赖（elysia 声明的是宽范围
 *   ">= 0.34.0 < 1"）。也就是说这份 import 能用，靠的是"elysia 一直带着它"
 *   这个事实，而不是我们自己的声明。
 *
 * 【为什么不用 Elysia 的 `body: t.Object(...)`】
 * 因为那样校验会发生在**处理函数之前**，导致一个问题：
 *   未登录的人提交一份缺字段的数据，会先收到 422「字段不对」，
 *   而不是 401「请先登录」。
 *   这既不符合语义，也泄露了"这个接口需要哪些字段"。
 *
 * 现在校验放在处理函数内部、鉴权之后执行：
 *   未登录 → 401（一个字的业务信息都不透露）
 *   已登录但数据不对 → 422（这时才告诉他哪里错了）
 *
 * 代价是要自己写一行 `if (!Value.Check(...))`，
 * 换来的是错误顺序可控。
 *
 * 【那 guard + resolve 也解决不了这个问题】
 * 它们是 Elysia 官方推荐的"消除重复鉴权"写法（每个 handler 里少写一行
 * 检查），但对本项目同一个理由不成立：
 *   guard 的作用是"一次声明、多个路由共用"，而它声明的 schema 与
 *   resolve 的时机都在校验之后 —— 想用它做鉴权，校验就会先跑。
 *   结果还是未登录的人收到 422。
 * 所以"每个处理函数自己检查登录"不是将就，是**为了 401 优先于 422**
 * 的有意选择。技能文档（elysiajs/references/route.md）把 resolve 写成
 * 最佳实践，那是通用场景的建议，不适用于这里的顺序要求。
 * ============================================================
 */
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/* ------------------------------------------------------------------
 * 新建文章：标题必填
 * ----------------------------------------------------------------- */
export const createPostSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  body: Type.Optional(Type.String()),
  tags: Type.Optional(
    Type.Array(Type.String({ maxLength: 50 }), { maxItems: 20 })
  ),
  status: Type.Optional(Type.String()),
  featured: Type.Optional(Type.Boolean()),
  slug: Type.Optional(Type.String({ maxLength: 200 })),
});

export type CreatePostBody = Static<typeof createPostSchema>;

/* ------------------------------------------------------------------
 * 修改文章：全部字段可选
 *
 * 用 Type.Partial 从新建的规则推导出来，而不是重抄一遍 ——
 * 以后改字段时只改一处，两边不会不一致。
 * ----------------------------------------------------------------- */
export const updatePostSchema = Type.Partial(createPostSchema);

export type UpdatePostBody = Static<typeof updatePostSchema>;

/* ------------------------------------------------------------------
 * 校验工具
 * ----------------------------------------------------------------- */

/**
 * 判断是不是"普通的对象"。
 *
 * 为什么要单独判断：
 *   JSON.parse("null")、JSON.parse("[1,2]")、JSON.parse('"abc"')
 *   都是合法的 JSON，但都不是我们期望的请求体。
 *   直接丢给 Value.Check 虽然也会返回 false，但拿不到有意义的错误信息。
 */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 取得请求体（已解析成对象）。
 *
 * 【为什么要写成"优先用 ctx.body"】
 * 实测 Elysia 在 Astro 运行时里会自动解析 JSON 请求体放进 ctx.body，
 * 同时把 request.body 标记为已消费。这时如果自己去读 request，会拿到：
 *
 *     Body is unusable: Body has already been read
 *
 * 而在纯 node 环境直接调用 app.handle() 时，ctx.body 是 undefined、
 * request.body 也还没被读 —— 这时才需要自己读。
 *
 * 所以两种来源都要支持。用 request.bodyUsed 判断，而不是猜。
 *
 * 【为什么不干脆声明 body: t.Object(...) 让 Elysia 校验】
 * 那样校验会发生在处理函数**之前**：未登录的人提交缺字段的数据，
 * 会先收到 422「字段不对」而不是 401「请先登录」——
 * 语义不对，还泄露了这个接口需要哪些字段。
 */
export async function readJsonBody(
  request: Request,
  preParsedBody?: unknown
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  // 情况一：body 已经被上层读过了
  if (request.bodyUsed) {
    return { ok: true, data: preParsedBody ?? {} };
  }

  // 情况二：还没读过，自己读
  const text = await request.text();

  // 空 body 当成空对象，这样"全部字段可选"的 PATCH 请求不用额外处理
  if (text.trim().length === 0) {
    return { ok: true, data: {} };
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, error: "请求体不是合法的 JSON。" };
  }
}

/**
 * 校验数据，失败时返回一句给用户看的中文说明。
 *
 * @param schema typebox 定义的规则
 * @param data   要校验的数据
 * @returns 通过返回 null；不通过返回错误描述
 */
export function validate(schema: TSchema, data: unknown): string | null {
  if (!isPlainObject(data)) {
    return "请求体必须是一个 JSON 对象。";
  }

  if (Value.Check(schema, data)) {
    return null;
  }

  /**
   * 拼出一句人话。
   *
   * Value.Errors 会给出每个字段的问题，形如
   *   { path: "/title", message: "Expected required property" }
   * 这里把路径和原因拼起来，方便定位。
   * 英文的 message 保留原样 —— 它是给开发者看的，
   * 前面那句中文已经够用户理解"哪里填错了"。
   */
  const problems = [...Value.Errors(schema, data)]
    .slice(0, 3)
    .map(error => `${error.path || "/"} ${error.message}`);

  return `提交的数据格式不对：${problems.join("；")}`;
}
