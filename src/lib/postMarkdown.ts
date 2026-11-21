/**
 * 动态文章正文渲染
 * ============================================================
 * 想删除：先替换文章页的渲染调用，再删除本文件及 README 登记。
 * 只缓存编译结果，不缓存公开状态；读正文前仍须查询数据库，已下线文章不能靠旧缓存复活。
 * ============================================================
 */
import { createHash } from "node:crypto";
import type { MarkdownHeading } from "@astrojs/markdown-remark";
import { markdownConfig } from "./markdownConfig.ts";

export type RenderedPostMarkdown = {
  html: string;
  headings: MarkdownHeading[];
};
const MAX_ENTRIES = 64;
const MAX_BYTES = 8 * 1024 * 1024;
const cache = new Map<string, { value: RenderedPostMarkdown; bytes: number }>();
let cacheBytes = 0;
let renderer:
  | ReturnType<typeof markdownConfig.processor.createRenderer>
  | undefined;

export async function renderPostMarkdown(
  body: string
): Promise<RenderedPostMarkdown> {
  const key = createHash("sha256").update(body).digest("hex");
  const existing = cache.get(key);
  if (existing) {
    cache.delete(key);
    cache.set(key, existing);
    return existing.value;
  }

  renderer ??= markdownConfig.processor.createRenderer(markdownConfig);
  const rendered = await (await renderer).render(body);
  // 并发请求可能在等待编译时已经填入同一内容，避免重复计入缓存大小。
  const concurrent = cache.get(key);
  if (concurrent) return concurrent.value;
  const value = { html: rendered.code, headings: rendered.metadata.headings };
  const bytes =
    Buffer.byteLength(body) +
    Buffer.byteLength(value.html) +
    Buffer.byteLength(JSON.stringify(value.headings));
  // 巨型文章不进入缓存，避免一篇内容挤满整个函数实例的内存。
  if (bytes <= MAX_BYTES) {
    while (cache.size >= MAX_ENTRIES || cacheBytes + bytes > MAX_BYTES) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cacheBytes -= cache.get(oldest)!.bytes;
      cache.delete(oldest);
    }
    cache.set(key, { value, bytes });
    cacheBytes += bytes;
  }
  return value;
}
