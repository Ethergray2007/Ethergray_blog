/**
 * 动态文章站点地图
 * ============================================================
 * 静态 sitemap 集成不知道部署以后新建的文章，这个入口单独实时列出它们。
 * 想删除：先从 astro.config.ts 的 sitemap.customSitemaps 移除本入口，
 * 再删本文件和 README 的动态站点地图登记。
 * ============================================================
 */
import type { APIRoute } from "astro";
import { listPublicPosts } from "@/lib/publicPosts";
import { setPublicCache, publicReadError } from "@/lib/publicCache";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

export const prerender = false;

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char] ?? char
  );
}

export const GET: APIRoute = async () => {
  try {
    const posts = await listPublicPosts();
    const entries = posts.map(post => {
      const location = new URL(
        getPostUrl(post.id, post.filePath),
        config.site.url
      ).href;
      const modified = new Date(
        post.data.modDatetime ?? post.data.pubDatetime
      ).toISOString();
      return `<url><loc>${escapeXml(location)}</loc><lastmod>${modified}</lastmod></url>`;
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`;
    const headers = new Headers({
      "content-type": "application/xml; charset=utf-8",
    });
    setPublicCache(headers);
    return new Response(xml, { headers });
  } catch (error) {
    return publicReadError("", error);
  }
};
