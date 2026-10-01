/**
 * 后台专用的 API 调用工具
 * ============================================================
 * 自包含模块：只依赖浏览器自带的 fetch 和 Better Auth 的客户端。
 *
 * 这里有两部分：
 *   authClient  登录 / 登出 / 查登录状态（Better Auth 提供）
 *   postsApi    文章的增删改查（我们自己的接口）
 *
 * 为什么登录不自己写 fetch：
 *   Better Auth 的客户端会处理好它那套 Cookie 和请求格式，
 *   自己拼容易漏细节。这是它的官方用法。
 *   文档：https://better-auth.com/docs/basic-usage
 *
 * 想删掉后台？
 *   1. 删掉 src/pages/admin/ 整个目录
 *   2. 删掉这个文件
 *   3. 删掉 src/pages/api/ 和 src/lib/auth.ts（如果连接口和登录也不要了）
 * ============================================================
 */
import { createAuthClient } from "better-auth/client";

/**
 * 登录客户端。
 *
 * basePath 必须和 src/lib/auth.ts 里的 basePath 一致，
 * 否则请求会打到不存在的地址上。
 */
export const authClient = createAuthClient({
  basePath: "/api/session",
});

/**
 * 发起 GitHub 登录。
 *
 * 这是**整页跳转**，不是 fetch —— 浏览器会离开当前页面去 GitHub，
 * 授权完再跳回来。所以它没有返回值，也不该包在 try/catch 里等结果。
 *
 * @param callbackURL 授权成功后回到哪个页面
 */
export function signInWithGitHub(callbackURL = "/admin/posts"): void {
  void authClient.signIn.social({
    provider: "github",
    callbackURL,
  });
}

/** 登出 */
export async function signOut(): Promise<void> {
  await authClient.signOut();
}

/** 查当前登录状态。未登录返回 null */
export async function getCurrentUser(): Promise<{
  id: string;
  name: string;
} | null> {
  const { data } = await authClient.getSession();

  if (!data?.user) {
    return null;
  }

  return { id: data.user.id, name: data.user.name ?? "管理员" };
}

/* ------------------------------------------------------------------
 * 文章接口
 * ----------------------------------------------------------------- */

/** 后端返回的文章形状，对应 src/db/schema.ts 的 posts 表 */
export type AdminPost = {
  id: number;
  slug: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  status: "draft" | "published";
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 未登录时抛这个，页面据此跳转到登录页 */
export class NotLoggedInError extends Error {
  constructor() {
    super("未登录");
    this.name = "NotLoggedInError";
  }
}

/**
 * 触发重建的结果。
 *
 * 和后端 src/lib/rebuild.ts 的 RebuildOutcome 一一对应 ——
 * 但**不能直接 import 那个文件**：它在服务端跑，里面有 process.env
 * 和 console，打进浏览器包既没用又难看。所以这里另写一份类型，
 * 两边改动时要一起改。
 */
export type RebuildOutcome = "triggered" | "not-configured" | "failed";

/** 写操作的返回：文章本身 + 这次有没有触发重建（null 表示没触发） */
export type SaveResult = {
  post: AdminPost;
  rebuild: RebuildOutcome | null;
};

/**
 * 发一个请求到我们自己的接口。
 *
 * @throws NotLoggedInError 当后端返回 401
 * @throws Error            其他错误，message 是后端给的中文说明
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  /**
   * credentials: "same-origin" 让浏览器自动带上登录 Cookie。
   * 不带这个的话请求发出去是匿名的，后台永远显示未登录。
   */
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new NotLoggedInError();
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? `请求失败（HTTP ${response.status}）`);
  }

  if (data === null) {
    throw new Error("服务器返回的内容无法解析。");
  }

  return data;
}

export const postsApi = {
  /** 全部文章（含草稿） */
  async list(): Promise<AdminPost[]> {
    const data = await request<{ posts: AdminPost[] }>("/api/posts");

    return data.posts;
  },

  /** 单篇文章 */
  async get(id: number): Promise<AdminPost> {
    const data = await request<{ post: AdminPost }>(`/api/posts/${id}`);

    return data.post;
  },

  /** 新建 */
  async create(input: Partial<AdminPost>): Promise<SaveResult> {
    return await request<SaveResult>("/api/posts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** 修改（只传要改的字段） */
  async update(id: number, input: Partial<AdminPost>): Promise<SaveResult> {
    return await request<SaveResult>(`/api/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  /** 删除 */
  async remove(id: number): Promise<void> {
    await request(`/api/posts/${id}`, { method: "DELETE" });
  },
};

/**
 * 站点点重建（把数据库里的改动发布到线上）。
 *
 * 【为什么保存之后还要单独点一下】
 *   见 src/lib/rebuild.ts 的文件头。简单说：Netlify 免费套餐每次生产
 *   部署花 15 积分（一个月 300），而"改一篇已发布文章的错别字"不重建
 *   也不会错，只是站点上暂时是旧内容。所以那种改动由作者自己决定
 *   什么时候花这 15 分。
 *
 * @returns 结果。没配 NETLIFY_BUILD_HOOK_URL 时返回 "not-configured" ——
 *          页面据此如实告诉作者"点了也不会重建"，而不是假装成功
 */
export const rebuildApi = {
  async trigger(): Promise<RebuildOutcome> {
    const data = await request<{ outcome: RebuildOutcome }>("/api/rebuild", {
      method: "POST",
    });

    return data.outcome;
  },
};
