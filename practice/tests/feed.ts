/**
 * 动态 RSS / Atom 的内容契约
 * ============================================================
 * 默认用测试数据运行真实生成函数；传本地地址时还会检查实际动态 HTTP 响应。
 * 不再把 dist 下缺少预渲染 XML 当作成功，因为动态路由本来就没有这些文件。
 * 想删除：删本文件及 package.json 的 feed:test 命令、README 对应说明。
 * 跑法：npm run feed:test -- http://localhost:4321
 * ============================================================
 */
import assert from "node:assert/strict";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { buildPostFeed } from "../../src/utils/createPostFeed.ts";

let passed = 0;
const array = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown): string =>
  typeof value === "string"
    ? value
    : value && typeof value === "object" && "#text" in value
      ? String(value["#text"])
      : "";
function check(name: string, run: () => void) {
  run();
  passed++;
  console.log(`  ✅ ${name}`);
}
function verify(rssXml: string, atomXml: string, name: string) {
  check(`${name}：两个订阅源都是有效 XML`, () => {
    assert.equal(XMLValidator.validate(rssXml), true);
    assert.equal(XMLValidator.validate(atomXml), true);
  });
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
  });
  const rss = parser.parse(rssXml).rss;
  const atom = parser.parse(atomXml).feed;
  const rssItems = array<Record<string, any>>(rss.channel.item);
  const atomItems = array<Record<string, any>>(atom.entry);
  check(`${name}：RSS 版本与 Atom 必填字段完整`, () => {
    assert.equal(String(rss["@_version"]), "2.0");
    assert.equal(atom["@_xmlns"], "http://www.w3.org/2005/Atom");
    assert.ok(atom.id && atom.author.name && atom.generator);
    assert.match(atom.updated, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
  check(`${name}：条目数量、标题和链接一致`, () => {
    assert.equal(rssItems.length, atomItems.length);
    assert.deepEqual(
      rssItems.map(item => text(item.title)),
      atomItems.map(item => text(item.title))
    );
    assert.deepEqual(
      rssItems.map(item => item.link),
      atomItems.map(item => item.link["@_href"])
    );
    assert.ok(rssItems.every(item => /^https?:\/\//.test(item.link)));
  });
  return { rssItems, atomItems, atom };
}

const site = {
  url: "https://blog.example/",
  title: "订阅测试",
  description: "测试摘要",
  author: "测试作者",
  lang: "zh",
};
const original = {
  id: "alpha",
  data: {
    title: "A & B <C>",
    description: "包含 & 与 < 的摘要",
    tags: ["Astro", "中文"],
    pubDatetime: new Date("2026-01-01T00:00:00Z"),
    modDatetime: new Date("2026-02-01T00:00:00Z"),
  },
};
const older = {
  id: "beta",
  data: {
    title: "更早的文章",
    description: "较早",
    tags: [],
    pubDatetime: new Date("2025-01-01T00:00:00Z"),
    modDatetime: null,
  },
};
const path = (post: { id: string }) => `/posts/${post.id}/`;
const feed = buildPostFeed([original, older], site, path);
const fixture = verify(feed.rss2(), feed.atom1(), "测试数据");
check("订阅更新时间取全部文章中的最新时间", () =>
  assert.equal(fixture.atom.updated, "2026-02-01T00:00:00.000Z")
);
check("测试文章确实写入订阅而非空结果", () =>
  assert.equal(fixture.rssItems.length, 2)
);
const changed = {
  ...original,
  data: { ...original.data, title: "已修改的新标题" },
};
const refreshed = verify(
  buildPostFeed([changed], site, path).rss2(),
  buildPostFeed([changed], site, path).atom1(),
  "修改后"
);
check("每次调用都使用本次数据，不保留旧文章标题", () => {
  assert.equal(text(refreshed.rssItems[0].title), "已修改的新标题");
  assert.equal(refreshed.rssItems.length, 1);
});
const empty = verify(
  buildPostFeed([], site, path).rss2(),
  buildPostFeed([], site, path).atom1(),
  "没有公开文章"
);
check("公开文章为空时仍生成可订阅的合法空源", () =>
  assert.equal(empty.rssItems.length, 0)
);

if (process.argv[2]) {
  const base = new URL(process.argv[2]);
  assert.ok(
    ["localhost", "127.0.0.1"].includes(base.hostname) &&
      base.protocol === "http:",
    "运行时验收只访问本地开发地址"
  );
  const responses = await Promise.all([
    fetch(new URL("/rss.xml", base)),
    fetch(new URL("/atom.xml", base)),
  ]);
  check("实际动态订阅路由可访问，且声明服务端缓存", () => {
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /xml/);
      assert.ok(response.headers.has("cache-control"));
    }
  });
  verify(
    await responses[0].text(),
    await responses[1].text(),
    "实际 HTTP 响应"
  );
} else {
  console.log(
    "  说明：本次验证生成函数；实际动态路由需另传本地 URL 验证，未将其计为通过。"
  );
}
console.log(`\n订阅测试：${passed} 项通过。`);
