export interface UIStrings {
  nav: {
    home: string;
    posts: string;
    tags: string;
    about: string;
    /** /about 保留原有致谢内容，作者介绍由 /profile 承担 */
    credits: string;
    archives: string;
    search: string;
    /** /now 页面（近况） */
    now: string;
    /** /friends 页面（友链） */
    friends: string;
    /** /notes 页面（说说） */
    notes: string;
    /** /projects 页面（项目） */
    projects: string;
    /**
     * /rss 页面（RSS 订阅说明）。
     *
     * 页眉「更多」菜单和面包屑都用这一条 —— 和 /now 一个待遇：
     * 它是辅助页面，不是内容类型，所以不进主导航。
     */
    rss: string;
    /**
     * 页眉「更多」菜单的标题。
     *
     * 标签 / 归档 / 近况 / 关于这四个辅助页面从页脚搬到了这个菜单里，
     * 所以页眉需要一个词把它们收起来。用「更多」而不是「关于」之类的
     * 具体分类名：这四个页面之间没有共同的"用途"，硬起一个分类名
     * 反而会让人猜不到里面有什么。
     */
    more: string;
  };
  post: {
    updatedAt: string;
    /** 文章目录（TOC）的标题 */
    toc: string;
    /**
     * 悬停在正文标题旁那个「#」锚点链接上的说明。
     *
     * 读屏软件会念它 —— 「#」这个符号本身没有语义，
     * 不解释的话用户只会听到「井号，链接」。
     */
    headingLink: string;
    sharePostIntro: string;
    sharePostOn: string;
    sharePostViaEmail: string;
    tagLabel: string;
    backToTop: string;
    editPage: string;
    previousPost: string;
    nextPost: string;
    /**
     * 代码块复制按钮。
     *
     * 【为什么这些文案要放在这里】
     * 它们写在 CopyCodeButton.astro 的 <script> 里（客户端脚本），
     * 而脚本是**在浏览器里跑**的，读不到服务端渲染时用的 t 对象 ——
     * 所以走"服务端把文案渲染进 data-*、脚本再去读"的路子：
     * 文章页把这四条写到 article 的 data-copy-* 上，
     * 和标题锚点用的 data-heading-link-label 是同一套办法。
     * 不能因为"它在 JS 里"就把中文写死在脚本里，那样英文站点会半中半英。
     */
    copy: string;
    /** 读屏软件用的按钮说明，比按钮上的字更完整 */
    copyCode: string;
    copied: string;
    copyFailed: string;
    /**
     * 评论区（Giscus）的标题和一行说明。
     *
     * 这两条由文章页在服务端渲染。giscus 自己那个 iframe 里的界面文字
     * 改不了（是它提供的），所以这里只管我们外面这一层。
     */
    comments: string;
    commentsHint: string;
    /**
     * 配置没填全（缺 repoId 或 categoryId）时，代替评论区出现的一行提示。
     * 只在开发环境显示 —— 线上宁可什么都不显示，也不要挂一块"没配对"的告示。
     */
    commentsUnconfigured: string;
  };
  pagination: {
    prev: string;
    next: string;
    /**
     * 页码，例如「第 3 页」。
     *
     * 必须带上 `{{n}}` 占位符（用 tplStr 填）—— 中英文语序不同，
     * 只存「第」这种半截词的话，中文会渲染成「文章 (第 1)」，少一个「页」。
     */
    page: string;
  };
  home: {
    /** 首页徽标文案，例如 “Blog” */
    badge: string;
    /** 首页主介绍段落 */
    heroLead: string;
    /** 首页按钮：查看仓库说明 */
    viewSource: string;
    startReading: string;
    featured: string;
    /** 精选区块副标题 */
    featuredDesc: string;
    /**
     * 首页「动图」区块的标题和副标题。
     *
     * 这一块放两张动画 GIF，用**原始尺寸**（560 宽）而不是铺满 ——
     * 铺满要放大约 3.4 倍，动漫线条会发虚；而且 GIF 放大后体积
     * 按平方增长（560 宽 324 KB → 1920 宽约 2 MB）。
     */
    motionTitle: string;
    motionDesc: string;
    /**
     * 首页「从哪看起」区块的标题。
     *
     * 文章之后提供说说、项目、友链和标签的轻量入口与真实数量。
     * 标签、归档等完整导航仍在页眉「更多」中，避免首页重复铺六张卡片。
     */
    browseTitle: string;
    /** 「从哪看起」区块副标题 */
    browseDesc: string;
    recentPosts: string;
    /** 最近文章区块副标题 */
    recentPostsDesc: string;
    allPosts: string;
  };
  footer: {
    /**
     * 完整版权行，可用 `{{year}}` / `{{author}}` 占位。
     * 放在语言文件里拼好，避免在模板里多个表达式相邻导致空格被 HTML 吞掉。
     */
    copyrightLine: string;
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

    /**
     * 开发环境下搜索页里那块提示（Pagefind 还没索引可查）。
     *
     * 【为什么要走 i18n，而不是留在 search.astro 的脚本里】
     * 这个提示是页面里的客户端脚本插进 DOM 的，写死在脚本里就只有中文，
     * 英文站点会半中半英 —— 和文章页复制按钮、/rss 页复制按钮
     * 是同一类问题（见 post.copy 上面那段说明）。
     * 所以由页面用 t.pages.* 渲染进 data-* 属性，脚本再去读。
     *
     * 只在开发环境显示 —— 线上搜索框是能用的，不该出现这块提示。
     */
    searchDevHintTitle: string;
    searchDevHintBody: string;

    /** /now 页面（近况） */
    nowTitle: string;
    nowDesc: string;

    /** /friends 页面（友链） */
    friendsTitle: string;
    friendsDesc: string;

    /** /notes 页面（说说） */
    notesTitle: string;
    notesDesc: string;

    /** /projects 页面（项目） */
    projectsTitle: string;
    projectsDesc: string;

    /** /rss 页面（RSS 订阅说明） */
    rssTitle: string;
    rssDesc: string;
  };
  /**
   * 友链页面上用到的零散文案。
   *
   * 【为什么只剩一个字段】
   * 原来还有 howToTitle / howToDesc / contactHint 三个，
   * 是"想交换友链？把你的信息按这个格式发给我"那段说明用的。
   * 那个区块已经去掉了（这个页面只放我认可的友链，不对外开放申请），
   * 文案跟着删 —— 界面上不显示的东西不要留在文案文件里，
   * 否则以后会分不清哪些还在用。
   */
  friends: {
    /** 一条友链都没有时显示 */
    empty: string;
    /**
     * 列表上方的条数，例如「8 个友链」。
     *
     * 必须带上 `{{n}}` 占位符（用 tplStr 填，见 src/i18n/format.ts）——
     * 中文说「8 个友链」、英文说「8 links」，
     * 中间那个量词没法用拼接拼出来，只能整句存在语言文件里。
     */
    count: string;
    /**
     * 卡片链接的读屏说明，例如「在新窗口打开」。
     *
     * 卡片上会拼成「站名 —— 在新窗口打开」再交给 aria-label，
     * 理由见 src/pages/friends.astro 里 openLabel 那段的注释。
     */
    openSite: string;
  };
  /** 说说页面上用到的零散文案 */
  notes: {
    /** 一条都没有时显示 */
    empty: string;
  };
  /** 项目页面上用到的零散文案 */
  projects: {
    /** 一个都没有时显示 */
    empty: string;
    /** 「查看源码」链接的文字 */
    viewSource: string;
  };
  /**
   * /rss 页面上用到的文案。
   *
   * 【为什么分成四段】
   * 页面上正好四块：订阅地址 / 复制按钮 / 如何订阅 / 最新推送文章。
   * 复制按钮那几条是给客户端脚本用的 —— 脚本在浏览器里跑，读不到服务端
   * 渲染时的 t 对象，所以页面把它们写进 button 的 data-* 属性，
   * 脚本再去读（和文章页的代码块复制按钮同一套办法）。
   */
  rss: {
    /** 「订阅地址」分区的标题和说明 */
    feedTitle: string;
    feedDesc: string;
    /** 按钮上的字 */
    copy: string;
    /** 读屏软件用的按钮说明，比按钮上的字更完整 */
    copyLabel: string;
    copied: string;
    copyFailed: string;
    /** 打开原始 XML 那个链接 */
    viewXml: string;
    /** 「如何订阅」分区 */
    howToTitle: string;
    howToDesc: string;
    webGroup: string;
    appGroup: string;
    /** 「最新推送文章」分区 */
    latestTitle: string;
    latestDesc: string;
    allPosts: string;
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
  /**
   * 后台（/admin）。
   *
   * 后台只有你一个人用，中英文都写上是为了保持 i18n 结构完整 ——
   * 加文案要同时改三个文件是项目的硬性约定，哪怕暂时用不到英文。
   */
  admin: {
    /** 登录页 */
    loginTitle: string;
    signInWithGithub: string;
    githubHint: string;
    /** 文章列表 */
    postsTitle: string;
    newPost: string;
    edit: string;
    delete: string;
    confirmDelete: string;
    /** 编辑器 */
    editTitle: string;
    newPostTitle: string;
    fieldTitle: string;
    fieldSlug: string;
    slugHint: string;
    fieldDescription: string;
    fieldBody: string;
    fieldTags: string;
    tagsHint: string;
    fieldStatus: string;
    statusDraft: string;
    statusPublished: string;
    fieldFeatured: string;
    save: string;
    saving: string;
    saved: string;

    /**
     * 重建站点（把数据库里的改动发布到线上）。
     *
     * 【为什么需要一个按钮，而不是保存就自动上线】
     *   Netlify 免费套餐每次生产部署花 15 积分（一个月 300）。
     *   改一篇已发布文章的错别字如果也自动重建，改五遍就是 75 积分。
     *   所以这种改动要作者自己确认满意了再按按钮。
     */
    rebuild: string;
    rebuilding: string;
    rebuildOk: string;
    rebuildNotConfigured: string;
    rebuildFailed: string;
    /** 保存之后的提醒：这次的改动不会自动上线 */
    savedNeedsRebuild: string;
    /** 保存草稿之后的提示：草稿不会出现在站点上 */
    savedAsDraft: string;
    invalidPostId: string;
    titleRequired: string;
    loadFailed: string;
    saveFailed: string;
    rebuildRequestFailed: string;
    apiBadRequest: string;
    apiNotFound: string;
    apiSlugTaken: string;
    apiInternal: string;
    apiRequestFailed: string;
    /** 按钮旁那行小字，写明点一下要花多少积分 */
    rebuildHint: string;

    backToList: string;
    logout: string;
    /** 状态提示 */
    loading: string;
    empty: string;
    /** 表格表头 */
    colTitle: string;
    colStatus: string;
    colUpdated: string;
    colActions: string;
  };
}
