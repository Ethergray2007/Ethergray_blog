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
 * 3. 字段透传
 * ================================================================ */
console.log("\n=== 3. 字段有没有丢 ===");

const one = getNotes([
  note("a", "2026-09-30T10:00:00+08:00", ["博客", "开发"], "<p>正文</p>"),
])[0];

check("id 正确透传", one.id === "a");
check("渲染好的 HTML 正确透传", one.html === "<p>正文</p>");
check("tags 正确透传", one.tags.join(",") === "博客,开发");
check("date 是 Date 对象", one.date instanceof Date);

/* ==================================================================
 * 4. 边界情况
 * ================================================================ */
console.log("\n=== 4. 边界情况 ===");

check("空数组不报错", getNotes([]).length === 0);

const noTags = getNotes([note("a", "2026-09-30T10:00:00+08:00")])[0];
check("没写 tags 时是空数组（不是 undefined）", Array.isArray(noTags.tags) && noTags.tags.length === 0);

/**
 * rendered 在某些情况下可能是 undefined（比如用的是自定义 loader）。
 * 这里确认不会因此崩掉，而是给个空字符串。
 */
const noRendered = getNotes([
  { id: "a", data: { date: new Date(), tags: [] } } as never,
])[0];
check("没有 rendered 时给空字符串，不崩", noRendered.html === "");

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
