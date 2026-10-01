/**
 * 把 Markdown 文章导入数据库
 * ============================================================
 * 用法：
 *   npm run posts:import              正式导入
 *   npm run posts:import -- --dry-run 只解析并打印，不写数据库
 *
 * 它做三件事：
 *   1. 读 src/content/posts/ 下的 .md / .mdx
 *   2. 拆出 frontmatter（YAML 部分）和正文
 *   3. 按 slug 写进数据库：已存在就更新，不存在就新建
 *
 * 【为什么可以重复运行】
 *   走的是 upsertPostBySlug（SQL 的 ON CONFLICT DO UPDATE），
 *   所以导入中途出错可以放心重跑：不会出现两篇一样的文章，
 *   时间戳也不会被刷成"现在"（详见该函数的注释）。
 *
 * 【关于 .env】
 *   package.json 里的命令带了 node --env-file-if-exists=.env，
 *   所以这里不需要像 scripts/db-setup.ts 那样手写一段读 .env 的代码。
 *   已经存在的环境变量优先，所以线上/CI 注入的值不会被文件覆盖。
 *
 * 【导入之后这些 Markdown 文件就没用了】
 *   它们是这次迁移的**输入**，不是真相源。确认结果没问题后可以删掉 ——
 *   git 历史里留着完整原文：
 *     git checkout <那次提交> -- src/content/posts
 * ============================================================
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { parse as parseYaml } from "yaml";

import { createDb } from "../src/db/client.ts";
import {
  getPostBySlug,
  upsertPostBySlug,
} from "../src/db/repositories/posts.ts";
import { POST_STATUS } from "../src/db/schema.ts";

/** 文章的来源目录 */
const POSTS_DIR = "src/content/posts";

const dryRun = process.argv.includes("--dry-run");

/**
 * 把一篇 Markdown 拆成 frontmatter 和正文。
 *
 * 【为什么自己拆两行 ---】
 *   格式很简单：文件以 --- 开头，遇到下一个 --- 结束，中间是 YAML。
 *   这一步用正则就够了。
 *
 * 【为什么解析 YAML 要交给库】
 *   日期、引号、数组、多行字符串、缩进……每一项都有讲究。
 *   手写一个"够用"的解析器，第一篇文章就会踩到边界，
 *   而 frontmatter 解析错了不会报错，只会让字段悄悄变样。
 */
function splitFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);

  if (!match) {
    throw new Error(
      "找不到 frontmatter（文件应该以 --- 开头，中间是字段，再用一行 --- 结束）"
    );
  }

  const data: unknown = parseYaml(match[1]);

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("frontmatter 不是一个「字段: 值」结构");
  }

  return { data: data as Record<string, unknown>, body: match[2] };
}

/** 只接受字符串，别的类型（数字、布尔）一律当没写 */
function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** 只接受字符串数组，过滤掉里面的非字符串项 */
function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * 转成 Date，转不了就抛错（带上文件名和字段名）。
 *
 * ⚠️ yaml 包把 `2026-09-25T10:00:00+08:00` 解析成**字符串**，不是 Date
 *    （实测过）。所以这里要显式 new Date()。
 *    反过来，如果哪天换了 YAML 1.1 风格的解析器，它给的会是 Date 对象 ——
 *    所以两种都接住，不猜。
 */
function asDate(value: unknown, field: string, file: string): Date {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `${file}：${field} 不是合法时间（读到的是 ${JSON.stringify(value)}）`
    );
  }

  return date;
}

/* ------------------------------------------------------------ */

const files = (await readdir(POSTS_DIR)).filter(file =>
  /\.mdx?$/.test(file)
);

if (files.length === 0) {
  console.log(
    [
      "",
      `⚠️ ${POSTS_DIR} 里没有 .md 文件，没有东西可以导入。`,
      "",
      "如果文件已经被删掉了（导入完成后删掉的），想再跑一遍得先把它们找回来：",
      `  git checkout <那次提交> -- ${POSTS_DIR}`,
      "",
    ].join("\n")
  );

  process.exit(0);
}

console.log(
  `\n${dryRun ? "（dry-run，不写数据库）" : ""}准备导入 ${files.length} 篇：\n`
);

const db = dryRun ? null : createDb();

let created = 0;
let updated = 0;

for (const file of files) {
  const raw = await readFile(join(POSTS_DIR, file), "utf8");
  const { data, body } = splitFrontmatter(raw);

  /* 条目的 id / 网址用的是文件名，和 glob() 加载时的算法一致 */
  const slug = file.replace(/\.mdx?$/, "");

  const title = asString(data.title);

  if (!title) {
    throw new Error(`${file}：frontmatter 里缺少 title`);
  }

  const pubDatetime = asDate(data.pubDatetime, "pubDatetime", file);

  const modDatetime =
    data.modDatetime === undefined || data.modDatetime === null
      ? pubDatetime
      : asDate(data.modDatetime, "modDatetime", file);

  const input = {
    slug,
    title,
    description: asString(data.description) ?? "",
    body,
    tags: asStringArray(data.tags),
    status:
      data.draft === true ? POST_STATUS.draft : POST_STATUS.published,

    featured: data.featured === true,

    /**
     * 草稿也写上发布时间。
     *
     * 数据库只要求"已发布必须有发布时间"，草稿带着一个将来要发的时间
     * 没有任何坏处；而从 Markdown 搬过来时，它恰恰是最不该丢的信息
     * （后台里"草稿改成已发布"就不用再手工补时间了）。
     */
    publishedAt: pubDatetime,

    /**
     * 创建 / 修改时间用 frontmatter 里的时间，**不是"现在"**。
     * 否则导入完所有文章都会显示成"刚刚创建、刚刚修改"，
     * 列表按修改时间排序就会整体乱掉。
     */
    createdAt: pubDatetime,
    updatedAt: modDatetime,
  };

  if (dryRun) {
    console.log(
      `  · ${slug}\n` +
        `      ${title}\n` +
        `      ${input.status} · ${input.tags.join(" / ") || "无标签"} · ` +
        `正文 ${body.length} 字 · 发布 ${pubDatetime.toISOString()}`
    );

    continue;
  }

  const existing = await getPostBySlug(db!, slug);

  await upsertPostBySlug(db!, input);

  if (existing) {
    updated++;
    console.log(`  ♻️  更新 ${slug}`);
  } else {
    created++;
    console.log(`  ✅ 新建 ${slug}`);
  }
}

console.log(
  [
    "",
    dryRun ? "dry-run 结束，没有写任何数据。" : `完成：新建 ${created} 篇，更新 ${updated} 篇。`,
    "",
    ...(dryRun
      ? []
      : [
          "接下来：",
          "  1. npm run db:studio   看看数据对不对（可选）",
          "  2. npm run dev         打开站点确认文章还在",
          "  3. 确认没问题后，src/content/posts/ 下的 Markdown 就可以删了",
          "",
        ]),
    "",
  ].join("\n")
);
