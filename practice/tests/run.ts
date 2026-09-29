/**
 * 自动判分
 * ============================================================
 *   npm run learn:check     → 判你写的 practice/lesson-*.ts
 *   npm run learn:answers   → 判我写的 practice/solutions/lesson-*.ts
 *
 * 这个文件你不需要改。
 * ============================================================
 */
import assert from "node:assert/strict";

import { posts, type Post } from "../data.ts";

/* ------------------------------------------------------------
 * 选择判谁
 *   npm run learn:check    →  "./lesson-XX.ts"    （你的答案）
 *   npm run learn:answers  →  "./solutions/lesson-XX.ts"（标准答案）
 *
 * 用字符串拼路径是为了让打包/类型检查不去静态追踪这些模块 ——
 * 否则你还没写完的文件会连带把主项目弄出一堆类型错误。
 * ---------------------------------------------------------- */
const useSolutions = process.argv.includes("--solutions");
// 注意：动态 import 的路径是相对**当前文件**解析的，
// 这个文件在 practice/tests/ 里，所以要先回到 practice/ 再进 lesson。
const from = useSolutions ? "../solutions/lesson-" : "../lesson-";

async function load(lesson: number): Promise<Record<string, unknown>> {
  const path = `${from}${String(lesson).padStart(2, "0")}.ts`;

  try {
    return (await import(path)) as Record<string, unknown>;
  } catch (error) {
    console.error(
      `\n❌ 第 ${lesson} 课的文件无法加载：${path}\n` +
        `   原因：${error instanceof Error ? error.message.split("\n")[0] : error}\n` +
        `   常见情况：文件里的某个 export 还没写出来。检查一下 export 名字有没有打错。\n`
    );
    process.exit(1);
  }
}

/** 兼容两种导入：你的文件和我写的答案，导出的名字是一样的 */
const lesson01 = await load(1);
const lesson02 = await load(2);
const lesson03 = await load(3);
const lesson04 = await load(4);
const lesson05 = await load(5);
const lesson06 = await load(6);
const lesson07 = await load(7);
const lesson08 = await load(8);

/* 取数据里真实存在的几篇文章，断言更好读 */
const byTitle = (title: string) => posts.find(p => p.title === title) as Post;
const featuredPost = byTitle("用 Astro 做静态搜索");
const plainPost = byTitle("开始搭建 EtherGray Blog");
const oldPost = byTitle("2024 年的总结");
const draftPost = byTitle("还没写完的草稿");

/* ------------------------------------------------------------
 * 一个极简的测试框架：把每个检查函数跑一遍，收集结果
 * ---------------------------------------------------------- */
type Check = { name: string; run: () => void | Promise<void> };

const groups: { title: string; checks: Check[] }[] = [];
let current = { title: "", checks: [] as Check[] };

function lesson(title: string) {
  current = { title, checks: [] };
  groups.push(current);
}

function check(name: string, run: () => void | Promise<void>) {
  current.checks.push({ name, run });
}

/** 把任何值安全地转成数组，用来兜住"函数还没实现"的情况 */
function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/* ============================================================
 * 第 1 课
 * ========================================================== */
lesson("第 1 课 · 基础类型标注");

check("getPostTitle 能取出标题", () => {
  const fn = lesson01.getPostTitle as (p: Post) => string;
  assert.equal(fn(plainPost), "开始搭建 EtherGray Blog");
});

check("formatDate 输出 2026年9月25日", () => {
  const fn = lesson01.formatDate as (d: Date) => string;
  assert.equal(
    fn(new Date(2026, 8, 25)),
    "2026年9月25日",
    "提示：getMonth() 返回 0~11，要 +1"
  );
  assert.equal(fn(oldPost.pubDatetime), "2024年12月31日");
});

/* ============================================================
 * 第 2 课
 * ========================================================== */
lesson("第 2 课 · 函数返回对象");

check("summarize 返回完整的摘要对象", () => {
  const fn = lesson02.summarize as (p: Post) => Record<string, unknown>;
  assert.deepEqual(fn(plainPost), {
    title: "开始搭建 EtherGray Blog",
    tagCount: 3,
    hasTags: true,
  });
});

check("没有标签时 hasTags 为 false", () => {
  const fn = lesson02.summarize as (p: Post) => Record<string, unknown>;
  const noTags = { ...plainPost, tags: [] };
  assert.equal(fn(noTags).hasTags, false);
  assert.equal(fn(noTags).tagCount, 0);
});

/* ============================================================
 * 第 3 课
 * ========================================================== */
lesson("第 3 课 · 可选属性与类型收窄");

check("isFeatured 区分有 / 没有 featured", () => {
  const fn = lesson03.isFeatured as (p: Post) => boolean;
  assert.equal(fn(featuredPost), true);
  assert.equal(fn(plainPost), false);
});

