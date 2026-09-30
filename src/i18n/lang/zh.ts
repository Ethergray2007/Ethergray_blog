import type { UIStrings } from "../types";

export default {
  nav: {
    home: "首页",
    posts: "文章",
    tags: "标签",
    about: "关于",
    archives: "归档",
    search: "搜索",
    now: "近况",
  },

  post: {
    publishedAt: "发表于",
    updatedAt: "更新于",
    readingTime: "约 {{minutes}} 分钟阅读",
    toc: "目录",
    sharePostIntro: "分享这篇文章：",
    sharePostOn: "分享到 {{platform}}",
    sharePostViaEmail: "通过邮件分享这篇文章",
    tagLabel: "标签",
    backToTop: "返回顶部",
    goBack: "返回",
    editPage: "编辑页面",
    previousPost: "上一篇",
    nextPost: "下一篇",
  },

  pagination: {
    prev: "上一页",
    next: "下一页",
    page: "第",
  },

  home: {
    socialLinks: "社交链接",
    badge: "博客",
    heroTitle: "欢迎",
    heroLead: "欢迎来到我的博客。",
    heroMore:
      "这里记录算法、编程、图形学学习过程，以及值得长期保留的技术内容。",
    viewReadme: "查看 README",
    viewProfile: "个人主页",
    featured: "精选文章",
    featuredDesc: "值得优先阅读的文章",
    recentPosts: "最近文章",
    recentPostsDesc: "最近更新的文章",
    allPosts: "全部文章",
  },

  footer: {
    copyright: "版权所有",
    copyrightLine: "版权所有 © {{year}} {{author}}",
    allRightsReserved: "保留所有权利。",
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

    nowTitle: "近况",
    nowDesc: "我现在在做什么、在学什么。",
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
    username: "用户名",
    password: "密码",
    signIn: "登录",
    signingIn: "登录中……",

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
