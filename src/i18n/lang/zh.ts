import type { UIStrings } from "../types";

export default {
  nav: {
    home: "首页",
    posts: "文章",
    tags: "标签",
    about: "关于我",
    credits: "本站与致谢",
    archives: "归档",
    search: "搜索",
    now: "近况",
    friends: "友链",
    notes: "说说",
    projects: "项目",
    rss: "RSS 订阅",
    more: "更多",
  },

  post: {
    updatedAt: "更新于",
    toc: "目录",
    headingLink: "本节链接",
    sharePostIntro: "分享这篇文章：",
    sharePostOn: "分享到 {{platform}}",
    sharePostViaEmail: "通过邮件分享这篇文章",
    tagLabel: "标签",
    backToTop: "返回顶部",
    editPage: "编辑页面",
    previousPost: "上一篇",
    nextPost: "下一篇",
    copy: "复制",
    copyCode: "复制代码",
    copied: "已复制",
    copyFailed: "复制失败",
    comments: "评论",
    commentsHint:
      "评论由 GitHub Discussions 提供，需要 GitHub 账号登录后才能发言。",
    commentsUnconfigured:
      "评论区还没配置：在 astro-paper.config.ts 的 comments 段里填好 repoId 和 categoryId。",
  },

  pagination: {
    prev: "上一页",
    next: "下一页",
    page: "第 {{n}} 页",
  },

  home: {
    badge: "博客",
    heroLead: "一个个人博客，写技术，也写学习过程本身。",
    viewSource: "博客源码",
    startReading: "开始阅读",
    featured: "精选文章",
    featuredDesc: "值得优先阅读的文章",
    motionTitle: "动图",
    motionDesc: "两张动图，随手放着。",
    browseTitle: "从哪看起",
    browseDesc: "按内容类型浏览",
    recentPosts: "最近文章",
    recentPostsDesc: "最近更新的文章",
    allPosts: "全部文章",
  },

  footer: {
    copyrightLine: "© {{year}} {{author}}",
  },

  pages: {
    tagTitle: "标签",
    tagDesc: "包含该标签的所有文章",

    tagsTitle: "标签",
    tagsDesc: "文章中使用的所有标签。",

    postsTitle: "文章",
    postsDesc: "发布过的所有文章。",

    archivesTitle: "归档",
    archivesDesc: "所有已归档的文章。",

    searchTitle: "搜索",
    searchDesc: "搜索文章……",
    searchDevHintTitle: "开发环境提示",
    searchDevHintBody: "Pagefind 搜索索引需要先执行一次生产构建。",

    nowTitle: "近况",
    nowDesc: "我现在在做什么、在学什么。",

    friendsTitle: "友链",
    friendsDesc: "我常看的博客，以及一路认识的人。",

    notesTitle: "说说",
    notesDesc: "随手记的一些碎片，不成文章。",

    projectsTitle: "项目",
    projectsDesc: "我在做和在学的东西。",

    rssTitle: "RSS 订阅",
    rssDesc: "用 RSS 阅读器订阅本站最新文章。",
  },

  friends: {
    empty: "还没有友链。",
    count: "{{n}} 个友链",
    openSite: "在新窗口打开",
  },

  notes: {
    empty: "还没有说说。",
  },

  projects: {
    empty: "还没有项目。",
    viewSource: "查看源码",
  },

  rss: {
    feedTitle: "订阅地址",
    feedDesc:
      "把下面这个地址填进任意 RSS/Atom 阅读器（Feedly、Inoreader、Follow、NetNewsWire 等），有新文章就会自动送到你手里。",
    copy: "复制链接",
    copyLabel: "复制订阅地址",
    copied: "已复制",
    copyFailed: "复制失败",
    viewXml: "查看原始 XML",
    howToTitle: "如何订阅",
    howToDesc: "不用注册任何账号 —— 把上面的地址粘进下面任意一个阅读器就行。",
    webGroup: "网页版 / 跨平台",
    appGroup: "桌面 / 手机应用",
    latestTitle: "最新推送文章",
    latestDesc: "订阅之后，阅读器里收到的就是这些内容。",
    allPosts: "查看全部文章",
  },

  a11y: {
    skipToContent: "跳转到主要内容",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    toggleTheme: "切换主题",
    searchPlaceholder: "搜索文章……",
    noResults: "未找到结果",
    goToPreviousPage: "前往上一页",
    goToNextPage: "前往下一页",
  },

  notFound: {
    title: "404 未找到",
    message: "页面未找到",
    goHome: "返回首页",
  },

  admin: {
    loginTitle: "登录后台",
    signInWithGithub: "用 GitHub 登录",
    githubHint: "只有博客主人的 GitHub 账号能登录。",

    postsTitle: "文章管理",
    newPost: "写新文章",
    edit: "编辑",
    delete: "删除",
    confirmDelete: "确定要删除这篇文章吗？删掉之后无法恢复。",

    editTitle: "编辑文章",
    newPostTitle: "写新文章",
    fieldTitle: "标题",
    fieldSlug: "网址标识",
    slugHint: "留空就根据标题自动生成。改它会让旧链接失效。",
    fieldDescription: "摘要",
    fieldBody: "正文（Markdown）",
    fieldTags: "标签",
    tagsHint: "用英文逗号分隔，例如：Astro, 笔记",
    fieldStatus: "状态",
    statusDraft: "草稿",
    statusPublished: "已发布",
    fieldFeatured: "置顶",
    save: "保存",
    saving: "保存中……",
    saved: "已保存",
    rebuild: "立即重建",
    rebuilding: "正在请求……",
    rebuildOk: "已请求重建，约 1~2 分钟后生效。",
    rebuildNotConfigured: "没有配置 NETLIFY_BUILD_HOOK_URL，点了也不会重建。",
    rebuildFailed: "通知 Netlify 失败了，看服务端日志。",
    savedNeedsRebuild:
      "已保存到数据库。要让它出现在站点上，点右边的「立即重建」。",
    savedAsDraft: "已保存为草稿。草稿不会出现在站点上。",
    invalidPostId: "网址里的文章编号不对。",
    titleRequired: "标题不能为空。",
    loadFailed: "加载文章失败。",
    saveFailed: "保存文章失败。",
    rebuildRequestFailed: "重建请求失败。",
    apiBadRequest: "提交的数据不正确，请检查后重试。",
    apiNotFound: "找不到这篇文章，请刷新页面后重试。",
    apiSlugTaken: "这个网址标识已被占用，请换一个。",
    apiInternal: "服务器暂时出错，请稍后重试。",
    apiRequestFailed: "请求失败，请稍后重试。",
    rebuildHint: "每次重建消耗 Netlify 15 积分",
    backToList: "返回列表",
    logout: "登出",

    loading: "加载中……",
    empty: "还没有文章。点上面的「写新文章」开始吧。",

    colTitle: "标题",
    colStatus: "状态",
    colUpdated: "更新时间",
    colActions: "操作",
  },
} satisfies UIStrings;
