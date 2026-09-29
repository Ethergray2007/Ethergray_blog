export interface UIStrings {
  nav: {
    home: string;
    posts: string;
    tags: string;
    about: string;
    archives: string;
    search: string;
    /** /now 页面（近况） */
    now: string;
  };
  post: {
    publishedAt: string;
    updatedAt: string;
    /** 阅读时长，`{{minutes}}` 会被替换成分钟数 */
    readingTime: string;
    /** 文章目录（TOC）的标题 */
    toc: string;
    sharePostIntro: string;
    sharePostOn: string;
    sharePostViaEmail: string;
    tagLabel: string;
    backToTop: string;
    goBack: string;
    editPage: string;
    previousPost: string;
    nextPost: string;
  };
  pagination: {
    prev: string;
    next: string;
    page: string;
  };
  home: {
    socialLinks: string;
    /** 首页徽标文案，例如 “Blog” */
    badge: string;
    /** 首页大标题 */
    heroTitle: string;
    /** 首页主介绍段落 */
    heroLead: string;
    /** 首页补充介绍段落 */
    heroMore: string;
    /** 首页按钮：查看仓库说明 */
    viewReadme: string;
    /** 首页按钮：进入个人主页 */
    viewProfile: string;
    featured: string;
    /** 精选区块副标题 */
    featuredDesc: string;
    recentPosts: string;
    /** 最近文章区块副标题 */
    recentPostsDesc: string;
    allPosts: string;
  };
  footer: {
    copyright: string;
    /**
     * 完整版权行，可用 `{{year}}` / `{{author}}` 占位。
     * 放在语言文件里拼好，避免在模板里多个表达式相邻导致空格被 HTML 吞掉。
     */
    copyrightLine: string;
    allRightsReserved: string;
  };
  pages: {
    tagTitle: string;
    tagDesc: string;

    tagsTitle: string;
    tagsDesc: string;

    postsTitle: string;
    postsDesc: string;

    archivesTitle: string;
    archivesDesc: string;

    searchTitle: string;
    searchDesc: string;

    /** /now 页面（近况） */
    nowTitle: string;
    nowDesc: string;
  };
  a11y: {
    skipToContent: string;
    openMenu: string;
    closeMenu: string;
    toggleTheme: string;
    searchPlaceholder: string;
    noResults: string;
    goToPreviousPage: string;
    goToNextPage: string;
  };
  notFound: {
    title: string;
    message: string;
    goHome: string;
  };
}
