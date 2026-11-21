/**
 * 拼出文章页面网址（附带语言前缀与 base 配置）
 * ============================================================
 * 文章均来自数据库，id 即文章 slug，不再保留旧文件系统目录前缀分支。
 * ============================================================
 */
import { getRelativeLocaleUrl } from "astro:i18n";
import config from "@/config";

export function getPostUrl(
  id: string,
  locale: string | undefined = config.site.lang
): string {
  const slug = id.split("/").at(-1) ?? id;
  return getRelativeLocaleUrl(locale, `posts/${slug}`);
}
