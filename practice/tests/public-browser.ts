/**
 * 公开页面回归：菜单、主题、文章元数据和返回顶部
 * ============================================================
 * 只访问本地页面，所有 API 请求中止，不写真实数据。
 * 想删掉：删本文件、package.json 的 public:browser:test 命令，
 * 再删 README 可选模块登记和运行说明。
 * ============================================================
 */
import assert from "node:assert/strict";
import { chromium, type Browser } from "playwright";
import { serializeJsonLd } from "../../src/utils/serializeJsonLd.ts";

const baseURL = new URL(process.argv[2] ?? "http://localhost:4321");
assert.ok(
  ["localhost", "127.0.0.1"].includes(baseURL.hostname) &&
    baseURL.protocol === "http:" &&
    !baseURL.username &&
    !baseURL.password,
  "仅允许本地 HTTP 地址"
);

let browser: Browser | undefined;
try {
  browser = await chromium
    .launch({ headless: true })
    .catch(() => chromium.launch({ headless: true, channel: "msedge" }));
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await context.route("**/api/**", route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);

  // 用真正的 HTML 解析器检查：JSON.parse 本身发现不了提前闭合 script 的问题。
  const data = { headline: 'HTML 中 </script><p id="injected"> 标签的作用' };
  await page.setContent(
    `<script type="application/ld+json">${serializeJsonLd(data)}</script>`
  );
  assert.deepEqual(
    JSON.parse((await page.locator("script").textContent())!),
    data
  );
  assert.equal(await page.locator("#injected").count(), 0);
  console.log("✅ 特殊标题保留原文且不会关闭结构化数据脚本");

  await page.goto(new URL("/", baseURL).href);
  await page.locator("[data-mobile-menu-open]").click();
  await page.waitForFunction(() =>
    document.querySelector("#mobile-menu")?.matches(":modal")
  );
  await page.setViewportSize({ width: 800, height: 844 });
  await page.waitForFunction(
    () => !document.querySelector<HTMLDialogElement>("#mobile-menu")?.open
  );
  await page.locator(".nav-search").click();
  await page.waitForURL("**/search/");
  console.log("✅ 菜单跨桌面断点关闭，页面导航恢复可点击");

  await page.locator("#theme-btn").click();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark"
  );
  const themeIsSynced = () =>
    page.evaluate(() => {
      const bg = getComputedStyle(document.documentElement).backgroundColor;
      const colors = [...document.querySelectorAll("meta[name='theme-color']")];
      return (
        bg !== "rgba(0, 0, 0, 0)" &&
        colors.length > 0 &&
        colors.every(meta => meta.getAttribute("content") === bg)
      );
    });
  assert.ok(await themeIsSynced());
  await page.goto(new URL("/posts/", baseURL).href);
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark"
  );
  assert.ok(await themeIsSynced());
  console.log("✅ 系统浅色下手动深色及换页后的浏览器主题色一致");

  // 从列表取得真实文章地址，避免测试绑死某一篇示例文章。
  const articleURL = await page
    .locator("main a[href*='/posts/']")
    .first()
    .getAttribute("href");
  assert.ok(articleURL, "文章列表至少有一篇文章供回归验证");
  await page.goto(new URL(articleURL, baseURL).href);
  assert.deepEqual(
    await page
      .locator("meta[property='og:type']")
      .evaluateAll(nodes => nodes.map(node => node.getAttribute("content"))),
    ["article"]
  );
  const json = await page
    .locator("script[type='application/ld+json']")
    .textContent();
  assert.equal(JSON.parse(json!)["@type"], "BlogPosting");
  assert.equal(
    await page
      .locator("[data-back-to-top], [data-button='back-to-top']")
      .count(),
    1
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    })
  );
  await page.locator("[data-back-to-top]").click();
  await page.waitForFunction(() => window.scrollY === 0);
  console.log("✅ 文章分享类型唯一、结构化数据有效、手机仅一个返回顶部且可用");
  console.log("\n公开页面回归：4 项通过，所有 API 请求均已拦截。");
} finally {
  await browser?.close();
}
