/**
 * 动态分页边界测试。想删除：删除本文件和 package.json 的 pagination:test，并移除 README 登记。
 * 只测试输入边界与链接契约，不读取数据库。
 */
import assert from "node:assert/strict";
import { paginatePosts } from "../../src/utils/paginatePosts.ts";
const posts = Array.from({ length: 9 }, (_, index) => ({ id: String(index), collection: "posts", data: {} })) as Parameters<typeof paginatePosts>[0];
const options = { pageSize: 4, firstUrl: "/posts/", pagesUrl: "/posts/page" };
const first = paginatePosts(posts, undefined, options)!;
assert.equal(first.total, 9);
assert.equal(first.lastPage, 3);
assert.equal(first.url.prev, undefined);
assert.equal(first.url.next, "/posts/page/2/");
const last = paginatePosts(posts, "3", options)!;
assert.equal(last.data.length, 1);
assert.equal(last.url.next, undefined);
assert.equal(last.url.first, "/posts/");
for (const value of ["0", "-1", "2.5", "01", "Infinity", "2/x", "4", "9007199254740992"]) assert.equal(paginatePosts(posts, value, options), null, value);
assert.equal(paginatePosts([], undefined, options)!.lastPage, 1);
assert.equal(paginatePosts([], "2", options), null);
const tags = paginatePosts(posts, "2", { ...options, firstUrl: "/tags/astro/", pagesUrl: "/tags/astro" })!;
assert.equal(tags.url.prev, "/tags/astro/");
assert.equal(tags.url.next, "/tags/astro/3/");
console.log("动态分页：链接、末页、空集合及非法页码边界全部通过");