check("hasBeenUpdated 比较修改时间和发布时间", () => {
  const fn = lesson03.hasBeenUpdated as (p: Post) => boolean;
  assert.equal(fn(featuredPost), true, "这篇有 modDatetime 且晚于 pubDatetime");
  assert.equal(fn(plainPost), false, "这篇没有 modDatetime");
});

check("displayAuthor 没有作者时兜底成“匿名”", () => {
  const fn = lesson03.displayAuthor as (p: Post) => string;
  assert.equal(fn(oldPost), "Ethergray");
  assert.equal(fn(plainPost), "匿名");
});

/* ============================================================
 * 第 4 课
 * ========================================================== */
lesson("第 4 课 · 数组三件套");

check("getVisiblePosts 过滤掉草稿", () => {
  const fn = lesson04.getVisiblePosts as (all: Post[]) => Post[];
  const visible = safeArray<Post>(fn(posts));
  assert.equal(visible.length, posts.length - 1, `应该剩 ${posts.length - 1} 篇`);
  assert.ok(
    !visible.includes(draftPost),
    "草稿（draft: true）不应该出现在结果里"
  );
});

check("sortByNewest 从新到旧", () => {
  const fn = lesson04.sortByNewest as (all: Post[]) => Post[];
  const sorted = safeArray<Post>(fn(posts));
  assert.equal(sorted[0]?.title, "还没写完的草稿", "最新的应该排第一");
});

check("sortByNewest 不改动原数组", () => {
  const fn = lesson04.sortByNewest as (all: Post[]) => Post[];
  const before = posts[0]?.title;
  fn(posts);
  assert.equal(posts[0]?.title, before, "原数组被改动了！记得先 [...all] 再 sort");
});

check("getTitles 取出所有标题", () => {
  const fn = lesson04.getTitles as (all: Post[]) => string[];
  assert.deepEqual(safeArray<string>(fn(posts)), [
    "开始搭建 EtherGray Blog",
    "用 Astro 做静态搜索",
    "中文排版的一些细节",
    "还没写完的草稿",
    "2024 年的总结",
  ]);
});

check("collectTags 去重且不丢标签", () => {
  const fn = lesson04.collectTags as (all: Post[]) => string[];
  const tags = safeArray<string>(fn(posts));

  assert.equal(tags.length, 8, `应该有 8 个标签，现在有 ${tags.length} 个`);
  assert.equal(
    new Set(tags).size,
    tags.length,
    "结果里有重复标签，检查一下去重那一步"
  );

  for (const expected of [
    "Astro",
    "Blog",
    "开发",
    "搜索",
    "排版",
    "设计",
    "草稿",
    "随笔",
  ]) {
    assert.ok(tags.includes(expected), `缺少标签：${expected}`);
  }
});

check("collectTags 结果是排好序的", () => {
  const fn = lesson04.collectTags as (all: Post[]) => string[];
  const tags = safeArray<string>(fn(posts));

  // 因为中文排序结果和系统语言环境有关，这里用同一套规则现算一遍再来比较，
  // 这样在任何电脑上都能判对。
  const expected = [...new Set(posts.flatMap(p => p.tags))].sort((a, b) =>
    a.localeCompare(b)
  );

  assert.deepEqual(tags, expected, "排序结果不对");
});

check("countTags 统计每个标签出现次数", () => {
  const fn = lesson04.countTags as (all: Post[]) => Record<string, number>;
  assert.deepEqual(fn(posts), {
    Astro: 2,
    Blog: 1,
    开发: 1,
    搜索: 1,
    排版: 1,
    设计: 1,
    草稿: 1,
    随笔: 1,
  });
});

/* ============================================================
 * 第 5 课
 * ========================================================== */
lesson("第 5 课 · 联合类型");

check("describe 处理三种状态", () => {
  const fn = lesson05.describe as (r: unknown) => string;
  assert.equal(fn({ status: "loading" }), "加载中…");
  assert.equal(fn({ status: "ok", posts }), "共 5 篇文章");
  assert.equal(fn({ status: "error", message: "超时" }), "出错了：超时");
});

check("getPostsOrEmpty 只在成功时返回数据", () => {
  const fn = lesson05.getPostsOrEmpty as (r: unknown) => Post[];
  assert.equal(safeArray<Post>(fn({ status: "ok", posts })).length, 5);
  assert.deepEqual(safeArray<Post>(fn({ status: "loading" })), []);
  assert.deepEqual(
    safeArray<Post>(fn({ status: "error", message: "x" })),
    []
  );
});

/* ============================================================
 * 第 6 课
 * ========================================================== */
lesson("第 6 课 · 泛型");

check("first 对任何类型的数组都可用", () => {
  const fn = lesson06.first as <T>(items: T[]) => T | undefined;
  assert.equal(fn([1, 2, 3]), 1);
  assert.equal(fn(["a", "b"]), "a");
  assert.equal(fn(posts)?.title, "开始搭建 EtherGray Blog");
  assert.equal(fn([] as number[]), undefined, "空数组应该返回 undefined");
});

