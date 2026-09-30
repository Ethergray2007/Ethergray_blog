import type { UIStrings } from "../types";

export default {
  nav: {
    home: "Home",
    posts: "Posts",
    tags: "Tags",
    about: "About",
    archives: "Archives",
    search: "Search",
    now: "Now",
  },
  post: {
    publishedAt: "Published at",
    updatedAt: "Updated",
    toc: "Table of Contents",
    sharePostIntro: "Share this post:",
    sharePostOn: "Share this post on {{platform}}",
    sharePostViaEmail: "Share this post via email",
    tagLabel: "Tags",
    backToTop: "Back to top",
    goBack: "Go back",
    editPage: "Edit page",
    previousPost: "Previous Post",
    nextPost: "Next Post",
  },
  pagination: {
    prev: "Prev",
    next: "Next",
    page: "Page",
  },
  home: {
    socialLinks: "Social Links",
    badge: "Blog",
    heroTitle: "Where I keep my notes",
    heroLead: "A personal blog about tech, and about learning itself.",
    heroMore:
      "Notes on algorithms, programming and computer graphics, plus the technical writing worth keeping around.",
    viewSource: "Source code",
    viewProfile: "Profile",
    featured: "Featured",
    featuredDesc: "Posts worth reading first",
    recentPosts: "Recent Posts",
    recentPostsDesc: "The latest updates",
    allPosts: "All Posts",
  },
  footer: {
    copyright: "Copyright",
    copyrightLine: "Copyright © {{year}} {{author}}",
    allRightsReserved: "All rights reserved.",
  },
  pages: {
    tagTitle: "Tag",
    tagDesc: "All the articles with the tag",

    tagsTitle: "Tags",
    tagsDesc: "All the tags used in posts.",

    postsTitle: "Posts",
    postsDesc: "All the articles I've posted.",

    archivesTitle: "Archives",
    archivesDesc: "All the articles I've archived.",

    searchTitle: "Search",
    searchDesc: "Search any article ...",

    nowTitle: "Now",
    nowDesc: "What I'm doing and learning right now.",
  },
  a11y: {
    skipToContent: "Skip to content",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    toggleTheme: "Toggle theme",
    searchPlaceholder: "Search posts...",
    noResults: "No results found",
    goToPreviousPage: "Go to previous page",
    goToNextPage: "Go to next page",
  },
  notFound: {
    title: "404 Not Found",
    message: "Page Not Found",
    goHome: "Go back home",
  },

  admin: {
    loginTitle: "Sign in",
    signInWithGithub: "Sign in with GitHub",
    githubHint: "Only the blog owner's GitHub account can sign in.",

    postsTitle: "Posts",
    newPost: "New post",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Delete this post? This cannot be undone.",

    editTitle: "Edit post",
    newPostTitle: "New post",
    fieldTitle: "Title",
    fieldSlug: "Slug",
    slugHint:
      "Leave empty to generate from the title. Changing it breaks old links.",
    fieldDescription: "Description",
    fieldBody: "Body (Markdown)",
    fieldTags: "Tags",
    tagsHint: "Comma separated, e.g. Astro, notes",
    fieldStatus: "Status",
    statusDraft: "Draft",
    statusPublished: "Published",
    fieldFeatured: "Featured",
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
    backToList: "Back to list",
    logout: "Sign out",

    loading: "Loading...",
    empty: "No posts yet. Click “New post” to start.",

    colTitle: "Title",
    colStatus: "Status",
    colUpdated: "Updated",
    colActions: "Actions",
  },
} satisfies UIStrings;
