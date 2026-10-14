interface SiteConfig {
  /** Deployed URL of the site, e.g. "https://example.com" */
  url: string;
  /** Blog title shown in header and meta tags */
  title: string;
  /** Short description used in SEO meta and RSS feed */
  description: string;
  /** Default post author name */
  author: string;
  /** Author profile URL (used in structured data) */
  profile?: string;
  /** Fallback OG image filename in /public, e.g. "og.jpg" */
  ogImage?: string;
  /** HTML lang attribute, defaults to "en" */
  lang?: string;
  /** IANA timezone for post dates, e.g. "Asia/Bangkok" */
  timezone?: string;
  /** Text direction */
  dir?: "ltr" | "rtl" | "auto";
  /** Google Search Console verification meta tag value */
  googleVerification?: string;
}

interface PostsConfig {
  /** Posts per page on paginated listing pages */
  perPage?: number;
  /** Posts shown on the index/home page */
  perIndex?: number;
  /**
   * Scheduled posts within this window (ms) of their pubDatetime
   * are shown as published. Defaults to 15 minutes.
   */
  scheduledPostMargin?: number;
}

interface FeaturesConfig {
  /** Enable light/dark mode toggle. Defaults to true. */
  lightAndDarkMode?: boolean;
  /**
   * Generate dynamic OG images per post and provide `/og.png` when the static
   * `public/{site.ogImage}` file is absent. When false, that file is required
   * for the default layout OG image (build fails if missing).
   */
  dynamicOgImage?: boolean;
  /** Show the /archives page and link it in nav. Defaults to true. */
  showArchives?: boolean;
  /** Show back button on post detail pages. Defaults to true. */
  showBackButton?: boolean;
  /**
   * 文章页上的「编辑本页」链接。
   *
   * url 是**前缀**，后面拼文章在数据库里的 id（例如 "/admin/posts/" → "/admin/posts/3"）。
   * 文章存在数据库里之后，它指向写作后台而不是 GitHub。
   */
  editPost?:
    | {
        enabled: true;
        /** 编辑地址前缀，后面拼文章 id */
        url: string;
      }
    | { enabled: false };
  /**
   * Search provider. "pagefind" ships in the base template.
   * Set to false to disable search entirely.
   */
  search?: "pagefind" | false;
}

interface SocialLink {
  /**
   * Must match an SVG filename in src/assets/icons/socials/.
   * e.g. "github" → src/assets/icons/socials/github.svg
   */
  name: string;
  url: string;
  /**
   * Accessible label for the icon link (aria-label, title attribute).
   * Auto-generated if omitted: "{site.title} on GitHub", "Send an email to {site.title}", etc.
   * Override when the default wording doesn't fit.
   */
  linkTitle?: string;
}

interface ShareLink {
  /**
   * Must match an SVG filename in src/assets/icons/socials/.
   * e.g. "facebook" → src/assets/icons/socials/facebook.svg
   */
  name: string;
  /** Base share URL. The post URL will be appended as a query param. */
  url: string;
  /**
   * Accessible label for the icon link (aria-label, title attribute).
   * Auto-generated if omitted: "Share this post on Facebook", "Share this post via WhatsApp", etc.
   * Override when the default wording doesn't fit.
   */
  linkTitle?: string;
}

/**
 * 评论区（Giscus）。
 *
 * 【为什么 repoId / categoryId 不能省】
 * Giscus 的接口要的是 GitHub 的 **node id**（形如 R_kgDOUphqrw、DIC_kwDO...），
 * 不是仓库名和分类名的"另一种写法"。只给仓库名它会直接在页面上报错，
 * 所以这四个值要么都填、要么就不写 comments 这一段。
 *
 * 【这两个 id 从哪来】
 * 打开 https://giscus.app，填上仓库名，配置页会把 repoId 和 categoryId
 * 显示出来（下方那段生成的代码里就有）。
 */
interface GiscusConfig {
  /** 仓库全名，形如 "用户名/仓库名"。仓库必须是公开的 */
  repo: string;
  /** 仓库的 node id，不是仓库名 */
  repoId: string;
  /** Discussions 里的分类名，例如 "Announcements" */
  category: string;
  /** 分类的 node id，不是分类名 */
  categoryId: string;
}

interface AstroPaperConfig {
  site: SiteConfig;
  posts?: PostsConfig;
  features?: FeaturesConfig;
  /** Social profile links shown in header/footer */
  socials?: SocialLink[];
  /** Share links shown on post detail pages */
  shareLinks?: ShareLink[];
  /**
   * 评论区（Giscus）。
   * 不写这一段 = 文章页里没有评论区（组件会整块不渲染）。
   */
  comments?: GiscusConfig;
}

type ResolvedSiteConfig = Required<
  Pick<
    SiteConfig,
    | "url"
    | "title"
    | "description"
    | "author"
    | "lang"
    | "timezone"
    | "dir"
    | "ogImage"
  >
> &
  Pick<SiteConfig, "profile" | "googleVerification">;

export interface ResolvedAstroPaperConfig {
  site: ResolvedSiteConfig;
  posts: Required<PostsConfig>;
  features: Required<FeaturesConfig>;
  socials: SocialLink[];
  shareLinks: ShareLink[];
  /** 可选：没配置时文章页不渲染评论区 */
  comments?: GiscusConfig;
}

/**
 * Type helper for astro-paper.config.ts.
 * Provides full IntelliSense without any runtime overhead.
 */
export function defineAstroPaperConfig(
  config: AstroPaperConfig
): AstroPaperConfig {
  return config;
}
