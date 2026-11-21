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
 * SDK 会先请求本站取得授权地址，再整页跳到 GitHub。
 * 第一步也可能超时或返回错误，所以必须等待它，页面才能恢复按钮并提示重试。
 *
 * @param callbackURL 授权成功后回到哪个页面
 */
export async function signInWithGitHub(
  callbackURL = "/admin/posts",
  signal?: AbortSignal
): Promise<void> {
  const { data, error } = await authClient.signIn.social({
    provider: "github",
    callbackURL,
    // 授权取消或失败时回到自己的登录页，不让作者落到 SDK 的默认错误页。
    errorCallbackURL: "/admin",
    fetchOptions: { signal },
  });

  if (error || !data?.url) {
    throw new Error("GITHUB_SIGN_IN_FAILED");
  }
}

/** 登出 */
export async function signOut(): Promise<void> {
  await authClient.signOut();
}

/** 查当前登录状态。未登录返回 null */
export async function getCurrentUser(signal?: AbortSignal): Promise<{
  id: string;
  name: string;
} | null> {
  const { data, error } = await authClient.getSession({
    fetchOptions: { signal },
  });

  if (error && error.status !== 401) {
    throw new Error("SESSION_CHECK_FAILED");
  }

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

/** 保留接口错误码，让界面按当前语言显示错误说明 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined
  ) {
    super(message);
    this.name = "ApiRequestError";
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

/** 文章实时发布；保留 rebuild:null 兼容旧版调用方，不触发整站部署。 */
export type SaveResult = {
  post: AdminPost;
  rebuild: null;
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
    | (T & { error?: string; code?: string })
    | null;

  if (!response.ok) {
    throw new ApiRequestError(
      data?.error ?? `请求失败（HTTP ${response.status}）`,
      data?.code
    );
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

/** 旧版显式部署接口的兼容封装；正常文章编辑流程不再使用。 */
export const rebuildApi = {
  async trigger(): Promise<RebuildOutcome> {
    const data = await request<{ outcome: RebuildOutcome }>("/api/rebuild", {
      method: "POST",
    });

    return data.outcome;
  },
};
