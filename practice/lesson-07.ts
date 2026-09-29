/**
 * 第 7 课：异步与 Promise
 * ============================================================
 *
 * 目标：搞懂 async / await，以及"返回值是 Promise"意味着什么。
 *
 * 为什么要学这个？
 *   你博客下一步要接后端 API，到时候全是这种代码：
 *     const res = await fetch("/api/posts");
 *     const data = await res.json();
 *   fetch 返回的就是 Promise。
 *
 * 三句话理解 Promise：
 *   1. Promise<T> 表示"现在还没有，但将来会有一个 T"
 *   2. await 就是"等它到手再往下走"
 *   3. async 函数永远返回 Promise，即使你写的是 return 42
 *
 * 对应你项目里的真实代码：
 *   src/pages/og.png.ts 里的 await Promise.all([...])
 *
 * ------------------------------------------------------------
 * 任务：补完 3 个 TODO，然后 npm run learn:check
 * ============================================================
 */

import { posts, type Post } from "./data.ts";

/** 小工具：等一会儿（模拟网络延迟）—— 这行不用改 */
export const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/* ------------------------------------------------------------
 * TODO 1：实现 fetchPosts
 *
 * 模拟"从接口拿文章列表"：
 *   1. 先 await delay(20) 模拟网络耗时
 *   2. 然后返回 posts
 *
 * 注意返回类型要写 Promise<Post[]>，不是 Post[]。
 * 因为函数是 async 的，返回值会被包一层 Promise。
 * ---------------------------------------------------------- */
export async function fetchPosts(): Promise<Post[]> {
  // 在这里写
  return [];
}

/* ------------------------------------------------------------
 * TODO 2：实现 safeFetchPosts
 *
 * 这一题是学 try / catch —— 真实项目里请求一定会失败，必须处理。
 *
 * 规则：
 *   成功 → 返回 { ok: true;  data: 文章数组 }
 *   失败 → 返回 { ok: false; error: "拿不到文章" }
 *
 * 提示：fetchPosts 现在不会失败，但你要按"它可能失败"来写：
 *
 *   try {
 *     const data = await fetchPosts();
 *     return { ok: true, data };
 *   } catch {
 *     return { ok: false, error: "拿不到文章" };
 *   }
 *
 * 另外注意返回值里有个 `ok` 字段，它的类型是布尔"字面量"：
 *   ok: true  和  ok: false  是两种不同的类型，
 *   这样调用方判断 if (result.ok) 之后就知道 data 一定存在。
 * ---------------------------------------------------------- */
export async function safeFetchPosts(): Promise<
  { ok: true; data: Post[] } | { ok: false; error: string }
> {
  // 把下面这行删掉，换成你的 try / catch
  return { ok: false, error: "" };
}

/* ------------------------------------------------------------
 * TODO 3：实现 waitForAll
 *
 * 同时等好几个 Promise 完成，然后返回结果数组。
 *
 * 提示：用 Promise.all
 *   const [a, b] = await Promise.all([任务1, 任务2]);
 *
 * 为什么不用一个个 await？
 *   一个个 await 是"串行"（总共 3 秒），
 *   Promise.all 是"并行"（总共 1 秒）。
 *
 * 本题要求：传进来 3 个 Promise<number>，返回它们的数字数组。
 * ---------------------------------------------------------- */
export async function waitForAll(
  tasks: [Promise<number>, Promise<number>, Promise<number>]
): Promise<number[]> {
  // 把下面这行删掉，换成 Promise.all
  return [];
}
