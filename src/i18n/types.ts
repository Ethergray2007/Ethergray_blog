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
    /** /friends 页面（友链） */
    friends: string;
    /** /notes 页面（说说） */
    notes: string;
    /** /projects 页面（项目） */
    projects: string;
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
    /** 首页大标题 */
    heroTitle: string;
    /** 首页主介绍段落 */
    heroLead: string;
    /** 首页补充介绍段落 */
    heroMore: string;
    /** 首页按钮：查看仓库说明 */
    viewSource: string;
    /** 首页按钮：进入个人主页 */
    viewProfile: string;
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
     * 这个区块列的是各内容类型的入口（文章/说说/项目/友链/标签）+ 真实数量。
     * 存在的理由：顶部导航为了清爽只留了 4 个内容链接，
     * 「标签」「归档」这些被移到了页脚 —— 这个区块把那个缺口补回来，
     * 而且是带数量的，比一个光秃秃的链接更有信息量。
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
    /**
     * 页脚那句 slogan / 站点定位。
     *
     * 【为什么原来这里叫 allRightsReserved】
     * 原本是「保留所有权利。」，和上一行的「版权所有 ©」连起来是一句
     * 法律声明。但那种写法在任何中文博客上都长一样，是"没设计过"的
     * 典型标志；对个人博客来说也没有实际作用。
     * 现在换成一句短的站点定位 —— 页脚有内容可读，也才像这个站自己的。
     */
    tagline: string;
    /**
     * 页脚那组次要导航的无障碍名称。
     *
     * 读屏软件靠它把这一组链接和页面别的内容区分开
     * （会念成「次要导航，导航区域」）。
     * 没有它的话，用户只能听到一串没有上下文的光秃秃链接。
     */
    secondaryNav: string;
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

    /** /friends 页面（友链） */
    friendsTitle: string;
    friendsDesc: string;

    /** /notes 页面（说说） */
    notesTitle: string;
    notesDesc: string;

    /** /projects 页面（项目） */
    projectsTitle: string;
    projectsDesc: string;
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
