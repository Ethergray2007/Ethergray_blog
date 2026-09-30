/**
 * 文章目录（TOC）锚点测试
 * ============================================================
 * 测的是 src/utils/getTableOfContents.ts —— 它算出来的 id
 * 必须和页面上 <h2 id="..."> 完全一致，否则目录点了不动。
 *
 * 【为什么值得测】
 * 这个 bug 不会报错、不会构建失败，只是"点了没反应"，
 * 而且要标题里**恰好有链接**才触发 —— 很容易一年都发现不了。
 *
 * 真实踩到的例子：`## 参考 [MDN](https://mdn.io)`
 *   Astro 生成的 id   参考-mdn
 *   我们算出来的 id   参考-mdnhttpsmdnio   ← 把链接里的网址也当成标题文字了
 *
 * 【为什么这份测试可信】
 * 它不用手写的期望值当标准答案，而是直接调用 **Astro 自己的
 * markdown 处理器**（@astrojs/markdown-remark，Astro 内部用的就是它），
 * 拿它算出来的 heading id 跟我们的对比。
 * 也就是说：标准答案是从真实管线里现取的，不是我以为的。
 *
 * 跑法：
 *   npm run toc:test
 * ============================================================
 */

import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import GithubSlugger from "github-slugger";

import { getTableOfContents } from "../../src/utils/getTableOfContents.ts";

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

/** Astro 用的那套 markdown 管线（不传配置，用默认的 remark/rehype） */
const processor = await createMarkdownProcessor({});

/**
 * 跑一篇 Markdown，同时拿到两边的结果。
 *
 * 注意这里只比 h2/h3 —— getTableOfContents 默认最深到 3 级，
 * 比 h4~h6 会误报。
 */
async function compare(markdown: string) {
  const { metadata } = await processor.render(markdown);

  const astro = metadata.headings
    .filter(heading => heading.depth >= 2 && heading.depth <= 3)
    .map(heading => ({ depth: heading.depth, id: heading.slug }));

  const ours = getTableOfContents(markdown).map(heading => ({
    depth: heading.depth,
    id: heading.id,
  }));

  return { astro, ours, markdown };
}

/** 把一条用例的两个结果对起来，返回可读的差异说明 */
function diffText(result: Awaited<ReturnType<typeof compare>>) {
  const lines: string[] = [];
  const max = Math.max(result.astro.length, result.ours.length);

  for (let i = 0; i < max; i++) {
    const a = result.astro[i];
    const o = result.ours[i];
    const same = a && o && a.id === o.id && a.depth === o.depth;
    lines.push(
      `       ${same ? " " : ">"} Astro=${JSON.stringify(a)}  我们=${JSON.stringify(o)}`
    );
  }

  return lines.join("\n");
}

/** 逐条比对，标题和 id 都要一致 */
async function expectSame(name: string, markdown: string) {
  const result = await compare(markdown);
  const ok =
    result.astro.length === result.ours.length &&
    result.astro.every(
      (heading, i) =>
        heading.id === result.ours[i].id && heading.depth === result.ours[i].depth
    );

  check(name, ok, ok ? "" : diffText(result));
}

/* ==================================================================
 * 1. 真正的坑：标题里的行内语法
 * ================================================================ */
console.log("\n=== 1. 标题里的行内语法 ===");

await expectSame("标题里有链接", "## 参考 [MDN](https://mdn.io)\n\n## 二");
await expectSame("标题里有行内代码", "## 用 `npm run dev` 启动\n\n## 二");
await expectSame("标题里有图片", "## 图片 ![架构图](./a.png) 说明\n\n## 二");
await expectSame("标题里有粗体", "## **重点**内容\n\n## 二");
await expectSame("链接里套着行内代码", "## 看 [`readJsonBody`](./a.ts) 的实现\n\n## 二");
await expectSame("转义的星号是字面量", "## 关于 \\*星号\\* 的说明\n\n## 二");

