import type { APIRoute } from "astro";
import { fontData } from "astro:assets";
import { renderOgPng } from "@/lib/ogImage";
import { getPublicPost } from "@/lib/publicPosts";
import {
  setPublicCache,
  publicReadError,
  publicNotFound,
} from "@/lib/publicCache";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import config from "@/config";

export const prerender = false;

/** 同一个函数实例内缓存已验证的 TrueType 字体二进制，避免每次生成分享图都重复发起同站 HTTP 请求 */
const fontBufferCache = new Map<string, Promise<ArrayBuffer>>();

function loadFontOnce(path: string, requestUrl: string): Promise<ArrayBuffer> {
  const cached = fontBufferCache.get(path);
  if (cached) return cached;

  const loading = (async () => {
    const response = await fetch(new URL(path, requestUrl), {
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.arrayBuffer();
    if (!response.ok || data.byteLength < 4) {
      throw new Error("Invalid TrueType font response");
    }
    const signature = new DataView(data).getUint32(0);
    if (signature !== 0x00010000) {
      throw new Error("Invalid TrueType font response");
    }
    return data;
  })().catch(error => {
    // 失败的 Promise 不能留在缓存里，否则整个函数实例都会持续失败
    fontBufferCache.delete(path);
    throw error;
  });

  fontBufferCache.set(path, loading);
  return loading;
}

export const GET: APIRoute = async ({ params, request }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  let post;
  try {
    post = await getPublicPost(params.slug ?? "");
  } catch (error) {
    return publicReadError("", error);
  }
  if (!post || post.data.ogImage) return publicNotFound();

  const fonts = fontData["--font-google-sans-code"];
  const regularFontPath = getFontPathByWeight(fonts, 400);
  const boldFontPath = getFontPathByWeight(fonts, 700);

  if (regularFontPath === undefined || boldFontPath === undefined) {
    throw new Error("Cannot find the font path.");
  }

  // 动态路由运行于部署后的函数，构建机磁盘缓存不存在；通过本站静态 URL 取字体并缓存在函数实例内。
  try {
    const [regular, bold] = await Promise.all([
      loadFontOnce(regularFontPath, request.url),
      loadFontOnce(boldFontPath, request.url),
    ]);

    const png = await renderOgPng({
      title: post.data.title,
      author: post.data.author,
      siteLabel: config.site.title,
      fonts: { regular, bold },
    });

    const headers = new Headers({ "Content-Type": "image/png" });
    setPublicCache(headers);
    return new Response(new Uint8Array(png), { headers });
  } catch (error) {
    return publicReadError("", error);
  }
};
