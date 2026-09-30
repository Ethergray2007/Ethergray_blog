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
  async create(input: Partial<AdminPost>): Promise<AdminPost> {
    const data = await request<{ post: AdminPost }>("/api/posts", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return data.post;
  },

  /** 修改（只传要改的字段） */
  async update(id: number, input: Partial<AdminPost>): Promise<AdminPost> {
    const data = await request<{ post: AdminPost }>(`/api/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });

    return data.post;
  },

  /** 删除 */
  async remove(id: number): Promise<void> {
    await request(`/api/posts/${id}`, { method: "DELETE" });
  },
};
