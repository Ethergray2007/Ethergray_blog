import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";

export default defineConfig({
  site: config.site.url,
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
    }),
  ],
  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "zh",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      /**
       * 文章目录（TOC）不在这里做。
       *
       * 原来配的是 remarkToc + remarkCollapse，但 remarkCollapse 的触发条件
       * 是英文标题 "Table of contents"，中文文章永远匹配不上，
       * 所以目录其实一直没生成过。
       *
       * 现在目录由 TableOfContents.astro 自己从正文提取，
       * 位置、样式、锚点 id 都可控，也不依赖插件的隐藏规则。
       */
      rehypePlugins: [rehypeCallouts],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.google(),
      fallbacks: ["monospace"],
      /**
       * 只下载真正用到的字重。
       *
       * 实际用到的：400 正文、500 font-medium、600 font-semibold、
       * 700 font-bold、900 font-black。
       * 原来还配了 300 和 italic，但全站没有任何地方用到，
       * 白白多下载好几份字体文件。
       *
       * 注意：`ttf` 不能删。
       * `src/pages/og.png.ts` 用 satori 生成 OG 图片，而 satori 底层的
       * opentype.js 不认 woff2，只留 woff2 会直接让构建失败：
       * “Unsupported OpenType signature wOF2”。
       */
      weights: [400, 500, 600, 700, 900],
      styles: ["normal"],
      formats: ["woff2", "ttf"],
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
