import { loadEnv } from "vite";
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
import mermaid from "astro-mermaid";
import { markdownConfig } from "./src/lib/markdownConfig";
import config from "./astro-paper.config";

/**
 * 把 .env 里的变量加载进 process.env。
 * ============================================================
 * 【为什么需要手动做这件事】
 * Astro **不会**自动把 .env 注入 process.env。
 * 它的 astro:env 机制是另一套（要 import 虚拟模块，且只在 Astro
 * 运行时可用）。而我们的数据库代码要在**三种环境**下都能读到配置：
 *
 *   1. Astro 开发服务器 / 构建   ← 这个文件负责
 *   2. 普通 node 脚本（db:setup、测试）← 脚本里有自己的加载器
 *   3. Netlify Functions         ← 平台直接注入 process.env，不需要文件
 *
 * 用 Vite 自带的 loadEnv 读，不引入 dotenv 依赖。
 *
 * 只加载非 PUBLIC_ 开头的变量，避免把密钥意外暴露给客户端代码 ——
 * 虽然客户端代码本来也读不到 process.env，但这样更保险。
 */
const fileEnv = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  ""
);

for (const [key, value] of Object.entries(fileEnv)) {
  // 已经存在的环境变量优先 —— 线上平台注入的值不应该被本地文件覆盖
  process.env[key] ??= value;
}

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

    /**
     * 关掉 Edge Functions 的本地模拟。
     *
     * 适配器默认会在 `npm run dev` 时拉起一堆 Netlify 平台的模拟服务
     * （aiGateway / blobs / database / edgeFunctions / functions / ...）。
     * 其中 edgeFunctions 需要额外启动一个 Deno 子进程，在本地很容易失败：
     *
     *     Error: Could not establish a connection to the Netlify
     *            Edge Functions local development server
     *
     * 而这个错误是**未捕获的 Promise 异常**，会直接把开发服务器打挂 ——
     * 表现就是 `npm run dev` 启动到一半崩掉。
     *
     * 本项目没有用到 Edge Functions（我们用普通 Netlify Functions 跑 SSR），
     * 所以关掉它没有任何损失。
     *
     * 注意：这里只影响**本地开发**，线上部署完全不受影响。
     */
    devFeatures: {
      edgeFunctions: false,
      images: true,
      environmentVariables: false,
    },
  }),

  integrations: [
    /**
     * Mermaid（用 ```mermaid 代码块画流程图、时序图等）。
     *
     * ⚠️ 必须放在其他 markdown 相关集成**之前** —— 官方文档明确要求。
     * 它会检测到我们用的是 unified() 处理器，把插件合并进去，
     * 已有的 rehype-callouts 不受影响。
     *
     * 渲染发生在浏览器（Mermaid 要算布局），所以是客户端渲染。
     */
    mermaid({
      autoTheme: true, // 跟着站点的深色/浅色模式走
    }),
    mdx(),
    sitemap({
      customSitemaps: [new URL("sitemap-posts.xml", config.site.url).href],
      filter: page =>
        !page.includes("/admin") &&
        (config.features?.showArchives !== false ||
          !page.endsWith("/archives/")),
    }),
  ],
  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "zh",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: markdownConfig,
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.local(),
      fallbacks: ["monospace"],
      /**
       * 字体随仓库提供，避免构建时下载 Google Fonts 的元数据超时。
       * 浏览器优先用共享的可变 WOFF2；OG 图片仍需各字重的静态 TTF，
       * 因为 satori 不能正确处理可变字体。来源与删除方法见字体目录 README。
       *
       * 注意：`ttf` 不能删。
       * `src/pages/og.png.ts` 用 satori 生成 OG 图片，而 satori 底层的
       * opentype.js 不认 woff2，只留 woff2 会直接让构建失败：
       * “Unsupported OpenType signature wOF2”。
       */
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      formats: ["woff2", "ttf"],
      options: {
        variants: [
          {
            weight: 400,
            style: "normal",
            src: [
              "./src/assets/fonts/google-sans-code-latin.woff2",
              "./src/assets/fonts/google-sans-code-400.ttf",
            ],
          },
          {
            weight: 500,
            style: "normal",
            src: [
              "./src/assets/fonts/google-sans-code-latin.woff2",
              "./src/assets/fonts/google-sans-code-500.ttf",
            ],
          },
          {
            weight: 600,
            style: "normal",
            src: [
              "./src/assets/fonts/google-sans-code-latin.woff2",
              "./src/assets/fonts/google-sans-code-600.ttf",
            ],
          },
          {
            weight: 700,
            style: "normal",
            src: [
              "./src/assets/fonts/google-sans-code-latin.woff2",
              "./src/assets/fonts/google-sans-code-700.ttf",
            ],
          },
        ],
      },
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
