/**
 * 文章集合的「数据库加载器」
 * ============================================================
 * Astro 从 5.0 起有了 Content Layer：一个集合的数据可以从任何地方来。
 * 自带的 `glob()` 只是"从文件系统读"那一种，这个文件提供"从数据库读"。
 *
 * 用它的好处是**上层的代码一行都不用改**：
 *   getCollection("posts")  /  render(post)  /  post.data.xxx
 * 在页面看来，文章还是文章，只是来的路上变了。
 *
 * 【为什么不让公开页面改成按需渲染（保存即生效）】
 *   因为搜索索引（Pagefind）是**构建时**产物 —— 运行时渲染出来的文章
 *   搜不到。也就是说"保存即生效"本来就做不到：想要搜索就躲不掉重新构建。
 *   既然躲不掉，就让页面继续在构建时生成静态 HTML，
 *   读者那边一点都没变慢（CDN 直接发，没有冷启动）。
 *   代价是文章改动要等一次自动重建（约 1~2 分钟），由 Netlify Build Hook 触发。
 *
 * 【为什么这里要自己调 renderMarkdown】
 *   文件型的文章（.md）是**延迟渲染**的：Astro 只记下文件路径，
 *   等页面真的用到时才去读那个文件、渲染它。
 *   我们的文章在数据库里，没有文件路径，延迟渲染无从下手，
 *   所以在加载时就渲染一次，把结果（HTML + 标题列表）一起存进 store。
 *
 *   renderMarkdown() 用的就是 astro.config.ts 里配的那条管线，
 *   所以数学公式（KaTeX）、callouts、代码高亮（Shiki）的行为
 *   和以前完全一致 —— 包括文章目录（TOC）需要的 headings。
 *
 * 想删掉这个功能（改回用 Markdown 文件存文章）？
 *   1. 删掉这个文件
 *   2. 把 src/content.config.ts 里 posts 的 loader 换成 glob()，
 *      参数照抄 git 历史里那一行（pattern / base 用 BLOG_PATH）
 *   3. 把文章放回 src/content/posts/
 *   （数据库里的内容不会自动变回 Markdown，需要自己导出）
 *
 * ⚠️ 上面第 2 步**故意不把那一行代码抄进来**。
 *    那个 pattern 里含有一对"星号 + 斜杠"的字符组合，
 *    而它正是块注释的结束符号 —— 一旦写进来，注释会**提前闭合**，
 *    后面的中文就被当成代码解析，报 Expression expected，
 *    整个构建挂掉。要抄原样就去 git 历史里看，别凭记忆写。
 *
 *    （这不是假想的坑：这个文件的第一版就是这么写坏的，
 *      报错信息只说"第 36 行表达式有问题"，完全看不出是注释的事。）
 *
 * ⚠️ 改完这个文件、或者改了 src/content.config.ts 之后，如果开发服务器上
 *    的页面看起来"代码明明写对了却输出 undefined"，**先删掉 .astro/
 *    再重启 dev server**，然后才去怀疑代码。
 *
 *    .astro/data-store.json 是集合数据的缓存，改了数据来源之后它不一定
 *    会重建。这个坑实测过：数据库里文章的 id 是 10，页面上「编辑本页」
 *    却是 /admin/posts/undefined —— 因为缓存里还是 glob() 时代的旧记录
 *    （没有 dbId，还带着一个已经被删掉的 filePath）。
 *
 *    生产构建不受影响（每次都是全新的），只是本地开发要注意。
 * ============================================================
 */
import type { Loader } from "astro/loaders";

import { getDb } from "../index.ts";
import { listAllPosts } from "../repositories/posts.ts";
import { POST_STATUS, type PostRow } from "../schema.ts";

/**
 * 「改过没有」的判定门槛。
 *
 * 【为什么需要这个门槛】
 *   数据库的 updated_at 是 notNull，而且每次保存都会刷新（哪怕只改了个
 *   featured）。直接把它当成"最后修改时间"交给页面，会连锁触发两件事：
 *
 *     1. Datetime.astro 会显示"更新于 <你最后一次按保存的时间>" ——
 *        每篇文章、每次保存之后都显示，哪怕正文一个字没改
 *     2. getSortedPosts 按"修改时间 ?? 发布时间"排序 ——
 *        于是改个错别字，一篇去年的老文章就顶到首页第一位，
 *        还会作为"最新一篇"推进 RSS 订阅者的阅读器
 *
 *   而以前用 Markdown 时，modDatetime 是**可选字段**（不写就没有），
 *   只有作者真想标明"这篇改过"时才写。为了不让行为悄悄变掉，
 *   这里用"和发布时间差了多久"来近似那个语义。
 *
 *   一分钟以内算同一次操作（刚发布完顺手改个错别字），不当作修改。
 */
const MODIFIED_THRESHOLD_MS = 60 * 1000;

/**
 * 数据库里的一行 → 集合条目需要的字段。
 *
 * 【为什么是导出的】
 *   这个映射是纯函数，也是这次改造里最容易悄悄出错的地方
 *   （draft 的反推、发布时间的兜底、dbId、修改时间的判定）。
 *   导出之后 practice/tests/db.ts 可以直接对它断言 ——
 *   否则每验证一行映射都要起一遍开发服务器。
 *
 * 【为什么草稿要用创建时间顶替发布时间】
 *   schema.ts 里的检查约束只保证"已发布必有发布时间"，草稿的
 *   published_at 可以是空的。但集合的 schema 要求 pubDatetime 必须有值
 *   （页面靠它排序和显示日期）。
 *   所以草稿退回用创建时间 —— 语义上也说得通：它现在的位置按创建时间算。
 *
 * 【为什么 draft 要从 status 反推】
 *   数据库里用的是字符串 status（draft / published，见 schema.ts 的说明），
 *   而模板的页面全都只看 data.draft 这个布尔值。
 *   在**入口**这里转换一次，比在上层十来个页面里各判一次要好。
 */
