import type { APIRoute } from "astro";
import { fontData } from "astro:assets";
import { renderOgPng } from "@/lib/ogImage";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import { readFontFile } from "@/utils/readFontFile";
import config from "@/config";

export const GET: APIRoute = async () => {
  const fonts = fontData["--font-google-sans-code"];
  const regularFontPath = getFontPathByWeight(fonts, 400);
  const boldFontPath = getFontPathByWeight(fonts, 700);

  if (regularFontPath === undefined || boldFontPath === undefined) {
    throw new Error("Cannot find the font path.");
  }

  // 预渲染路由从磁盘读字体，避免构建期向不存在的站点 URL 发起 fetch。
  const [regular, bold] = await Promise.all([
    readFontFile(regularFontPath),
    readFontFile(boldFontPath),
  ]);

  const png = await renderOgPng({
    title: config.site.title,
    subtitle: config.site.description,
    siteLabel: new URL(config.site.url).hostname,
    centered: true,
    fonts: { regular, bold },
  });

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
