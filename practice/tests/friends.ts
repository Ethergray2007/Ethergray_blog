/**
 * 友链排序测试
 * ============================================================
 * 【为什么值得测】
 * 排序出错的表现很隐蔽：页面能打开、友链都在，
 * 只是顺序不对或者顺序每次都变。这种问题几乎不会被发现，
 * 但会让人隐约觉得"这页面有点乱"。
 *
 * 另外中文排序是个真实的坑：string 直接比较是按编码点排的，
 * 结果完全没有规律（"阿" 会排在 "z" 后面）。必须用 localeCompare。
 *
 * 跑法：
 *   npm run friends:test
 * ============================================================
 */

/* ------------------------------------------------------------------
 * 断言工具
 * ----------------------------------------------------------------- */
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

const { getFriends } = await import("../../src/utils/getFriends.ts");

/* ------------------------------------------------------------------
 * 造数据的小工具
 * ----------------------------------------------------------------- */

/**
 * 造一个内容集合条目。
 *
 * getFriends 只用到 data 里的几个字段，所以不需要造完整的
 * CollectionEntry —— 用类型断言把测试数据的形状说清楚就够了。
 */
function entry(
  title: string,
  order: number | undefined,
  extra: Partial<{ url: string; avatar: string }> = {}
) {
  return {
    data: {
      title,
      description: `${title} 的简介`,
      url: extra.url ?? "https://example.com",
      avatar: extra.avatar ?? "https://example.com/a.png",
      order,
    },
    body: "",
  } as never;
}

/* ==================================================================
 * 1. 排序
 * ================================================================ */
console.log("\n=== 1. 排序规则 ===");

const sorted = getFriends([
  entry("第三个", 3),
  entry("第一个", 1),
  entry("第二个", 2),
]);

check(
  "按 order 升序排列",
  sorted.map(f => f.title).join(",") === "第一个,第二个,第三个",
  sorted.map(f => f.title).join(",")
);

const noOrder = getFriends([entry("有顺序", 1), entry("没顺序", undefined)]);
check(
  "没写 order 的排在最后（默认 999）",
  noOrder.map(f => f.title).join(",") === "有顺序,没顺序",
  noOrder.map(f => f.title).join(",")
);

/**
 * 这条是最容易漏的：order 相同时必须有第二排序键。
 * 没有的话，两个 order 相同的友链在页面上会每次构建都换位置 ——
 * V8 的 Array.sort 在不同长度/顺序下结果可能不同。
 */
const sameOrder = getFriends([
  entry("乙站", 5),
  entry("甲站", 5),
  entry("丙站", 5),
]);

check(
  "order 相同时按名称排序（结果稳定）",
  sameOrder.map(f => f.title).join(",") === "丙站,甲站,乙站",
  sameOrder.map(f => f.title).join(",")
);

/** 重复调用必须得到完全一样的结果 */
const once = getFriends([entry("B", 2), entry("A", 2), entry("C", 1)]);
const twice = getFriends([entry("C", 1), entry("A", 2), entry("B", 2)]);
check(
  "输入顺序不同，输出顺序相同（排序是确定的）",
  once.map(f => f.title).join(",") === twice.map(f => f.title).join(","),
  `${once.map(f => f.title).join(",")} vs ${twice.map(f => f.title).join(",")}`
);

/* ==================================================================
 * 2. 中文排序
 * ================================================================ */
console.log("\n=== 2. 中文排序 ===");

const chinese = getFriends([
  entry("张三的博客", 1),
  entry("阿里的博客", 1),
  entry("李四的博客", 1),
]);

const order = chinese.map(f => f.title);

/**
 * 用 localeCompare 排中文时，"阿" 应该排在 "李" 和 "张" 前面（拼音 a < l < z）。
 * 如果用简单的 > 比较，结果会按 Unicode 编码点走，"阿"(U+963F) 会排到最后。
 */
check(
  "中文按拼音排序（阿 → 李 → 张）",
  order[0] === "阿里的博客" && order[2] === "张三的博客",
  order.join(" , ")
);

/* ==================================================================
 * 3. 字段透传
 * ================================================================ */
console.log("\n=== 3. 字段有没有丢 ===");

const one = getFriends([
  entry("站点", 1, {
    url: "https://a.example.com",
    avatar: "https://a.example.com/avatar.png",
  }),
])[0];

check("url 正确透传", one.url === "https://a.example.com");
check("avatar 正确透传", one.avatar === "https://a.example.com/avatar.png");
check("description 正确透传", one.description === "站点 的简介");
check("order 也带出来了（排序后仍可读）", one.order === 1);

/* ==================================================================
 * 4. 边界情况
 * ================================================================ */
console.log("\n=== 4. 边界情况 ===");

check("空数组不报错", getFriends([]).length === 0);

const single = getFriends([entry("只有一个", 1)]);
check("只有一个时也能正常工作", single.length === 1 && single[0].title === "只有一个");

/** 全部都没写 order 时不应该乱序 */
const allDefault = getFriends([entry("B", undefined), entry("A", undefined)]);
check(
  "全都没写 order 时按名称排",
  allDefault.map(f => f.title).join(",") === "A,B",
  allDefault.map(f => f.title).join(",")
);

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

console.log("🎉 友链排序正常");
