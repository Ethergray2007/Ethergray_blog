/**
 * 公开文章数据入口
 * ============================================================
 * 想删除：先将阅读页面、订阅和搜索切回其他数据源，再删除本文件及 README 登记。
 * 所有公开入口使用同一个发布时间窗口；不缓存数据库结果，缓存由公开响应头统一管理。
 * ============================================================
 */
import config from "../../astro-paper.config.ts";
import type { Db } from "../db/client.ts";
import { getDb } from "../db/index.ts";
import { toEntryData } from "../db/loaders/posts.ts";
import {
  getPublicPostBySlug,
  listPublicPostMetadata,
  searchPublicPostMetadata,
  type PostMetadataRow,
} from "../db/repositories/posts.ts";
import type { PostRow } from "../db/schema.ts";
import { postSchema, type PublicPostData } from "./postSchema.ts";

export type PublicPost = {
  id: string;
  collection: "posts";
  body?: string;
  data: PublicPostData;
};

function toPublicPost(row: PostMetadataRow | PostRow): PublicPost {
  return {
    id: row.slug,
    collection: "posts",
    data: postSchema.parse(toEntryData(row)),
    ...("body" in row ? { body: row.body } : {}),
  };
}

/** 显式参数供内存数据库测试；页面不传参数就使用真实数据库。 */
export function publicationCutoff(now = new Date()): Date {
  // 与 src/config.ts 的默认值一致；此模块也供 Node 测试使用，不能依赖 astro:env 虚拟模块。
  const margin = config.posts?.scheduledPostMargin ?? 15 * 60 * 1000;
  return new Date(now.getTime() + margin);
}

export async function listPublicPosts(
  db: Db = getDb(),
  now = new Date()
): Promise<PublicPost[]> {
  return (await listPublicPostMetadata(db, publicationCutoff(now))).map(
    toPublicPost
  );
}

export async function getPublicPost(
  slug: string,
  db: Db = getDb(),
  now = new Date()
): Promise<(PublicPost & { body: string }) | null> {
  const row = await getPublicPostBySlug(db, slug, publicationCutoff(now));
  return row ? { ...toPublicPost(row), body: row.body } : null;
}

export async function searchPublicPosts(
  query: string,
  limit = 20,
  db: Db = getDb(),
  now = new Date()
): Promise<PublicPost[]> {
  const keyword = query.trim();
  if (!keyword || keyword.length > 120) return [];
  const boundedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(50, Math.floor(limit)))
    : 20;
  return (
    await searchPublicPostMetadata(
      db,
      keyword,
      publicationCutoff(now),
      boundedLimit
    )
  ).map(toPublicPost);
}
