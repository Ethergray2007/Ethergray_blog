/**
 * 说说排序测试
 * ============================================================
 * 测的是 src/utils/getNotes.ts 的排序和时间兜底逻辑。
 *
 * 【为什么值得测】
 * 说说页是"时间线"，顺序错了会让人以为内容有问题，
 * 但页面本身能正常打开，所以很容易一直没发现。
 *
 * 跑法：
 *   npm run notes:test
 * ============================================================
 */

let passed = 0;
const failed: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ❌ ${name}${detail ? `\n       ${detail}` : ""}`);
  }
}

const { getNotes } = await import("../../src/utils/getNotes.ts");

/** 造一条说说。getNotes 只用到 id / rendered / data 三处 */
function note(id: string, date: string, tags: string[] = [], html = "") {
  return {
    id,
    rendered: { html },
    data: { date: new Date(date), tags },
  } as never;
}

/* ==================================================================
 * 1. 排序
 * ================================================================ */
console.log("\n=== 1. 时间倒序 ===");

const sorted = getNotes([
  note("b", "2026-09-25T10:00:00+08:00"),
  note("c", "2026-09-30T21:20:00+08:00"),
  note("a", "2026-01-01T00:00:00+08:00"),
]);

check(
  "最新的排在最前面",
  sorted.map(n => n.id).join(",") === "c,b,a",
  sorted.map(n => n.id).join(",")
);

/**
 * 这条是真正要防的：两条说说时间完全相同时，
 * 没有第二排序键的话顺序会不确定 ——
 * 表现是页面每次构建后顺序可能变，很难查。
 */
const sameTime = getNotes([
  note("zebra", "2026-09-30T10:00:00+08:00"),
  note("apple", "2026-09-30T10:00:00+08:00"),
  note("mango", "2026-09-30T10:00:00+08:00"),
]);

check(
  "时间相同时按 id 排序（顺序稳定）",
  sameTime.map(n => n.id).join(",") === "apple,mango,zebra",
  sameTime.map(n => n.id).join(",")
);

/** 输入顺序不同，输出必须一致 */
const once = getNotes([note("x", "2026-09-30T10:00:00+08:00"), note("y", "2026-09-30T11:00:00+08:00")]);
const twice = getNotes([note("y", "2026-09-30T11:00:00+08:00"), note("x", "2026-09-30T10:00:00+08:00")]);
check(
  "输入顺序不影响输出顺序",
  once.map(n => n.id).join(",") === twice.map(n => n.id).join(",")
);

/* ==================================================================
 * 2. 时区
 * ================================================================ */
console.log("\n=== 2. 时区处理 ===");

/**
 * 带 +08:00 的时间在别的时区解析会变成不同的绝对时刻。
 * 这条测试确认我们比的是绝对时间（毫秒），不是字面字符串。
 */
const timezoneSort = getNotes([
  // 北京时间 9/30 08:00 = UTC 9/30 00:00
  note("beijing", "2026-09-30T08:00:00+08:00"),
  // UTC 9/30 06:00 = 北京时间 9/30 14:00（更晚）
  note("utc", "2026-09-30T06:00:00Z"),
]);

check(
  "跨时区比较用的是绝对时间",
  timezoneSort[0].id === "utc",
  `实际顺序: ${timezoneSort.map(n => n.id).join(",")}`
);

/* ==================================================================
 * 3. 返回的是原始条目
 * ================================================================ */
console.log("\n=== 3. 返回的是原始条目 ===");

const one = getNotes([
  note("a", "2026-09-30T10:00:00+08:00", ["博客", "开发"], "<p>正文</p>"),
])[0];

check("id 是对的", one.id === "a");
check("tags 在 data 上", one.data.tags.join(",") === "博客,开发");
check("date 是 Date 对象", one.data.date instanceof Date);

/**
 * 排序函数不应该改动传进来的数组（`sort()` 是原地排序的）。
 * 这条防的是"页面里 getCollection 的结果被悄悄改乱"。
 */
const input = [
  note("b", "2026-09-25T10:00:00+08:00"),
  note("c", "2026-09-30T21:20:00+08:00"),
];
const inputIdsBefore = input.map(n => n.id).join(",");
getNotes(input);
check(
  "不改动传进来的数组",
  input.map(n => n.id).join(",") === inputIdsBefore,
  `${inputIdsBefore} → ${input.map(n => n.id).join(",")}`
);

/* ==================================================================
 * 4. 边界情况
 * ================================================================ */
console.log("\n=== 4. 边界情况 ===");

check("空数组不报错", getNotes([]).length === 0);

const noTags = getNotes([note("a", "2026-09-30T10:00:00+08:00")])[0];
check(
  "没写 tags 时是空数组（不是 undefined）",
  Array.isArray(noTags.data.tags) && noTags.data.tags.length === 0
);

/**
 * 正文不在这里处理了。
 *
 * 原来 getNotes 会去读 entry.rendered.html，而它只对 .md 存在
 * （.mdx 走延迟渲染，没这个字段），于是"放个 .mdx 进来会静默渲染成空白"。
 * 现在正文由页面用 Astro 的 `await render(entry)` + <Content /> 渲染，
 * 两种格式都支持 —— 所以这里没有"渲染"相关的断言可测了，
 * 这是重构的目的，不是漏测。
 */

/* ==================================================================
 * 汇总
 * ================================================================ */
console.log(`\n${"=".repeat(52)}`);
console.log(`通过 ${passed} 项，失败 ${failed.length} 项`);

if (failed.length > 0) {
  console.log("\n失败的项：");
  for (const name of failed) console.log(`  · ${name}`);
  process.exit(1);
}

console.log("🎉 说说排序正常");