/**
 * 这一条用来证明上面的测试**不是空转** ——
 * 如果哪天有人把 toPlainText() 删掉，直接拿 Markdown 原文去 slug，
 * 这条会立刻红：两种算法的结果本来就不一样。
 */
{
  const markdown = "参考 [MDN](https://mdn.io)";
  const naive = new GithubSlugger().slug(markdown.trim());
  const stripped = new GithubSlugger().slug("参考 MDN");

  check(
    "不处理行内语法确实会算错（证明测试不是空转）",
    naive !== stripped,
    `不处理: ${naive} / 处理过: ${stripped}`
  );
}

/* ==================================================================
 * 2. 标题的写法差异
 * ================================================================ */
console.log("\n=== 2. 标题的写法差异 ===");

await expectSame("收尾井号不算文字", "## 标题 ##\n\n## 二");
await expectSame("最多三个空格缩进也算标题", "   ## 缩进的标题\n\n## 二");
await expectSame("词中间的_不是斜体", "## foo_bar 的用法\n\n## 二");
await expectSame("普通中英文混排", "## 为什么选择 Astro\n\n### 小结\n\n## 二");

/* ==================================================================
 * 3. 代码块
 * ================================================================ */
console.log("\n=== 3. 代码块里的 # 不算标题 ===");

await expectSame(
  "反引号围栏",
  "```bash\n# 这是注释不是标题\n```\n\n## 真标题\n\n## 二"
);
await expectSame(
  "波浪号围栏",
  "~~~bash\n# 这是注释不是标题\n~~~\n\n## 真标题\n\n## 二"
);
await expectSame(
  "围栏比三个长",
  "````md\n# 也不是标题\n````\n\n## 真标题\n\n## 二"
);

/* ==================================================================
 * 4. 重复标题的编号
 * ================================================================ */
console.log("\n=== 4. 重复标题的编号 ===");

/**
 * ⚠️ 这条是"顺序不能换"的回归测试。
 *
 * github-slugger 给重复标题编号（总结 / 总结-1 / 总结-2），
 * 而 Astro 是对**所有**级别编号的。
 * 如果实现里"深度超过 maxDepth 就直接 continue"、跳过了 slug()，
 * 计数器就少走一次，后面那条 h2 会算成"总结"而不是"总结-1"，
 * 目录会指到上面那个 h4 上去。
 */
await expectSame("跳过的深标题也要参与编号", "#### 总结\n\n## 总结\n\n## 总结");

const duplicated = getTableOfContents("## 总结\n\n## 总结\n\n## 总结");
check(
  "重复标题依次编号",
  duplicated.map(heading => heading.id).join(",") === "总结,总结-1,总结-2",
  duplicated.map(heading => heading.id).join(",")
);

/* ==================================================================
 * 5. 取出来的文字（目录里显示什么）
 * ================================================================ */
console.log("\n=== 5. 目录里的文字 ===");

const linked = getTableOfContents("## 参考 [MDN](https://mdn.io)\n\n## 二");
check(
  "显示的是链接文字，不是 Markdown 语法",
  linked[0].text === "参考 MDN",
  linked[0].text
);

const coded = getTableOfContents("## 用 `npm run dev` 启动\n\n## 二");
check(
  "行内代码去掉反引号",
  coded[0].text === "用 npm run dev 启动",
  coded[0].text
);

/* ==================================================================
 * 6. 边界情况
 * ================================================================ */
console.log("\n=== 6. 边界情况 ===");

check("空字符串不报错", getTableOfContents("").length === 0);
check(
  "只有一个标题时不显示目录",
  getTableOfContents("## 唯一的标题").length === 0
);
check(
  "没有标题时是空数组",
  getTableOfContents("正文，没有标题。").length === 0
);
check(
  "h1 不进目录（它就是文章标题本身）",
  getTableOfContents("# 文章标题\n\n## 一节\n\n## 二节").length === 2
);
check(
  "默认最深到 h3，h4 不进目录",
  getTableOfContents("## 一\n\n### 二\n\n#### 三").length === 2
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

console.log("🎉 目录锚点正常");
