/**
 * RSS 2.0 订阅  /rss.xml
 * ============================================================
 * 内容在 src/lib/feed.ts 里统一构建（和 Atom 共用一份配置），
 * 这里只决定输出成哪种格式。
 *
 * 想删掉？见 src/lib/feed.ts 文件头写的 4 步。
 * ============================================================
 */
import { createFeed } from "@/lib/feed";

export async function GET() {
  const feed = await createFeed();

  return new Response(feed.rss2(), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
