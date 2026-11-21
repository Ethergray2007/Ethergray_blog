/**
 * 数据库文章行 → 页面字段映射
 * ============================================================
 * 只做纯数据转换（不碰数据库、不碰 Astro），供公开数据层（src/lib/publicPosts.ts）
 * 与数据层测试（practice/tests/db.ts）复用。
 *
 * 【为什么这里不再导出 Astro Loader】
 * 文章已改为请求时由 src/lib/publicPosts.ts 统一查库、由
 * src/lib/postMarkdown.ts 渲染正文；保留文件位置与 toEntryData() 导出，
 * 避免无谓搬迁已有测试与依赖。
 *
 * 想删除：将 toEntryData 内联到 src/lib/publicPosts.ts 并更新 practice/tests/db.ts，
 * 再删除本文件。
 * ============================================================
 */
import { POST_STATUS, type PostRow } from "../schema.ts";

const MODIFIED_THRESHOLD_MS = 60 * 1000;

/**
 * 保留原来的“一分钟内算同次发布”规则，否则刚发布后改错字就会改变首页排序。
 * 映射也供后台测试使用，因此允许输入草稿；公开状态由查询入口统一过滤。
 */
export function toEntryData(row: Omit<PostRow, "body">) {
  const publishedAt = row.publishedAt ?? row.createdAt;
  const isModified =
    row.updatedAt.getTime() - publishedAt.getTime() > MODIFIED_THRESHOLD_MS;
  return {
    dbId: row.id,
    title: row.title,
    description: row.description,
    pubDatetime: publishedAt,
    modDatetime: isModified ? row.updatedAt : null,
    tags: row.tags,
    featured: row.featured,
    draft: row.status !== POST_STATUS.published,
  };
}
