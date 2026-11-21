/**
 * 实时 RSS / Atom 的数据入口
 * ============================================================
 * 只读取统一的公开文章数据，不依赖构建时的文章快照。
 * 想删除订阅：删两个 XML 路由、本文件和 createPostFeed.ts，
 * 再删 Layout.astro 的 alternate 链接、订阅测试及 README 登记。
 * ============================================================
 */
import { listPublicPosts } from "@/lib/publicPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { buildPostFeed } from "@/utils/createPostFeed";
import config from "@/config";

export async function createFeed() {
  const posts = getSortedPosts(await listPublicPosts());
  return buildPostFeed(posts, config.site, post =>
    getPostUrl(post.id, post.filePath)
  );
}
