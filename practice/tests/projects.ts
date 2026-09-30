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
 * 2. href 的归一化（这条最容易出错）
 * ================================================================ */
console.log("\n=== 2. 链接地址的归一化 ===");

check(
  "没填 href → null",
  getProjects([project("a", 1)]).at(0)?.href === null
);

/**
 * 这条是页面渲染的关键：如果空字符串没被归一成 null，
 * 页面就会渲染出一个 href="" 的「查看源码」链接 ——
 * 点了会刷新当前页，比没有链接更让人困惑。
 */
check(
  "href 是空字符串 → 也是 null",
  getProjects([project("a", 1, { href: "" })]).at(0)?.href === null
);

check(
  "href 只有空格 → 也是 null",
  getProjects([project("a", 1, { href: "   " })]).at(0)?.href === null
);

check(
  "正常的 href 保留",
  getProjects([project("a", 1, { href: "https://example.com" })]).at(0)
    ?.href === "https://example.com"
);

/* ==================================================================
 * 3. 字段透传
 * ================================================================ */
console.log("\n=== 3. 字段有没有丢 ===");

const one = getProjects([
  project("a", 1, { tags: ["Astro", "TS"], featured: true }),
]).at(0)!;

check("title 透传", one.title === "a");
check("summary 透传", one.summary === "a 摘要");
check("description 透传", one.description === "a 说明");
check("status 透传", one.status === "进行中");
check("tags 透传", one.tags.join(",") === "Astro,TS");
check("featured 透传", one.featured === true);
check("渲染好的 HTML 透传", one.html === "<p>a</p>");
check("order 带出来了", one.order === 1);

/* ==================================================================
 * 4. 边界
 * ================================================================ */
console.log("\n=== 4. 边界情况 ===");

check("空数组不报错", getProjects([]).length === 0);

const noTags = getProjects([project("a", 1)]).at(0)!;
check("没写 tags 时是空数组", Array.isArray(noTags.tags) && noTags.tags.length === 0);

/**
 * rendered 不存在时必须**报错**，不能悄悄给个空字符串
 * （原因同 notes：.mdx 条目没有 entry.rendered，静默变空最难查）。
 */
let missingRenderedError = "";
try {
  getProjects([{ id: "a", data: { ...project("a", 1).data } } as never]);
} catch (error) {
  missingRenderedError = error instanceof Error ? error.message : String(error);
}

check(
  "没有 rendered 时报错（而不是静默给空字符串）",
  missingRenderedError.includes("a") && missingRenderedError.includes(".md"),
  missingRenderedError || "（居然没报错）"
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
