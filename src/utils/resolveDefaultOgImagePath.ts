/**
 * 解析全站默认 OG 分享图路径
 * ============================================================
 * 【为什么不再使用 import.meta.glob("/public/*") 检查文件是否存在】
 * Vite 会把 glob 匹配到的 public/ 下所有大文件（含 hero-bg.mp4 / .webm /
 * hero-bg.jpg / default-og.jpg，合计约 1.45 MB）再拷贝进 dist/_astro/
 * 并生成多余的 SSR chunk，造成构建产物双份冗余。
 *
 * 改为直接依据配置决定：
 *   - 填了 site.ogImage（单层文件名）→ 指向 public/ 下对应静态路径
 *   - 留空且开启 dynamicOgImage     → 回退到生成的 /og.png
 * ============================================================
 */
import type { ResolvedAstroPaperConfig } from "@/types/config";
import { getAssetPath } from "./withBase";

export function resolveDefaultOgImagePath(
  config: ResolvedAstroPaperConfig
): string {
  const filename = config.site.ogImage.trim();

  if (!filename) {
    if (config.features.dynamicOgImage) {
      return getAssetPath("og.png");
    }
    throw new Error(
      "缺少默认分享图：请配置 site.ogImage，或开启 features.dynamicOgImage 回退到 /og.png。"
    );
  }

  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    throw new Error(
      `site.ogImage must be a single filename in public/ (e.g. "default-og.jpg"), got "${filename}"`
    );
  }

  return getAssetPath(filename);
}
