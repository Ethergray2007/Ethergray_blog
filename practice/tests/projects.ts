/**
 * 项目列表测试
 * ============================================================
 * 测 src/utils/getProjects.ts 的排序和字段归一化。
 *
 * 跑法：
 *   npm run projects:test
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

const { getProjects } = await import("../../src/utils/getProjects.ts");

function project(
  id: string,
  order: number | undefined,
  extra: Partial<{ href: string; featured: boolean; tags: string[] }> = {}
) {
  return {
    id,
    rendered: { html: `<p>${id}</p>` },
    data: {
      title: id,
      summary: `${id} 摘要`,
      description: `${id} 说明`,
      status: "进行中",
      tags: extra.tags ?? [],
      order,
      href: extra.href,
      featured: extra.featured ?? false,
    },
  } as never;
}

/* ==================================================================
 * 1. 排序
 * ================================================================ */
console.log("\n=== 1. 排序 ===");

const sorted = getProjects([
  project("c", 3),
  project("a", 1),
  project("b", 2),
]);

check(
  "按 order 升序",
  sorted.map(p => p.id).join(",") === "a,b,c",
  sorted.map(p => p.id).join(",")
);

check(
  "没写 order 的排最后",
  getProjects([project("有序", 1), project("无序", undefined)])
    .map(p => p.id)
    .join(",") === "有序,无序"
);

const same = getProjects([project("乙", 5), project("甲", 5)]);
check("order 相同时结果稳定（不会每次换位置）", same.length === 2);

/* ==================================================================
 * 2. 不改动传进来的数组
 * ================================================================ */
console.log("\n=== 2. 不改动传进来的数组 ===");

/**
 * `sort()` 是**原地**排序的，所以这个函数必须先复制。
 * 这条防的是"页面里 getCollection 的结果被悄悄排乱"——
 * 首页也在用同一个数组去数数，顺序被改虽然不影响计数，
 * 但同一份数据在不同页面表现不一致本身就很难查。
 */
const input = [project("b", 2), project("a", 1)];
const before = input.map(p => p.data.title).join(",");
getProjects(input);
check(
  "排序不改动传进来的数组",
  input.map(p => p.data.title).join(",") === before,
  `${before} → ${input.map(p => p.data.title).join(",")}`
);

/* ==================================================================
 * 3. 返回的是原始条目
 * ================================================================ */
console.log("\n=== 3. 返回的是原始条目 ===");

const one = getProjects([
  project("a", 1, { tags: ["Astro", "TS"], featured: true }),
]).at(0)!;

check("title 在 data 上", one.data.title === "a");
check("status 在 data 上", one.data.status === "进行中");
check("tags 在 data 上", one.data.tags.join(",") === "Astro,TS");
check("featured 在 data 上", one.data.featured === true);
check("order 在 data 上", one.data.order === 1);

/**
 * href 的"空字符串当没有"现在写在页面模板里（`entry.data.href?.trim()`），
 * 不再是这个函数的职责 —— 所以这里没有对应的断言。
 * 正文同理：由页面用 `await render(entry)` + <Content /> 渲染，
 * 两种格式（.md / .mdx）都能用，也就不需要"拿不到 html 就报错"的补丁。
 */

/* ==================================================================
 * 4. 边界
 * ================================================================ */
console.log("\n=== 4. 边界情况 ===");

check("空数组不报错", getProjects([]).length === 0);

const noTags = getProjects([project("a", 1)]).at(0)!;
check(
  "没写 tags 时是空数组",
  Array.isArray(noTags.data.tags) && noTags.data.tags.length === 0
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

console.log("🎉 项目列表正常");
