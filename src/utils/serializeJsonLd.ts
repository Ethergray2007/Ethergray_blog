/**
 * 结构化数据的 HTML 安全序列化
 * ============================================================
 * 自包含模块：不依赖 DOM 或 Astro。
 * 想删掉：先删除 PostLayout.astro 的 JSON-LD script 和本函数的 import，
 * 再删本文件、public-browser.ts 中的对应测试和 README 可选模块登记。
 * ============================================================
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  // 浏览器先按 HTML 找 </script>，不管它是否位于 JSON 字符串内。
  // 转义 < 保留 JSON 原值，同时阻止合法文章标题提前关闭 script。
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