export function toEntryData(row: PostRow) {
  const publishedAt = row.publishedAt ?? row.createdAt;

  const isModified =
    row.updatedAt.getTime() - publishedAt.getTime() > MODIFIED_THRESHOLD_MS;

  return {
    dbId: row.id,
    title: row.title,
    description: row.description,
    pubDatetime: publishedAt,
    modDatetime: isModified ? row.updatedAt : null,
    tags: row.tags,
    featured: row.featured,
    draft: row.status !== POST_STATUS.published,
  };
}

/**
 * 读数据库，连不上就抛一个说得清楚的错误。
 *
 * 为什么不把错误直接放上去：
 *   驱动的报错长这样 —— "fetch failed" / "Connection terminated unexpectedly"，
 *   看不出是"要配数据库"还是"代码写错了"。
 *   而构建时连不上数据库是个**很常见**的情况（新克隆的仓库、CI 没配密钥、
 *   Neon 免费层被暂停），值得给一句能照着做的提示。
 */
async function loadRows(): Promise<PostRow[]> {
  try {
    return await listAllPosts(getDb());
  } catch (error) {
    throw new Error(
      [
        "",
        "读取文章失败：连不上数据库。",
        "",
        "文章存在数据库里，所以构建（npm run build / astro check）需要能连上它。",
        "",
        "  · 本地：确认 .env 里有 DATABASE_URL",
        "  · CI：确认仓库 Secrets 里有 DATABASE_URL",
        "  · 线上：确认 Netlify 的构建环境变量里有 DATABASE_URL",
        "  · Neon 免费层长时间不用会暂停，去控制台唤醒即可",
        "",
        `原始错误：${error instanceof Error ? error.message : String(error)}`,
        "",
      ].join("\n")
    );
  }
}

export function postsFromDatabase(): Loader {
  return {
    name: "posts-from-database",

    load: async ({
      store,
      logger,
      parseData,
      renderMarkdown,
      generateDigest,
    }) => {
      const rows = await loadRows();

      /**
       * 一篇文章都没有 → 直接让构建失败。
       *
       * 【为什么这条检查不能省】
       *   下面紧接着就是 store.clear()。如果数据库连上了、但一篇都没有，
       *   清空之后就什么都不会写进去 —— 结果是**构建成功、部署成功、
       *   站点变成空博客**：首页没有文章、文章页全 404、搜索索引是空的。
       *   Netlify 面板是绿的，CI 也是绿的，只能等读者来告诉你。
       *
       *   什么情况下会这样：DATABASE_URL 指向了**另一个**库
       *   （Neon 有分支，从控制台复制连接串时点错很常见），
       *   或者库被清空重来了。
       *
       *   这个站点保证至少有一篇文章，所以 0 行一定是配置错了，
       *   不是"这个博客还没写过东西"。
       */
      if (rows.length === 0) {
        throw new Error(
          [
            "",
            "数据库里一篇文章都没有，构建中止。",
            "",
            "这不正常 —— 博客至少有一篇文章。常见原因：",
            "  · DATABASE_URL 指向了另一个库（Neon 分支？新建的库？）",
            "  · 数据库刚被清空、迁移重跑过，而文章还没导回去",
            "",
            "确认连接串对不对，或者跑 npm run posts:import 把文章导进来。",
            "",
            "（为什么不就让它构建出一个空站点：那样 Netlify 和 CI 都是绿的，",
            "  线上却一篇文章都没有 —— 宁可这次构建失败。）",
            "",
          ].join("\n")
        );
      }

      /**
       * 先清空再全部写入。
       *
       * 数据库是唯一真相源，一次查询就能拿到全部文章，
       * 所以不需要 glob() 那套"记住哪些没被碰过再删掉"的增量逻辑。
       */
      store.clear();

      for (const row of rows) {
        const data = await parseData({ id: row.slug, data: toEntryData(row) });

        let rendered;

        try {
          rendered = await renderMarkdown(row.body);
        } catch (error) {
          /**
           * 渲染失败就让构建挂掉，并且**带上 slug**。
           *
           * 不用"记一条日志然后跳过"的写法：那样这篇文章会静默地
           * 从站点上消失（页面还在，正文空白），而构建是绿的 ——
           * 这种问题要等读者来告诉你。
           */
          throw new Error(
            `文章「${row.slug}」的正文渲染失败：${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }

        store.set({
          /**
           * 条目的 id 就是 slug。
           *
           * 页面用 getPostSlug(post.id, post.filePath) 算网址，
           * 而我们的条目没有 filePath（文章不在文件系统里），
           * 所以网址 = /posts/{id} = /posts/{slug}。
           */
          id: row.slug,
          data,
          body: row.body,
          digest: generateDigest({ data, body: row.body }),
          rendered,

          /**
           * 不传 filePath —— 文章不在文件系统里，传了反而是假的。
           *
           * 影响：「编辑本页」不再指向 GitHub（那儿已经没有这篇文章了），
           * 改为指向后台的编辑页，见 EditPost.astro 和 config 里的 editPost.url。
           */
        });
      }

      logger.info(`从数据库读了 ${rows.length} 篇文章`);
    },
  };
}
