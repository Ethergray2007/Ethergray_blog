/**
 * 第 7 课答案
 * ============================================================
 */

import { posts, type Post } from "../data.ts";

export const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/* ------------------------------------------------------------
 * 知识点 1：async 函数
 *
 * 函数加 async 之后，返回类型必须写成 Promise<T>。
 * 但函数体里 return 的还是普通值 —— Promise 是自动包上的。
 *
 * 这也是为什么调用它的时候必须 await：
 *   const list = await fetchPosts();
 * 不 await 的话拿到的是 Promise 对象，不是数组。
 * ---------------------------------------------------------- */
export async function fetchPosts(): Promise<Post[]> {
  await delay(20);
  return posts;
}

/* ------------------------------------------------------------
 * 知识点 2：try / catch
 *
 * 真实项目里 fetch 会失败：断网、超时、返回 500…
 * 不处理的话错误会往上冒，页面直接白屏。
 *
 * 注意 catch 后面没写参数 —— 现代 JS 允许省略，
 * 因为大多数时候你只关心"失败了"，不关心具体错误对象。
 *
 * 返回值的设计也值得注意：
 *   { ok: true; data } 和 { ok: false; error } 是两种不同的类型，
 *   调用方写 if (result.ok) 之后，TS 就知道 result.data 一定存在。
 *   这和第 5 课的判别联合是同一个思路。
 * ---------------------------------------------------------- */
export async function safeFetchPosts(): Promise<
  { ok: true; data: Post[] } | { ok: false; error: string }
> {
  try {
    const data = await fetchPosts();
    return { ok: true, data };
  } catch {
    return { ok: false, error: "拿不到文章" };
  }
}

/* ------------------------------------------------------------
 * 知识点 3：Promise.all 并行
 *
 * 串行（一个个 await）耗时相加：
 *   await 1秒 + await 1秒 + await 1秒 = 3 秒
 *
 * 并行（Promise.all）取最慢的那个：
 *   await Promise.all([1秒, 1秒, 1秒]) = 1 秒
 *
 * 参数类型写成元组 `[Promise<number>, Promise<number>, Promise<number>]`
 * 而不是 `Promise<number>[]`，是为了让返回值也能精确推导成
 * 长度为 3 的数字数组。
 *
 * 补充：只要有一个失败，Promise.all 就整体失败并抛错，
 * 适合"都要成功才行"的场景。
 * ---------------------------------------------------------- */
export async function waitForAll(
  tasks: [Promise<number>, Promise<number>, Promise<number>]
): Promise<number[]> {
  return Promise.all(tasks);
}
