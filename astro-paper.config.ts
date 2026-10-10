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
});