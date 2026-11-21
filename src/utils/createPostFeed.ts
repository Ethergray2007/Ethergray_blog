/**
 * 公开文章生成订阅源
 * ============================================================
 * 自包含：只依赖 feed；文章和站点信息由调用方传入，便于用测试数据验证。
 * 想删除：先移除 src/lib/feed.ts 的调用，再删本文件和对应订阅测试，
 * 并移除 README 的订阅模块登记。
 * ============================================================
 */
import { Feed } from "feed";

type FeedPost = {
  id: string;
  filePath?: string;
  data: {
    title: string;
    description: string;
    pubDatetime: Date;
    modDatetime?: Date | null;
    tags: string[];
  };
};

type FeedSite = {
  url: string;
  title: string;
  description: string;
  lang: string;
  author: string;
};

export function buildPostFeed(
  posts: FeedPost[],
  site: FeedSite,
  postPath: (post: FeedPost) => string
): Feed {
  const absolute = (path: string) => new URL(path, site.url).href;
  // 不依赖传入顺序；Atom 的更新时间必须覆盖所有条目的最后修改时间。
  const updated = posts.length
    ? new Date(
        Math.max(
          ...posts.map(post =>
            new Date(post.data.modDatetime ?? post.data.pubDatetime).getTime()
          )
        )
      )
    : new Date();
  const feed = new Feed({
    id: absolute("/"),
    title: site.title,
    description: site.description,
    link: absolute("/"),
    language: site.lang,
    updated,
    generator: "Astro",
    feedLinks: { rss: absolute("/rss.xml"), atom: absolute("/atom.xml") },
    author: { name: site.author, link: site.url },
  });
  for (const post of posts) {
    const url = absolute(postPath(post));
    feed.addItem({
      id: url,
      link: url,
      title: post.data.title,
      description: post.data.description,
      date: new Date(post.data.modDatetime ?? post.data.pubDatetime),
      published: new Date(post.data.pubDatetime),
      category: post.data.tags.map(term => ({ term })),
    });
  }
  return feed;
}
