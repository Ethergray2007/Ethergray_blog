/**
 * 动态公开文章与正文渲染测试
 * ============================================================
 * 使用 PGlite 与真实仓库函数，不连接线上数据库。
 * 想删除：删本文件、package.json 对应命令及 README 的模块登记。
 * ============================================================
 */
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Db } from "../../src/db/client.ts";
import * as schema from "../../src/db/schema.ts";
import { applyMigrations } from "../../src/db/migrate-for-test.ts";
import {
  createPost,
  deletePost,
  updatePost,
} from "../../src/db/repositories/posts.ts";
import {
  getPublicPost,
  listPublicPosts,
  publicationCutoff,
  searchPublicPosts,
} from "../../src/lib/publicPosts.ts";
import { renderPostMarkdown } from "../../src/lib/postMarkdown.ts";

const client = new PGlite();
const db = drizzle(client, { schema }) as unknown as Db;
await applyMigrations(client);
const now = new Date("2026-10-24T00:00:00.000Z");
let passed = 0;
async function check(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log(`✅ ${name}`);
}

try {
  const visible = await createPost(db, {
    slug: "live-one",
    title: "原始标题",
    description: "描述内容",
    body: "正文独有关键词 100% a_b ' OR 1=1 --",
    tags: ["标签关键字"],
    status: "published",
    publishedAt: now,
  });
  await createPost(db, {
    slug: "private-draft",
    title: "草稿独有",
    body: "秘密正文独有关键词",
    status: "draft",
  });
  await createPost(db, {
    slug: "future",
    title: "未来独有",
    body: "正文独有关键词",
    status: "published",
    publishedAt: new Date(publicationCutoff(now).getTime() + 1),
  });
  await createPost(db, {
    slug: "boundary",
    title: "边界独有",
    status: "published",
    publishedAt: publicationCutoff(now),
  });
  await createPost(db, {
    slug: "near-future",
    title: "容差内",
    status: "published",
    publishedAt: new Date(publicationCutoff(now).getTime() - 1),
  });

  await check("公开列表保留发布时间窗口且不携带正文", async () => {
    const posts = await listPublicPosts(db, now);
    assert.deepEqual(posts.map(post => post.id).sort(), [
      "live-one",
      "near-future",
    ]);
    assert.ok(posts.every(post => !("body" in post)));
    assert.equal(posts[0].data.author, "Ethergray");
  });
  await check("草稿、未到时间和未知文章均不能按 slug 读取", async () => {
    for (const slug of ["private-draft", "future", "boundary", "missing"])
      assert.equal(await getPublicPost(slug, db, now), null);
    assert.match(
      (await getPublicPost("live-one", db, now))!.body,
      /正文独有关键词/
    );
  });
  await check("标题、摘要、正文和标签均支持参数化搜索", async () => {
    for (const query of [
      "原始标题",
      "描述内容",
      "正文独有关键词",
      "标签关键字",
    ]) {
      const posts = await searchPublicPosts(query, 20, db, now);
      assert.deepEqual(
        posts.map(post => post.id),
        ["live-one"]
      );
      assert.ok(posts.every(post => !("body" in post)));
    }
  });
  await check("搜索按字面处理百分号、下划线和引号", async () => {
    for (const query of ["100%", "a_b", "' OR 1=1 --"])
      assert.equal((await searchPublicPosts(query, 20, db, now)).length, 1);
    assert.equal((await searchPublicPosts("不存在%", 20, db, now)).length, 0);
    assert.equal((await searchPublicPosts("不存在_", 20, db, now)).length, 0);
  });
  await check("空白、超长搜索和结果上限受控", async () => {
    assert.deepEqual(await searchPublicPosts(" ", 20, db, now), []);
    assert.deepEqual(await searchPublicPosts("a".repeat(121), 20, db, now), []);
    assert.equal((await searchPublicPosts("", 20, db, now)).length, 0);
    assert.ok((await searchPublicPosts("标题", 1, db, now)).length <= 1);
  });
  await check("保存、下线、改 slug 与删除不依赖旧快照", async () => {
    await updatePost(db, visible.id, {
      title: "已修改",
      slug: "new-slug",
      body: "新正文",
    });
    assert.equal(await getPublicPost("live-one", db, now), null);
    assert.equal(
      (await getPublicPost("new-slug", db, now))?.data.title,
      "已修改"
    );
    await updatePost(db, visible.id, { status: "draft" });
    assert.equal(await getPublicPost("new-slug", db, now), null);
    assert.equal((await searchPublicPosts("新正文", 20, db, now)).length, 0);
    await deletePost(db, visible.id);
    assert.equal(await getPublicPost("new-slug", db, now), null);
  });
  await check("数据库失败不会被伪装为空列表", async () => {
    const broken = {
      select() {
        throw new Error("数据库故障");
      },
    } as unknown as Db;
    await assert.rejects(listPublicPosts(broken, now), /数据库故障/);
    await assert.rejects(getPublicPost("any", broken, now), /数据库故障/);
    await assert.rejects(
      searchPublicPosts("any", 20, broken, now),
      /数据库故障/
    );
  });

  const body =
    '## 标题\n\n## 标题\n\n```js file=demo.js\nconst value = 1; // [!code highlight]\n```\n\n数学 $x^2$\n\n> [!NOTE]\n> 提示内容\n\n```mermaid\ngraph TD\n A["<img src=x onerror=alert(1)>"] --> B\n```';
  await check("运行时正文保留高亮、公式、提示块和重复标题锚点", async () => {
    const { html, headings } = await renderPostMarkdown(body);
    assert.match(html, /class="astro-code/);
    assert.match(html, /class="katex/);
    assert.match(html, /callout/);
    assert.deepEqual(
      headings.map(heading => heading.slug),
      ["标题", "标题-1"]
    );
    assert.match(html, /demo\.js/);
  });
  await check(
    "Mermaid 使用独立 pre，图表源码的 HTML 不会变成标签",
    async () => {
      const { html } = await renderPostMarkdown(body);
      assert.match(html, /<pre class="mermaid">/);
      const diagram = html.match(/<pre class="mermaid">([\s\S]*?)<\/pre>/)![1];
      // HTML 序列化器可把 &lt; 规范化为数字实体，两种都必须仍是文字。
      assert.match(diagram, /&(?:lt|#x3c|#60);img/i);
      assert.ok(!diagram.includes("<img"));
      assert.ok(!diagram.includes("Copy"));
    }
  );
  await check("相同正文复用编译缓存，修改正文产生新结果", async () => {
    const first = await renderPostMarkdown(body);
    assert.equal(await renderPostMarkdown(body), first);
    assert.notEqual(await renderPostMarkdown(body + "\n\n已修改"), first);
  });
  await check("正文编译缓存有条目上限，不无限保留旧文章", async () => {
    const first = await renderPostMarkdown("## 容量探针");
    for (let i = 0; i < 65; i++) await renderPostMarkdown(`## 缓存文章 ${i}`);
    assert.notEqual(await renderPostMarkdown("## 容量探针"), first);
  });
  console.log(`动态数据与正文：${passed} 项通过。`);
} finally {
  await client.close();
}
