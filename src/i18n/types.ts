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
    publishedAt: string;
    updatedAt: string;
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
    viewSource: string;
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
