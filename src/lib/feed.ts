/**
 * 订阅源（RSS 2.0 + Atom 1.0）
 * ============================================================
 * 用 feed 这个库生成，两个订阅源共用这一份配置。
 *
 * 【为什么不再手写 XML】
 * 原来 atom.xml.ts 是自己拼 XML 字符串（98 行）+ 自己写 escapeXml 转义
 * （40 行），测试里还得再手写一个"XML 良构检查器"。
 * 当时文件头的注释写着"查过：@astrojs/rss 只生成 RSS 2.0，官方没有
 * Atom 的包"—— 但漏了 `feed`：它就是干这个的，
 * RSS 2.0 / Atom 1.0 / JSON Feed 都能出，
 * 转义、RFC 3339 时间、id/updated/author 这些必填字段都由它保证。
 *
 * 现在两个订阅源各自只剩几行（见 src/pages/rss.xml.ts、atom.xml.ts）。
 *
 * 想删掉订阅源？
 *   1. 删掉 src/pages/rss.xml.ts 和 src/pages/atom.xml.ts
 *   2. 删掉这个文件
 *   3. 删掉 Layout.astro 里两个 <link rel="alternate">
 *   4. 卸载 feed：npm uninstall feed
 * ============================================================
 */
import { getCollection } from "astro:content";
import { Feed } from "feed";

import { getPostUrl } from "@/utils/getPostPaths";
import { getSortedPosts } from "@/utils/getSortedPosts";
import config from "@/config";

/** 把站内路径拼成完整网址（订阅源里必须是绝对地址） */
function absolute(path: string): string {
  return new URL(path, config.site.url).href;
}

export async function createFeed(): Promise<Feed> {
  const sortedPosts = getSortedPosts(await getCollection("posts"));
  const siteUrl = absolute("/");

  /**
   * 整个订阅源的更新时间 = 最新一篇文章的时间。
   * 没有文章时退回当前时间 —— Atom 要求这个字段必须存在。
   */
  const updated =
    sortedPosts.length > 0
      ? new Date(
          sortedPosts[0].data.modDatetime ?? sortedPosts[0].data.pubDatetime
        )
      : new Date();

  const feed = new Feed({
    id: siteUrl,
    title: config.site.title,
    description: config.site.description,
    link: siteUrl,
    language: config.site.lang,
    updated,
    generator: "Astro",
    /* 两个订阅源互相声明，阅读器自己挑一个 */
    feedLinks: { rss: absolute("/rss.xml"), atom: absolute("/atom.xml") },
    author: { name: config.site.author, link: config.site.url },
  });

  for (const { data, id, filePath } of sortedPosts) {
    const url = absolute(getPostUrl(id, filePath));
    const updatedAt = new Date(data.modDatetime ?? data.pubDatetime);

    feed.addItem({
      title: data.title,
      /* Atom 里每条必须有 id，阅读器靠它判断"这条是不是新的"。
         用永久链接当 id 是标准做法。 */
      id: url,
      link: url,
      description: data.description,
      date: updatedAt,
      published: new Date(data.pubDatetime),
      category: (data.tags ?? []).map(term => ({ term })),
    });
  }

  return feed;
}
