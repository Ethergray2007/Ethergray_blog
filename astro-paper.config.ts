import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://ethergray.netlify.app/",
    title: "Ethergray Blog",
    description: "Ethergray 的个人博客",
    author: "Ethergray",
    profile: "https://github.com/Ethergray2007",
    ogImage: "default-og.jpg",
    lang: "zh",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      /**
       * 编辑地址的**前缀**，后面拼文章在数据库里的 id。
       *
       * 以前这里填的是 GitHub 的编辑地址，因为文章是 git 里的 Markdown 文件。
       * 文章搬进数据库之后 GitHub 上没有这个文件了，所以改成指向后台的编辑页。
       * 换成别的写作后台时，改这一行就行。
       */
      url: "/admin/posts/",
    },
    search: "pagefind",
  },
 socials: [
  {
    name: "github",
    url: "https://github.com/Ethergray2007",
  },
  {
    name: "x",
    url: "https://x.com/Ethergray2007",
  },
],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
  /**
   * 评论区（Giscus）。
   *
   * 评论存在这个仓库的 GitHub Discussions 里，读者要用 GitHub 账号登录才能发言。
   * 前置条件两件都要做，缺一个评论区就加载不出来：
   *   1. 给仓库装上 giscus App —— https://github.com/apps/giscus
   *   2. 在仓库设置里打开 Discussions（Settings → General → Features → Discussions）
   *
   * repoId / categoryId 这两串是 GitHub 的 node id（不是名字），别手写：
   * 打开 https://giscus.app 填上仓库名，配置页会把它们显示出来。
   * categoryId 是**某个分类**的 id —— 换分类或换仓库都要重新取，
   * 这两串配错的表现是评论框空白、或者提示 repo not found。
   *
   * 现在两个 id 都填好了（Announcements 分类），文章页就会显示评论区；
   * 把 categoryId 清空则整块评论区不渲染（组件见 GiscusComments.astro）。
   */
  comments: {
    repo: "Ethergray2007/Ethergray_blog",
    repoId: "R_kgDOUphqrw",
    category: "Announcements",
    categoryId: "DIC_kwDOUphqr84DIbFq",
  },
});