/**
 * 后台专用的 API 调用工具
 * ============================================================
 * 自包含模块：只依赖浏览器自带的 fetch，不依赖任何库。
 *
 * 把所有"和后端说话"的细节收在这一个文件里：
 *   · Cookie 怎么带
 *   · 出错时怎么把后端的中文说明取出来
 *   · 401（未登录）统一怎么处理
 *
 * 这样各个页面只管调 adminApi.listPosts() 这类方法，
 * 不用各自拼 fetch，也不会各自漏掉出错处理。
 *
 * 想删掉后台？
 *   1. 删掉 src/pages/admin/ 整个目录
 *   2. 删掉这个文件
 *   3. 删掉 src/pages/api/ 目录（如果连接口也不要了）
 * ============================================================
 */

/** 后端返回的错误形状，见 src/lib/api-errors.ts */
type ApiErrorBody = {
  error?: string;
  code?: string;
};

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
 * 发一个请求到后端。
 *
 * @param path   形如 "/api/posts"
 * @param options fetch 的选项
 * @returns 解析好的 JSON
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

  /**
   * 无论成功失败都尝试解析 JSON。
   * 后端所有响应都是 JSON，所以这里一般不会失手；
   * 真失手了（比如代理返回了 HTML 错误页）就给一句通用提示。
   */
  const data = (await response.json().catch(() => null)) as
    | (T & ApiErrorBody)
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? `请求失败（HTTP ${response.status}）`);
  }

  if (data === null) {
    throw new Error("服务器返回的内容无法解析。");
  }

  return data;
}

export const adminApi = {
  /** 登录。成功后浏览器自动存下 Cookie */
  async login(username: string, password: string): Promise<void> {
    await request("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  /** 登出 */
  async logout(): Promise<void> {
    await request("/api/logout", { method: "POST" });
  },

  /** 当前登录用户。未登录时抛 NotLoggedInError */
  async me(): Promise<{ id: number; username: string }> {
    const data = await request<{ user: { id: number; username: string } }>(
      "/api/me"
    );

    return data.user;
  },

  /** 全部文章（含草稿） */
  async listPosts(): Promise<AdminPost[]> {
    const data = await request<{ posts: AdminPost[] }>("/api/posts");

    return data.posts;
  },

  /** 单篇文章 */
  async getPost(id: number): Promise<AdminPost> {
    const data = await request<{ post: AdminPost }>(`/api/posts/${id}`);

    return data.post;
  },

  /** 新建 */
  async createPost(input: Partial<AdminPost>): Promise<AdminPost> {
    const data = await request<{ post: AdminPost }>("/api/posts", {
      method: "POST",
      body: JSON.stringify(input),
    });

    return data.post;
  },

  /** 修改（只传要改的字段） */
  async updatePost(id: number, input: Partial<AdminPost>): Promise<AdminPost> {
    const data = await request<{ post: AdminPost }>(`/api/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });

    return data.post;
  },

  /** 删除 */
  async deletePost(id: number): Promise<void> {
    /**
     * ⚠️ 这里刻意**不设置** content-type。
     *
     * 后端（Elysia）看到 application/json 就会尝试解析请求体，
     * 而 DELETE 没有 body，会抛解析错误变成 500。
     * 详见 src/pages/api/_routes/index.ts 里对 PARSE 的处理。
     */
    await request(`/api/posts/${id}`, { method: "DELETE" });
  },
};
