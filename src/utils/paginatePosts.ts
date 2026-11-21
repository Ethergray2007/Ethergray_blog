/**
 * 动态文章分页
 * ============================================================
 * 纯函数：请求时不再有 Astro 的构建期 paginate()，但保留 Page 的形状，
 * 这样现有分页组件不必另写一套。非法页码返回 null，由路由回 404。
 * 想删除：换掉文章及标签路由的分页调用，再删本文件与 README 对应登记。
 * ============================================================
 */
import type { Page } from "astro";
import type { PublicPost } from "../lib/publicPosts";

export function paginatePosts(
  posts: PublicPost[],
  rawPage: string | undefined,
  options: { pageSize: number; firstUrl: string; pagesUrl: string }
): Page<PublicPost> | null {
  if (rawPage !== undefined && !/^[1-9]\d*$/.test(rawPage)) return null;
  const currentPage = Number(rawPage ?? "1");
  const lastPage = Math.max(1, Math.ceil(posts.length / options.pageSize));
  if (!Number.isSafeInteger(currentPage) || currentPage > lastPage) return null;
  const pageUrl = (n: number) =>
    n === 1 ? options.firstUrl : `${options.pagesUrl}/${n}/`;
  const start = (currentPage - 1) * options.pageSize;
  const data = posts.slice(start, start + options.pageSize);
  return {
    data,
    start,
    end: start + data.length - 1,
    size: options.pageSize,
    total: posts.length,
    currentPage,
    lastPage,
    url: {
      current: pageUrl(currentPage),
      prev: currentPage > 1 ? pageUrl(currentPage - 1) : undefined,
      next: currentPage < lastPage ? pageUrl(currentPage + 1) : undefined,
      first: currentPage > 1 ? pageUrl(1) : undefined,
      last: currentPage < lastPage ? pageUrl(lastPage) : undefined,
    },
  };
}
