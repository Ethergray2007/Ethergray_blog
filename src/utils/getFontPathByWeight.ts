import type { FontData } from "astro:assets";

/**
 * 找出某个字重对应的字体文件地址。
 *
 * 主要给 satori（OG 图片生成）用，satori 底层的 opentype.js
 * **只能解析 TrueType / OpenType**，喂给它 woff2 会直接报错：
 *
 *     Unsupported OpenType signature wOF2
 *
 * 所以这里不再像以前那样「找不到就随便拿一个」——那会把 woff2 漏给 satori，
 * 构建时报一个很难定位的错。现在只接受能解析的格式，拿不到就返回
 * undefined，由调用方给出明确报错。
 */
const SATORI_SAFE_FORMATS = ["truetype", "opentype", "ttf", "otf"];

export function getFontPathByWeight(
  fonts: FontData[],
  weight: number,
  options?: {
    style?: "normal" | "italic";
    /** 优先使用的格式，默认 truetype */
    format?: string;
  }
): string | undefined {
  const style = options?.style ?? "normal";
  const preferred = options?.format ?? "truetype";
  const wanted = [
    preferred,
    ...SATORI_SAFE_FORMATS.filter(f => f !== preferred),
  ];

  for (const font of fonts) {
    if (font.weight !== String(weight) || font.style !== style) {
      continue;
    }

    for (const format of wanted) {
      const src = font.src.find(file => file.format === format);

      if (src) {
        return src.url;
      }
    }
  }

  return undefined;
}
