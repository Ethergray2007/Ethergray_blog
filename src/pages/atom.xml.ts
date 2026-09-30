/**
 * Atom 订阅  /atom.xml
 * ============================================================
 * 已经有 RSS 了，为什么还要 Atom？
 *   · 有些阅读器（尤其是国外的）只认 Atom
 *   · Atom 是后来的标准，规定更严格：时间必须是 RFC 3339、
 *     每条必须有全局唯一的 id、必须写明更新时间和作者
 *   · RSS 2.0 的时间格式（RFC 822）有歧义，Atom 没有
 *
 * 两个都提供，读者用哪个都行。这也是很多博客的做法。
 *
 * 【为什么手写 XML 而不是用库】
 * 查过了：@astrojs/rss 只生成 RSS 2.0，不支持 Atom；
 * 官方也没有 @astrojs/feed 这个包（npm 上不存在）。
 * 所以最省事的做法是按规范手写 —— Atom 的结构很固定，
 * 而且这里的转义逻辑有测试兜底（见 practice/tests/feed.ts）。
 *
 * 想删掉 Atom？
 *   1. 删掉这个文件
 *   2. 删掉 Layout.astro 里的 <link rel="alternate" type="application/atom+xml">
 *   3. 删掉 src/utils/escapeXml.ts（如果 RSS 那边也不需要了）
 * ============================================================
 */
import { getCollection } from "astro:content";

import { escapeXml } from "@/utils/escapeXml";
import { getPostUrl } from "@/utils/getPostPaths";
import { getSortedPosts } from "@/utils/getSortedPosts";
import config from "@/config";

/** 把相对路径拼成完整网址 */
function absolute(path: string): string {
  return new URL(path, config.site.url).href;
}

/** 时间要转成 Atom 要求的 RFC 3339 格式（例如 2026-09-30T21:10:00+08:00） */
function toRfc3339(date: Date): string {
  return date.toISOString();
}

export async function GET() {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);
  const siteUrl = absolute("/");

  /**
   * 整个订阅源的更新时间 = 最新一篇文章的时间。
   * 没有文章时退回当前时间（Atom 要求这个字段必须存在）。
   */
  const feedUpdated =
    sortedPosts.length > 0
      ? new Date(
          sortedPosts[0].data.modDatetime ?? sortedPosts[0].data.pubDatetime
        )
      : new Date();

  /**
   * 每条文章。
   *
   * Atom 里每一条**必须**有 id —— 阅读器靠它判断"这条是不是新的"。
   * 用文章网址当 id 是标准做法（永久链接天然唯一）。
   */
  const entries = sortedPosts
    .map(({ data, id, filePath }) => {
      const url = absolute(getPostUrl(id, filePath));
      const updated = new Date(data.modDatetime ?? data.pubDatetime);

      return [
        "  <entry>",
        `    <title>${escapeXml(data.title)}</title>`,
        `    <link href="${escapeXml(url)}"/>`,
        `    <id>${escapeXml(url)}</id>`,
        `    <updated>${toRfc3339(updated)}</updated>`,
        `    <published>${toRfc3339(new Date(data.pubDatetime))}</published>`,
        `    <summary>${escapeXml(data.description)}</summary>`,
        `    <author><name>${escapeXml(config.site.author)}</name></author>`,
        ...(data.tags ?? []).map(
          tag => `    <category term="${escapeXml(tag)}"/>`
        ),
        "  </entry>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="' +
      escapeXml(config.site.lang) +
      '">',
    `  <title>${escapeXml(config.site.title)}</title>`,
    `  <subtitle>${escapeXml(config.site.description)}</subtitle>`,
    `  <link href="${escapeXml(absolute("/atom.xml"))}" rel="self"/>`,
    `  <link href="${escapeXml(siteUrl)}"/>`,
    `  <id>${escapeXml(siteUrl)}</id>`,
    `  <updated>${toRfc3339(feedUpdated)}</updated>`,
    `  <author><name>${escapeXml(config.site.author)}</name></author>`,
    `  <generator>Astro</generator>`,
    entries,
    "</feed>",
  ]
    .filter(line => line !== "")
    .join("\n");

  return new Response(xml, {
    headers: { "content-type": "application/atom+xml; charset=utf-8" },
  });
}
