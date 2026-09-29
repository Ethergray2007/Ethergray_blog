/**
 * 通用替身：Astro 虚拟模块在 node 环境下的占位实现
 * ============================================================
 * 用途是让 `node xxx.ts` 能加载 src/utils 里的函数 ——
 * 这些函数按 Astro 的写法导入依赖，但真正要用到的往往只有几个纯函数。
 *
 * 这些替身**不追求行为正确**，只保证"能加载、不报错"。
 * 所以用它跑出来的结果只能验证纯逻辑，
 * 不能验证跟站点配置相关的行为（比如按配置过滤文章）。
 *
 * 由 practice/node-ts-hook.mjs 在解析 astro:* 时指向本文件。
 */

/** astro:env/client 的替身：PUBLIC_* 配置项，取不到就是空字符串 */
export const PUBLIC_GOOGLE_SITE_VERIFICATION = "";

/** astro:content 的替身。源码里这些基本都是 import type，运行时用不到 */
export const getCollection = async () => [];
export const getEntry = async () => undefined;
export const render = async () => ({ Content: null });
export const defineCollection = value => value;
