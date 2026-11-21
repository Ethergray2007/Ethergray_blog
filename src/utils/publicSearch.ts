/**
 * 公开搜索的输入边界与结果字段
 * ============================================================
 * 自包含纯函数，不访问数据库或 DOM。
 * 想删除：先移除 public-search.ts 和 search.astro 的调用，
 * 再删本文件、相关测试和 README 的实时搜索模块登记。
 * ============================================================
 */
export const MAX_SEARCH_QUERY_LENGTH = 100;
export const SEARCH_RESULT_LIMIT = 20;

export function parseSearchQuery(raw: string | null): {
  query: string;
  error: "QUERY_TOO_LONG" | null;
} {
  const query = (raw ?? "").trim();
  return {
    query,
    error: query.length > MAX_SEARCH_QUERY_LENGTH ? "QUERY_TOO_LONG" : null,
  };
}

export type PublicSearchResult = {
  title: string;
  description: string;
  url: string;
};

export function toPublicSearchResult(
  post: { data: { title: string; description: string } },
  url: string
): PublicSearchResult {
  // 明确挑出三个字段，不能展开整篇文章，否则将来新增后台字段也会一起暴露。
  return { title: post.data.title, description: post.data.description, url };
}
