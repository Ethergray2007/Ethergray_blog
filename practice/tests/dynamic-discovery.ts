/**
 * 实时搜索和文章站点地图的边界验收
 * ============================================================
 * 默认只测纯函数；传本地 URL 时验收实际公开 API 与 sitemap，不执行写操作。
 * 想删除：删本文件及 README 对应验证说明。
 * 跑法：node practice/tests/dynamic-discovery.ts http://localhost:4321
 * ============================================================
 */
import assert from "node:assert/strict";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  parseSearchQuery,
  MAX_SEARCH_QUERY_LENGTH,
  toPublicSearchResult,
} from "../../src/utils/publicSearch.ts";

let passed = 0;
const check = (name: string, run: () => void) => {
  run();
  passed++;
  console.log(`  ✅ ${name}`);
};
check("缺少或只有空格的关键词视为空搜索", () => {
  assert.equal(parseSearchQuery(null).query, "");
  assert.equal(parseSearchQuery(" \n ").query, "");
});
check("保留中文、字面 SQL 通配符和特殊符号，交数据层参数化处理", () => {
  assert.equal(
    parseSearchQuery("  中文 100% _ & <  ").query,
    "中文 100% _ & <"
  );
});
check("过长关键词被拒绝，不静默截断成另一条搜索", () => {
  assert.equal(
    parseSearchQuery("中".repeat(MAX_SEARCH_QUERY_LENGTH)).error,
    null
  );
  assert.equal(
    parseSearchQuery("中".repeat(MAX_SEARCH_QUERY_LENGTH + 1)).error,
    "QUERY_TOO_LONG"
  );
});
check("搜索结果只公开标题、摘要、链接，正文与内部字段不外泄", () => {
  const post = {
    id: "internal",
    body: "正文秘密",
    data: { title: "<img src=x>", description: "& 测试", secret: "内部字段" },
  };
  assert.deepEqual(toPublicSearchResult(post, "/posts/example/"), {
    title: "<img src=x>",
    description: "& 测试",
    url: "/posts/example/",
  });
});
if (process.argv[2]) {
  const base = new URL(process.argv[2]);
  assert.ok(
    ["localhost", "127.0.0.1"].includes(base.hostname) &&
      base.protocol === "http:",
    "只允许本地只读验收"
  );
  const empty = await fetch(new URL("/api/public-search", base));
  check("空搜索不查询文章，返回空结果且不缓存", () => {
    assert.equal(empty.status, 200);
    assert.equal(empty.headers.get("cache-control"), "no-store");
  });
  assert.deepEqual(await empty.json(), { results: [] });
  const long = new URL("/api/public-search", base);
  long.searchParams.set("q", "x".repeat(101));
  const invalid = await fetch(long);
  check("实际 API 拒绝超过 100 字符的查询", () =>
    assert.equal(invalid.status, 400)
  );
  const sitemap = await fetch(new URL("/sitemap-posts.xml", base));
  const xml = await sitemap.text();
  check("动态文章 sitemap 是有效 XML，并声明缓存", () => {
    assert.equal(sitemap.status, 200);
    assert.equal(XMLValidator.validate(xml), true);
    assert.ok(sitemap.headers.has("cache-control"));
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
    assert.equal(
      parsed.urlset["@_xmlns"],
      "http://www.sitemaps.org/schemas/sitemap/0.9"
    );
  });
  const feed = await fetch(new URL("/rss.xml", base));
  assert.equal(feed.status, 200);
  const parsed = new XMLParser().parse(await feed.text());
  const first = Array.isArray(parsed.rss.channel.item)
    ? parsed.rss.channel.item[0]
    : parsed.rss.channel.item;
  if (first) {
    const query = new URL("/api/public-search", base);
    query.searchParams.set("q", String(first.title));
    const response = await fetch(query);
    assert.equal(response.status, 200);
    const { results } = await response.json();
    check("实际搜索能检索订阅里的公开标题，返回字段受限", () => {
      assert.ok(results.length > 0 && results.length <= 20);
      assert.ok(
        results.some(
          (result: { title: string }) => result.title === first.title
        )
      );
      for (const result of results)
        assert.deepEqual(Object.keys(result).sort(), [
          "description",
          "title",
          "url",
        ]);
    });
  } else {
    console.log("  没有公开文章，未将搜索命中检查计为通过。");
  }
} else {
  console.log("  未传本地 URL；实际动态路由尚未计入验证。");
}
console.log(`\n动态发现入口：${passed} 项通过。`);
