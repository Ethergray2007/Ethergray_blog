import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import netlify from "@astrojs/netlify";
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

  /**
   * 输出模式 + 部署适配器
   * ============================================================
   * 这是整个项目"从纯静态走向全栈"的开关，改动前先读完这段。
   *
   * `output: "static"` 的意思是：
   *   - 默认**所有页面继续在构建时生成静态 HTML**（和以前完全一样）
   *   - 但站点有了"按需渲染"的能力：某个文件里写一行
   *       export const prerender = false;
   *     这个路由就会变成服务端渲染，可以用来写 API。
   *
   * 为什么不写 `output: "server"`：
   *   那会把所有页面都改成按需渲染，博客文章页也就不再是静态 HTML 了。
   *   对一个以内容为主的博客来说这是纯粹的退步 —— 变慢、变贵、还失去了
   *   CDN 缓存。我们只需要"少数几个接口能跑服务端"，所以保持 static。
   *
   * 注意：Astro 7 已经移除了 `output: "hybrid"`，
   * 原来的 hybrid 行为现在就是 static 的默认行为。
   *
   * 想回退到纯静态？
   *   删掉下面的 `adapter` 和 `output` 两行，再 `npm uninstall @astrojs/netlify`。
   */
  output: "static",
  adapter: netlify({
    /**
     * 关掉 Netlify Image CDN，继续用 Astro 在**构建时**优化图片。
     *
     * 适配器默认是开启的（imageCDN: true），那会把图片优化改成
     * 请求时由 Netlify 实时处理。两种都能用，但行为不同：
     *   构建时优化   图片在 dist/ 里是优化好的静态文件，CDN 直接发
     *   运行时优化   每次首次请求时才转换，然后缓存
     *
     * 这次改动的目的只是"让站点能跑服务端"，不该顺带改变图片处理方式。
     * 想启用 Netlify Image CDN 的话，把它改成 true 即可。
     */
    imageCDN: false,
  }),

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
