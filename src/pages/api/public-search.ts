/**
 * 实时公开搜索
 * ============================================================
 * 只接统一公开数据层，不能复用后台的全量文章接口。
 * 想删除：删本文件和 search.astro 的表单，再删 publicSearch.ts、
 * 搜索测试以及 README 的实时搜索模块登记。
 * ============================================================
 */
import type { APIRoute } from "astro";
import { searchPublicPosts } from "@/lib/publicPosts";
import { publicReadError } from "@/lib/publicCache";
import { getPostUrl } from "@/utils/getPostPaths";
import {
  parseSearchQuery,
  SEARCH_RESULT_LIMIT,
  toPublicSearchResult,
} from "@/utils/publicSearch";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const { query, error } = parseSearchQuery(url.searchParams.get("q"));
  const headers = { "cache-control": "no-store" };
  if (error) return Response.json({ code: error }, { status: 400, headers });
  if (!query) return Response.json({ results: [] }, { headers });
  const locale = url.searchParams.get("lang") === "en" ? "en" : "zh";
  try {
    const posts = await searchPublicPosts(query, SEARCH_RESULT_LIMIT);
    return Response.json(
      {
        results: posts.map(post =>
          toPublicSearchResult(post, getPostUrl(post.id, post.filePath, locale))
        ),
      },
      { headers }
    );
  } catch (error) {
    return publicReadError("", error);
  }
};
