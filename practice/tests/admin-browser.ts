/**
 * 后台写作保护的浏览器回归测试
 * ============================================================
 * 依赖本地已启动的开发服务器和 Playwright；所有 /api/ 请求都在浏览器里
 * 拦截，保存结果只写入本脚本的内存，不使用真实登录、数据库或重建接口。
 *
 * 想删掉这些测试？
 *   1. 删掉这个文件
 *   2. 删掉 package.json 里的 admin:browser:test 命令
 *   3. 删掉 README 可选模块表里的对应一行
 * ============================================================
 */
import assert from "node:assert/strict";
import { chromium, type Browser, type Dialog, type Page } from "playwright";

const baseURL = new URL(process.argv[2] ?? "http://localhost:4321");

// 限制目标地址，避免有人把生产地址传进来，再误以为这是一套线上写入测试。
assert.ok(
  ["localhost", "127.0.0.1"].includes(baseURL.hostname) &&
    baseURL.protocol === "http:" &&
    !baseURL.username &&
    !baseURL.password,
  "浏览器回归测试只允许本地 http://localhost 或 http://127.0.0.1"
);

function post(id: number) {
  return {
    id,
    title: `测试文章 ${id}`,
    slug: `fixture-${id}`,
    description: "测试摘要",
    body: `文章 ${id} 的原正文`,
    tags: ["测试"],
    status: "draft",
    featured: false,
    publishedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function fixture(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const records = new Map([
    [12, post(12)],
    [34, post(34)],
  ]);
  const state = {
    failedReads: 0,
    failSave: false,
    listReads: 0,
    writes: [] as Record<string, unknown>[],
    saveGate: Promise.resolve(),
    releaseSave: () => {},
  };

  // 不只拦截 posts：未知的认证、重建等接口也必须中止，不能漏到真实服务器。
  await context.route("**/api/**", async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const match = /^\/api\/posts(?:\/(\d+))?$/.exec(pathname);

    if (!match || !["GET", "POST", "PATCH"].includes(request.method())) {
      await route.abort();
      return;
    }

    const json = (status: number, data: unknown) =>
      route.fulfill({ status, json: data });

    if (request.method() === "GET") {
      if (!match[1]) {
        state.listReads++;
        await json(200, { posts: [...records.values()] });
      } else if (state.failedReads > 0) {
        state.failedReads--;
        await json(503, { error: "模拟读取失败" });
      } else {
        await json(200, { post: records.get(Number(match[1])) });
      }
      return;
    }

    const input = request.postDataJSON() as Record<string, unknown>;
    state.writes.push(input);
    await state.saveGate;

    if (state.failSave) {
      await json(500, { error: "模拟保存失败", code: "INTERNAL" });
      return;
    }

    const id = match[1] ? Number(match[1]) : 56;
    const saved = {
      ...(records.get(id) ?? post(id)),
      ...input,
      id,
      slug: String(input.slug || `fixture-${id}`),
    };
    records.set(id, saved as ReturnType<typeof post>);
    await json(request.method() === "POST" ? 201 : 200, {
      post: saved,
      rebuild: null,
    });
  });

  return {
    page,
    state,
    close: () => context.close(),
    holdSave() {
      state.saveGate = new Promise<void>(resolve => {
        state.releaseSave = resolve;
      });
    },
  };
}

async function ready(page: Page, id: string | number) {
  await page.goto(new URL(`/admin/posts/${id}`, baseURL).href);
  await page.waitForFunction(
    () => document.querySelector<HTMLButtonElement>("#save")?.disabled === false
  );
}

async function saved(page: Page) {
  await page.waitForFunction(() =>
    Boolean(document.querySelector("#saved")?.textContent?.trim())
  );
}

async function leaveWithoutWarning(page: Page) {
  let warnings = 0;
  const accept = async (dialog: Dialog) => {
    warnings++;
    await dialog.accept();
  };
  page.on("dialog", accept);
  try {
    await page.locator('a[href="/admin/posts"]').click();
    await page.waitForURL(new URL("/admin/posts", baseURL).href);
    assert.equal(warnings, 0, "没有未保存修改时，不应阻止离开");
  } finally {
    page.off("dialog", accept);
  }
}

async function stayOnWarning(page: Page) {
  const url = page.url();
  const warning = page.waitForEvent("dialog");
  const navigation = page.locator('a[href="/admin/posts"]').click();
  const dialog = await warning;
  assert.equal(dialog.type(), "beforeunload");
  await dialog.dismiss();
  await navigation;
  assert.equal(page.url(), url, "取消离开后应保留编辑页");
}

let browser: Browser | undefined;
let passed = 0;

try {
  // 开发机没有下载 Playwright Chromium 时，可使用已安装的 Edge；不自动装浏览器。
  browser = await chromium
    .launch({ headless: true })
    .catch(() => chromium.launch({ headless: true, channel: "msedge" }));

  async function check(
    name: string,
    run: (test: Awaited<ReturnType<typeof fixture>>) => Promise<void>
  ) {
    assert.ok(browser);
    const test = await fixture(browser);
    try {
      await run(test);
      passed++;
      console.log(`  ✅ ${name}`);
    } finally {
      await test.close();
    }
  }

  await check(
    "往返进入列表和编辑不同文章，都会重新初始化",
    async ({ page, state }) => {
      await ready(page, "new");
      for (const id of [12, 34]) {
        await leaveWithoutWarning(page);
        await page.locator("#rows tr").first().waitFor();
        await page
          .locator(`#rows a[href="/admin/posts/${id}"]`)
          .first()
          .click();
        await page.waitForFunction(
          () =>
            document.querySelector<HTMLButtonElement>("#save")?.disabled ===
            false
        );
        assert.equal(
          await page.locator("#title").inputValue(),
          `测试文章 ${id}`
        );
      }
      assert.equal(state.listReads, 2);
    }
  );

  await check("加载失败不能保存，重试成功后才解锁", async ({ page, state }) => {
    state.failedReads = 1;
    await page.goto(new URL("/admin/posts/12", baseURL).href);
    await page.locator("#retry-load").waitFor({ state: "visible" });
    assert.equal(await page.locator("#save").isDisabled(), true);
    await page.locator("#post-form").evaluate(form => {
      // 程序可以绕过 disabled 写值和派发事件，不能只靠按钮禁用或空标题校验。
      const title = document.querySelector<HTMLInputElement>("#title");
      if (title) title.value = "绕过禁用按钮的模拟输入";
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });
    await page.waitForLoadState("networkidle");
    assert.equal(state.writes.length, 0, "程序触发 submit 也不能绕过加载保护");
    await page.locator("#retry-load").click();
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLButtonElement>("#save")?.disabled === false
    );
    assert.equal(await page.locator("#body").inputValue(), "文章 12 的原正文");
  });

  await check("未保存修改阻止离开，恢复原值后可直接离开", async ({ page }) => {
    await ready(page, "new");
    await page.locator("#title").pressSequentially("draft");
    await stayOnWarning(page);
    assert.equal(await page.locator("#title").inputValue(), "draft");
    await page.locator("#title").fill("");
    await leaveWithoutWarning(page);
  });

  await check(
    "新建保存后可离开，自动生成 slug 不应制造未保存状态",
    async ({ page, state }) => {
      await ready(page, "new");
      await page.locator("#title").pressSequentially("new post");
      await page.locator("#save").click();
      await saved(page);
      assert.equal(new URL(page.url()).pathname, "/admin/posts/56");
      assert.equal(state.writes.length, 1);
      await leaveWithoutWarning(page);
    }
  );

  await check("保存失败仍然保留离开提醒与正文", async ({ page, state }) => {
    await ready(page, 12);
    state.failSave = true;
    await page.locator("#body").pressSequentially(" changed");
    const response = page.waitForResponse(
      r => r.request().method() === "PATCH"
    );
    await page.locator("#save").click();
    await response;
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLButtonElement>("#save")?.disabled === false
    );
    await stayOnWarning(page);
    assert.match(await page.locator("#body").inputValue(), /changed/);
  });

  await check("保存期间继续编辑，响应成功后仍提示未保存", async test => {
    const { page, state } = test;
    await ready(page, 12);
    test.holdSave();
    await page.locator("#body").fill("本次提交的正文");
    const request = page.waitForRequest(r => r.method() === "PATCH");
    const response = page.waitForResponse(
      r => r.request().method() === "PATCH"
    );
    await page.locator("#save").click();
    await request;
    await page.locator("#body").pressSequentially("，尚未提交的后续编辑");
    state.releaseSave();
    await response;
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLButtonElement>("#save")?.disabled === false
    );
    assert.ok(await page.locator("#unsaved-status").textContent());
    assert.equal(state.writes[0].body, "本次提交的正文");
    await stayOnWarning(page);
    assert.match(await page.locator("#body").inputValue(), /后续编辑/);
  });

  console.log(`\n后台浏览器回归：${passed} 项通过，所有 API 均使用内存替身。`);
} finally {
  await browser?.close();
}
