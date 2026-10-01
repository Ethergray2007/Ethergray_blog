/**
 * Atom 1.0 订阅  /atom.xml
 * ============================================================
 * 已经有 RSS 了，为什么还要 Atom？
 *   · 有些阅读器（尤其是国外的）只认 Atom
 *   · Atom 是后来的标准，规定更严格：时间必须是 RFC 3339、
 *     每条必须有全局唯一的 id、必须写明更新时间和作者
 *   · RSS 2.0 的时间格式（RFC 822）有歧义，Atom 没有
 *
 * 两个都提供，读者用哪个都行。这也是很多博客的做法。
 *
 * 内容在 src/lib/feed.ts 里统一构建（和 RSS 共用一份配置），
 * 这里只决定输出成哪种格式。
 *
 * 想删掉？见 src/lib/feed.ts 文件头写的 4 步。
 * ============================================================
 */
import { createFeed } from "@/lib/feed";

export async function GET() {
  const feed = await createFeed();

  return new Response(feed.atom1(), {
    headers: { "content-type": "application/atom+xml; charset=utf-8" },
  });
}
