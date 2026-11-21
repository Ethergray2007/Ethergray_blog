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
    sessionUser: false,
    failSession: false,
    failSignIn: false,
    signInRequests: [] as Record<string, unknown>[],
    signInGate: Promise.resolve(),
    releaseSignIn: () => {},
    rebuildRequests: 0,
    listReads: 0,
    writes: [] as Record<string, unknown>[],
    saveGate: Promise.resolve(),
    releaseSave: () => {},
  };

  // 不只拦截 posts：未知的认证、重建等接口也必须中止，不能漏到真实服务器。
  await context.route("**/api/**", async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/session/get-session" && request.method() === "GET") {
      await route.fulfill({
        status: state.failSession ? 503 : 200,
        json: state.failSession
          ? { message: "模拟会话检查失败" }
          : state.sessionUser
            ? {
                user: { id: "owner", name: "测试博主" },
                session: {
                  id: "test-session",
                  expiresAt: "2099-01-01T00:00:00.000Z",
                },
              }
            : null,
      });
      return;
    }
    if (
      pathname === "/api/session/sign-in/social" &&
      request.method() === "POST"
    ) {
      state.signInRequests.push(request.postDataJSON());
      await state.signInGate;
      await route.fulfill({
        status: state.failSignIn ? 503 : 200,
        json: state.failSignIn
          ? { message: "模拟登录失败", code: "TEST_ERROR" }
          : {
              // 只跳到本地替身页面，不访问真正的 GitHub 或发起真实 OAuth。
              url: new URL("/admin/posts", baseURL).href,
              redirect: true,
            },
      });
      return;
    }
    if (pathname === "/api/rebuild" && request.method() === "POST") {
      state.rebuildRequests++;
      await route.fulfill({
        status: 200,
        json: { outcome: "triggered" },
      });
      return;
    }
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
    holdSignIn() {
      state.signInGate = new Promise<void>(resolve => {
        state.releaseSignIn = resolve;
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

  await check("登录请求防重复，失败可重试，成功跳转到后台", async test => {
    const { page, state } = test;
    state.failSignIn = true;
    test.holdSignIn();
    await page.goto(new URL("/admin", baseURL).href);
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLButtonElement>("#github-login")?.disabled ===
        false
    );
    await page.locator("#github-login").focus();
    const signInRequest = page.waitForRequest(r =>
      r.url().includes("/sign-in/social")
    );
    await page.keyboard.press("Enter");
    await signInRequest;
    assert.equal(await page.locator("#github-login").isDisabled(), true);
    await page
      .locator("#github-login")
      .evaluate(button => (button as HTMLButtonElement).click());
    state.releaseSignIn();
    await page.locator("#login-error").waitFor({ state: "visible" });
    assert.equal(state.signInRequests.length, 1);
    assert.match(
      await page.locator("#login-error").innerText(),
      /检查网络后重试/
    );
    assert.equal(await page.locator("#github-login").isEnabled(), true);
    state.failSignIn = false;
    await page.locator("#github-login").click();
    await page.waitForURL(new URL("/admin/posts", baseURL).href);
    assert.equal(state.signInRequests.length, 2);
    assert.equal(state.signInRequests[0].provider, "github");
    assert.equal(state.signInRequests[0].callbackURL, "/admin/posts");
    assert.equal(state.signInRequests[0].errorCallbackURL, "/admin");
  });

  await check("已登录直接进入后台", async ({ page, state }) => {
    state.sessionUser = true;
    await page.goto(new URL("/admin", baseURL).href);
    await page.waitForURL(new URL("/admin/posts", baseURL).href);
    assert.equal(state.signInRequests.length, 0);
  });

  await check("会话检查失败后仍能发起登录", async ({ page, state }) => {
    state.failSession = true;
    await page.goto(new URL("/admin", baseURL).href);
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLButtonElement>("#github-login")?.disabled ===
        false
    );
    assert.match(await page.locator("#login-status").innerText(), /仍可以/);
    await page.locator("#github-login").click();
    await page.waitForURL(new URL("/admin/posts", baseURL).href);
  });

  await check("回调错误只显示本地说明，取消授权后能重试", async ({ page }) => {
    const response = await page.goto(
      new URL("/admin?error=untrusted-error-message", baseURL).href
    );
    assert.match(response?.headers()["cache-control"] ?? "", /no-store/);
    assert.equal(
      await page.locator('meta[name="robots"]').getAttribute("content"),
      "noindex, nofollow"
    );
    assert.equal(
      (await page.locator("body").innerText()).includes(
        "untrusted-error-message"
      ),
      false
    );
    assert.match(
      await page.locator("#login-error").innerText(),
      /未能完成登录/
    );
    await page.goto(new URL("/admin?error=access_denied", baseURL).href);
    assert.match(await page.locator("#login-error").innerText(), /授权未完成/);
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLButtonElement>("#github-login")?.disabled ===
        false
    );
    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>("#github-login");
      const status = document.querySelector("#login-status");
      if (button) button.disabled = true;
      if (status) status.textContent = "正在前往 GitHub……";
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true })
      );
    });
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLButtonElement>("#github-login")?.disabled ===
        false
    );
    assert.equal(await page.locator("#login-status").innerText(), "");
  });

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

  await check(
    "保存草稿、发布与下线都提示缓存时限且没有重建按钮",
    async ({ page, state }) => {
      await ready(page, 12);
      assert.equal(await page.locator("#rebuild").count(), 0);
      await page.locator("#save").click();
      await saved(page);
      assert.match(
        await page.locator("#publication-status").innerText(),
        /草稿/
      );
      for (const status of ["published", "draft"]) {
        await page.locator("#post-status").selectOption(status);
        const response = page.waitForResponse(
          r => r.request().method() === "PATCH"
        );
        await page.locator("#save").click();
        await response;
        await page.waitForFunction(
          () =>
            document.querySelector<HTMLButtonElement>("#save")?.disabled ===
            false
        );
        const text = await page.locator("#publication-status").innerText();
        assert.match(text, status === "published" ? /公开/ : /草稿/);
        assert.match(text, /30/);
        assert.ok(!text.includes("立即重建"));
      }
      assert.equal(state.writes.length, 3);
      assert.equal(state.rebuildRequests, 0);
    }
  );

  console.log(`\n后台浏览器回归：${passed} 项通过，所有 API 均使用内存替身。`);
} finally {
  await browser?.close();
}
