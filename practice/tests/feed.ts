/**
 * 订阅源测试（RSS 2.0 与 Atom 1.0）
 * ============================================================
 * 【为什么这个测试值得写】
 * 订阅源出问题的方式很隐蔽：平时一切正常，某天文章标题里出现一个 & 或 <
 * 整个 feed 就变成非法 XML，阅读器直接报错打不开。
 * 而发现它的人是读者，不是你。
 *
 * 【为什么这里不再测转义、也不再自己写 XML 检查器】
 * 生成 XML 的活已经交给 feed 库了（见 src/lib/feed.ts），
 * 转义是它的责任、也有它自己的测试 —— 我们再测一遍既没意义，
 * 它一升级我们的测试还会碎。
 * 我们自己该盯的是**结果**：构建出来的 feed 能不能被真正的解析器读懂。
 *
 * 所以这里：用 fast-xml-parser 解析真实构建产物。
 * 之前那个 60 行的手写"标签配平检查器"已经删掉了 ——
 * XML 的规则比正则能覆盖的多得多，解析器说合法才算数。
 *
 * 跑法：
 *   npm run feed:test
 * ============================================================
 */
import { existsSync, readFileSync } from "node:fs";
import { XMLParser, XMLValidator } from "fast-xml-parser";

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

/* ==================================================================
 * 1. 真实构建产物
 * ================================================================ */
console.log("\n=== 1. 真实构建产物 ===");

const files = ["dist/rss.xml", "dist/atom.xml"];

/** 解析过的文档，key 是文件名 */
const docs = new Map<string, Record<string, any>>();

for (const file of files) {
  if (!existsSync(file)) {
    console.log(`  ⏭️  ${file} 不存在（先跑 npm run build）`);
    continue;
  }

  const xml = readFileSync(file, "utf8");

  /**
   * XMLValidator 是"良构"的判定标准：解析不出来就是非法 XML。
   * 它成功时返回 true，失败时返回带 err 的对象。
   */
  const valid = XMLValidator.validate(xml);
  const ok = valid === true;

  check(
    `${file} 是良构的 XML`,
    ok,
    ok ? "" : JSON.stringify((valid as { err?: unknown }).err ?? valid)
  );

  if (!ok) continue;

  docs.set(file, new XMLParser({ ignoreAttributes: false }).parse(xml));
}

/* ==================================================================
 * 2. Atom 的必填字段
 * ================================================================ */
console.log("\n=== 2. Atom 的必填字段 ===");

const atomXml = existsSync("dist/atom.xml")
  ? readFileSync("dist/atom.xml", "utf8")
  : "";
const atom = docs.get("dist/atom.xml")?.feed;

if (atom) {
  check("声明了 Atom 的命名空间", atomXml.includes('xmlns="http://www.w3.org/2005/Atom"'));
  check("有 feed 级 id", typeof atom.id === "string" && atom.id.length > 0);
  check("有 feed 级 updated", typeof atom.updated === "string");
  check("有 author", atom.author?.name !== undefined);
  check(
    "时间是 RFC 3339 格式",
    typeof atom.updated === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(atom.updated)
  );
  check("有 generator", typeof atom.generator === "string");
} else {
  console.log("  ⏭️  跳过（dist/atom.xml 不存在）");
}

/* ==================================================================
 * 3. RSS 的版本与条目
 * ================================================================ */
console.log("\n=== 3. RSS 2.0 ===");

const rss = docs.get("dist/rss.xml")?.rss;

if (rss) {
  check("版本是 2.0", String(rss["@_version"]) === "2.0");
  check("有 channel", rss.channel !== undefined);
  check("channel 有 title", typeof rss.channel?.title === "string");
} else {
  console.log("  ⏭️  跳过（dist/rss.xml 不存在）");
}

/* ==================================================================
 * 4. 两个订阅源说的是一回事
 * ================================================================ */
console.log("\n=== 4. 两个订阅源内容一致 ===");

/** 只有一个条目时解析结果不是数组，统一成数组再比 */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

const atomEntries = toArray(atom?.entry);
const rssItems = toArray(rss?.channel?.item);

/**
 * 取解析后的文字。
 *
 * ⚠️ 不能直接当字符串判断：feed 库给 Atom 的 title/summary 加了
 * `type="html"` 并用 CDATA 包起来，解析出来是
 * `{ "@_type": "html", "#text": "实际内容" }` 这种对象。
 * 第一版断言就栽在这里（`typeof === "string"` 永远为 false）。
 */
function textOf(value: unknown): string {
  if (typeof value === "string") return value;

  if (value !== null && typeof value === "object" && "#text" in value) {
    return String((value as Record<string, unknown>)["#text"]);
  }

  return "";
}

/** 取 Atom 条目的链接（属性在解析结果里叫 @_href） */
function hrefOf(value: unknown): string {
  if (value === null || typeof value !== "object") return "";

  return String((value as Record<string, unknown>)["@_href"] ?? "");
}

if (atom && rss) {
  check(
    "条目数一致",
    atomEntries.length === rssItems.length,
    `atom ${atomEntries.length} 条 / rss ${rssItems.length} 条`
  );

  check(
    "条目数不为零（真的写进去了）",
    atomEntries.length > 0,
    `实际 ${atomEntries.length} 条`
  );

  /** 每条都得有链接和标题 —— 少一个字段阅读器里就是一条空条目 */
  check(
    "Atom 每条都有标题和链接",
    atomEntries.every(
      entry => textOf(entry.title).length > 0 && hrefOf(entry.link).length > 0
    )
  );

  check(
    "RSS 每条都有标题和链接",
    rssItems.every(
      item => textOf(item.title).length > 0 && textOf(item.link).length > 0
    )
  );
} else {
  console.log("  ⏭️  跳过（需要两个文件都存在）");
}

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

console.log("🎉 订阅源正常");
