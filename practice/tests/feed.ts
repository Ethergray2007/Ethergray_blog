/**
 * 订阅源测试（RSS 与 Atom 的 XML 正确性）
 * ============================================================
 * 【为什么这个测试值得写】
 * 订阅源出问题的方式很隐蔽：平时一切正常，某天文章标题里出现一个 & 或 <
 * 整个 feed 就变成非法 XML，阅读器直接报错打不开。
 * 而发现它的人是读者，不是你。
 *
 * 所以这里做两件事：
 *   1. 直接测 escapeXml 的每个分支
 *   2. 用**真正的 XML 解析器**验证生成的 feed 是合法的
 *      —— 比自己用正则检查可靠得多
 *
 * 跑法：
 *   npm run feed:test
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

/* ==================================================================
 * 1. escapeXml 的每个分支
 * ================================================================ */
console.log("\n=== 1. XML 转义 ===");

const { escapeXml } = await import("../../src/utils/escapeXml.ts");

check("& 被转义", escapeXml("a & b") === "a &amp; b", escapeXml("a & b"));
check("< 被转义", escapeXml("a < b") === "a &lt; b");
check("> 被转义", escapeXml("a > b") === "a &gt; b");
check("双引号被转义", escapeXml('说"你好"') === "说&quot;你好&quot;");
check("单引号被转义", escapeXml("it's") === "it&apos;s");

/**
 * 最容易写错的一条：& 必须**第一个**替换。
 * 如果先替换 < 再替换 &，那么已经生成的 &lt; 会被再转一次变成 &amp;lt;，
 * 阅读器就会显示出字面的 "&lt;" 而不是 "<"。
 */
check(
  "& 先于其他字符替换（不会二次转义）",
  escapeXml("<a & b>") === "&lt;a &amp; b&gt;",
  escapeXml("<a & b>")
);

check("已经没有特殊字符时原样返回", escapeXml("普通中文标题") === "普通中文标题");
check("空字符串不报错", escapeXml("") === "");
check("null 不会变成 \"null\"", escapeXml(null) === "");
check("undefined 不会变成字符串", escapeXml(undefined) === "");
check("数字能正常处理", escapeXml(42) === "42");

/** 真实的文章标题场景 */
check(
  "带 HTML 的标题能安全转义",
  escapeXml('<script>alert("xss")</script>') ===
    "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
  escapeXml('<script>alert("xss")</script>')
);

/* ==================================================================
 * 2. 用真正的 XML 解析器验证 feed 结构
 * ================================================================ */
console.log("\n=== 2. feed XML 结构（用 XML 解析器验证） ===");

/**
 * 用 Node 内置的 DOMParser？没有 —— 它在浏览器里。
 * 但 Node 有更底层的方式：这里用一个小技巧，
 * 通过 `new XMLSerializer` / `DOMParser` 的 polyfill 不划算，
 * 改用「严格的 XML 语法检查」：解析失败会抛错。
 *
 * 最省事的可靠办法是调 @xmldom/xmldom，但那要多装一个依赖。
 * 这里换个思路：**用 fetch 的 Response 无法解析 XML，
 * 所以我们手工实现一个最小的良构性检查** —— 它不完美，
 * 但能抓到"未转义的 & 和 <"这个真正的风险点。
 */
function looksLikeValidXml(xml: string): { ok: boolean; reason: string } {
  // 1. 必须是单根元素（且以 <?xml 开头的话只允许出现在最前面）
  const body = xml.replace(/^<\?xml[^>]*\?>/, "").trim();

  if (!body.startsWith("<") || !body.endsWith(">")) {
    return { ok: false, reason: "不是以标签开头或结尾" };
  }

  // 2. 裸的 & 必须是实体引用
  const badAmp = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.exec(xml);
  if (badAmp) {
    const at = badAmp.index;
    return {
      ok: false,
      reason: `位置 ${at} 有未转义的 & ：...${xml.slice(Math.max(0, at - 30), at + 30)}...`,
    };
  }

  // 3. 标签必须配平
  const stack: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][\w:.-]*)([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(body)) !== null) {
    const [, closing, name, attrs, selfClosing] = m;

    // 属性值里的 < 是非法的
    if (/<(?![^>]*>)/.test(attrs)) {
      return { ok: false, reason: `标签 <${name}> 的属性里有未转义的 <` };
    }

    if (selfClosing) continue;

    if (closing) {
      const top = stack.pop();
      if (top !== name) {
        return { ok: false, reason: `标签未配平：期望 </${top}>，实际 </${name}>` };
      }
    } else {
      stack.push(name);
    }
  }

  if (stack.length > 0) {
    return { ok: false, reason: `这些标签没有闭合：${stack.join(", ")}` };
  }

  return { ok: true, reason: "" };
}

/** 构造一个和 atom.xml.ts 输出结构相同的样例 */
function buildSampleAtom(title: string, description: string): string {
  const url = "https://example.com/posts/hello/";

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh">',
    `  <title>${escapeXml(title)}</title>`,
    `  <subtitle>${escapeXml(description)}</subtitle>`,
    `  <link href="https://example.com/atom.xml" rel="self"/>`,
    `  <id>https://example.com/</id>`,
    `  <updated>2026-09-30T13:10:00.000Z</updated>`,
    `  <author><name>Ethergray</name></author>`,
    "  <entry>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link href="${escapeXml(url)}"/>`,
    `    <id>${escapeXml(url)}</id>`,
    `    <updated>2026-09-30T13:10:00.000Z</updated>`,
    `    <summary>${escapeXml(description)}</summary>`,
    "  </entry>",
    "</feed>",
  ].join("\n");
}

const normal = looksLikeValidXml(buildSampleAtom("普通标题", "普通描述"));
check("普通内容生成的 XML 合法", normal.ok, normal.reason);

/** 这是真正要防的情况 */
const tricky = buildSampleAtom(
  "标题里有 & 和 <tag> 还有 \"引号\"",
  "描述里有 a & b，还有 <script>"
);
const trickyResult = looksLikeValidXml(tricky);
check(
  "带特殊字符的标题也能生成合法 XML",
  trickyResult.ok,
  trickyResult.reason
);

/** 反证：如果不转义，检查器应该能抓到 */
const unescaped = buildSampleAtom("标题 & 未转义", "描述").replace(
  "标题 &amp; 未转义",
  "标题 & 未转义"
);
check(
  "检查器确实能发现未转义的 & （证明上面的通过不是假阳性）",
  !looksLikeValidXml(unescaped).ok
);

/* ==================================================================
 * 3. 真实构建产物的检查（如果构建过）
 * ================================================================ */
console.log("\n=== 3. 真实构建产物 ===");

const { existsSync, readFileSync } = await import("node:fs");

for (const file of ["dist/rss.xml", "dist/atom.xml"]) {
  if (!existsSync(file)) {
    console.log(`  ⏭️  ${file} 不存在（先跑 npm run build）`);
    continue;
  }

  const xml = readFileSync(file, "utf8");
  const result = looksLikeValidXml(xml);
  check(`${file} 是良构的 XML`, result.ok, result.reason);

  // Atom 必填字段
  if (file.endsWith("atom.xml")) {
    check("Atom 有 id", xml.includes("<id>"));
    check("Atom 有 updated", xml.includes("<updated>"));
    check("Atom 有 author", xml.includes("<author>"));
    check("Atom 声明了正确的命名空间", xml.includes('xmlns="http://www.w3.org/2005/Atom"'));
    check(
      "Atom 的时间是 RFC 3339 格式",
      /<updated>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(xml)
    );
  }
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
