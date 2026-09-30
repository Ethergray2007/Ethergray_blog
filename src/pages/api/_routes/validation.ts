/**
 * 请求数据校验
 * ============================================================
 * 用 typebox 定义校验规则 —— 它正是 Elysia 内部使用的库，
 * 所以不引入新的依赖，写法也一致。
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
 * ============================================================
 */
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/* ------------------------------------------------------------------
 * 登录
 * ----------------------------------------------------------------- */
export const loginSchema = Type.Object({
  username: Type.String({ minLength: 1, maxLength: 64 }),
  password: Type.String({ minLength: 1, maxLength: 200 }),
});

export type LoginBody = Static<typeof loginSchema>;

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
 * 读取并解析请求体。
 *
 * 【为什么自己读，不用 Elysia 的 ctx.body】
 * Elysia 只在声明了 `body: t.Object(...)` 时才解析请求体。
 * 而声明它会让校验发生在**处理函数之前**，于是未登录的人会先收到
 * 422「字段不对」而不是 401「请先登录」—— 顺序不对，还泄露了字段要求。
 *
 * 改成自己读之后：三行代码，什么时候解析、解析失败怎么回，
 * 全部由我们决定。
 *
 * @returns 成功返回 { ok: true, data }；失败返回 { ok: false, error }
 */
export async function readJsonBody(
  request: Request
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
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
