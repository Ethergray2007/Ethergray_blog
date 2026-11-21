/**
 * 公开文章响应的缓存规则
 * ============================================================
 * 只给不包含用户信息的阅读页面使用。浏览器每次校验，Netlify CDN 最多缓存
 * 30 秒；不启用过期缓存，避免文章下线后仍被长时间返回。
 * 想删除：删掉各阅读入口的 setPublicCache 调用及 import，再删除本文件。
 * README「动态文章发布」登记了本模块。
 * ============================================================
 */
export function setPublicCache(headers: Headers): void {
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  headers.set(
    "Netlify-CDN-Cache-Control",
    "public, s-maxage=30, must-revalidate"
  );
}

/** 统一把公开页面读取失败的异常写进服务端日志，便于 Netlify Functions 排错。 */
export function logPublicReadError(error: unknown): void {
  // eslint-disable-next-line no-console -- 线上 SSR 读取失败的服务端诊断日志
  console.error("[public-read] 公开数据读取或渲染失败", error);
}

/** 故障不能缓存成空站点，也不能被当成永久 404。传入 error 时写入服务端日志便于线上排错。 */
export function publicReadError(message = "", error?: unknown): Response {
  if (error !== undefined) {
    logPublicReadError(error);
  }

  return new Response(message, {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "30" },
  });
}

export function publicNotFound(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