check("pluck 抽取字段", () => {
  const fn = lesson06.pluck as <T, K extends keyof T>(
    items: T[],
    key: K
  ) => T[K][];
  assert.deepEqual(fn(posts, "title").slice(0, 2), [
    "开始搭建 EtherGray Blog",
    "用 Astro 做静态搜索",
  ]);
  assert.deepEqual(fn(posts, "tags")[0], ["Astro", "Blog", "开发"]);
});

/* ============================================================
 * 第 7 课
 * ========================================================== */
lesson("第 7 课 · 异步");

check("fetchPosts 拿到文章列表", async () => {
  const fn = lesson07.fetchPosts as () => Promise<Post[]>;
  const result = await fn();
  assert.equal(safeArray<Post>(result).length, 5);
});

check("safeFetchPosts 返回 ok 包装", async () => {
  const fn = lesson07.safeFetchPosts as () => Promise<{
    ok: boolean;
    data?: Post[];
  }>;
  const result = await fn();
  assert.equal(result.ok, true, "正常情况下 ok 应该是 true");
  assert.equal(safeArray<Post>(result.data).length, 5);
});

check("waitForAll 并行等待三个任务", async () => {
  const delay = lesson07.delay as (ms: number) => Promise<void>;
  const fn = lesson07.waitForAll as (
    tasks: [Promise<number>, Promise<number>, Promise<number>]
  ) => Promise<number[]>;

  const numbers = await fn([
    delay(10).then(() => 1),
    delay(5).then(() => 2),
    delay(1).then(() => 3),
  ]);

  assert.deepEqual(safeArray<number>(numbers), [1, 2, 3]);
});

/* ============================================================
 * 第 8 课
 * ========================================================== */
lesson("第 8 课 · zod 运行时校验");

const validFrontmatter = {
  title: "测试文章",
  description: "摘要",
  pubDatetime: new Date(2026, 0, 1),
  tags: ["Astro"],
  featured: true,
};

check("合法数据校验通过", () => {
  const fn = lesson08.parseFrontmatter as (input: unknown) => {
    ok: boolean;
    data?: Record<string, unknown>;
  };
  const result = fn(validFrontmatter);
  assert.equal(result.ok, true, "这份数据是合法的，应该通过");
  assert.equal(result.data?.title, "测试文章");
});

check("缺必填字段时校验失败", () => {
  const fn = lesson08.parseFrontmatter as (input: unknown) => { ok: boolean };
  const { title, ...missingTitle } = validFrontmatter;
  void title;
  assert.equal(fn(missingTitle).ok, false, "少了 title 应该失败");
});

check("字段类型不对时校验失败", () => {
  const fn = lesson08.parseFrontmatter as (input: unknown) => { ok: boolean };
  assert.equal(
    fn({ ...validFrontmatter, tags: "不是数组" }).ok,
    false,
    "tags 必须是数组"
  );
});

check("传入奇怪的值也不崩", () => {
  const fn = lesson08.parseFrontmatter as (input: unknown) => { ok: boolean };
  assert.equal(fn(null).ok, false);
  assert.equal(fn("字符串").ok, false);
  assert.equal(fn(123).ok, false);
});

/* ============================================================
 * 跑起来并打印报告
 * ========================================================== */
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;
const failures: { name: string; message: string }[] = [];

for (const group of groups) {
  const results: { name: string; ok: boolean; message: string }[] = [];

  for (const item of group.checks) {
    try {
      await item.run();
      results.push({ name: item.name, ok: true, message: "" });
    } catch (error) {
      const message =
        error instanceof Error
          ? (error.message.split("\n")[0] ?? String(error))
          : String(error);
      results.push({ name: item.name, ok: false, message });
    }
  }

  const okCount = results.filter(r => r.ok).length;
  const allOk = okCount === results.length;
  const head = allOk
    ? `${GREEN}✔${RESET}`
    : `${RED}✘${RESET}`;

  console.log(`${head} ${BOLD}${group.title}${RESET}  ${okCount}/${results.length}`);

  for (const r of results) {
    if (r.ok) {
      passed++;
      console.log(`   ${GREEN}✔${RESET} ${DIM}${r.name}${RESET}`);
    } else {
      failed++;
      console.log(`   ${RED}✘ ${r.name}${RESET}`);
      console.log(`     ${RED}${r.message}${RESET}`);
      failures.push({ name: `${group.title} · ${r.name}`, message: r.message });
    }
  }

  console.log("");
}

console.log(
  `${BOLD}合计${RESET}  ${GREEN}通过 ${passed}${RESET}  ${
    failed > 0 ? `${RED}失败 ${failed}${RESET}` : "失败 0"
  }`
);

if (failed > 0) {
  console.log(
    `\n${DIM}提示：卡住了可以看 practice/solutions/ 里对应的答案。${RESET}\n`
  );
  process.exit(1);
}

console.log(`\n${GREEN}全部通过！可以进下一课了。${RESET}\n`);
