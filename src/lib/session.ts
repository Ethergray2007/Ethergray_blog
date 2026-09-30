/**
 * 会话（Session）：用签名 Cookie 记住"谁登录了"
 * ============================================================
 * 【为什么要自己实现】
 * 常见做法有三种：
 *   1. 数据库存 sessionId        —— 要一张表 + 每次请求查库
 *   2. 平台提供的会话（如 Netlify Blobs）—— 换平台就失效
 *   3. 签名 Cookie               —— 不需要存储，换平台也能用
 *
 * 个人博客只有一个管理员，选第 3 种：**不存任何东西**。
 *
 * 【原理】
 * Cookie 里放两部分： payload.signature
 *
 *   payload    明文（base64url 编码的 JSON），内容是 { id, username, exp }
 *   signature  HMAC-SHA256(payload, 服务端密钥)
 *
 * 因为攻击者不知道密钥，他改了 payload 就算不出正确的 signature，
 * 服务端一验就露馅。所以 payload 不需要加密 —— 它本来也要给浏览器存。
 *
 * ⚠️ 这里的安全完全依赖 SESSION_SECRET 保密。
 *    它泄露 = 任何人都能伪造管理员身份。见文件末尾的说明。
 * ============================================================
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** 登录状态的有效期：7 天 */
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Cookie 名字 */
export const SESSION_COOKIE = "session";

/** Cookie 里能放什么（不含密码等敏感信息） */
export type SessionPayload = {
  /** 用户 id */
  id: number;
  /** 用户名，用来在界面上显示 */
  username: string;
  /** 过期时间（毫秒时间戳） */
  exp: number;
};

/** base64url 编码 —— 比普通 base64 更适合放 URL/Cookie（没有 + / =） */
function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/** 计算签名 */
function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * 读取会话密钥。
 *
 * 为什么读不到时**抛异常**而不是用一个默认值：
 *   如果给个默认密钥，线上忘了配置时会"看起来正常"，
 *   但任何人都能用公开的默认密钥伪造管理员登录 —— 这是最坏的情况。
 *   直接崩掉反而安全：部署时会立刻发现。
 */
export function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      [
        "缺少环境变量 SESSION_SECRET，无法签发登录状态。",
        "",
        "本地开发：在 .env 里加一行",
        "  SESSION_SECRET=<随便一串足够长的随机字符>",
        "",
        "生成方法（任选）：",
        "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
        "",
        "线上：Netlify 后台 → Site configuration → Environment variables。",
        "",
        "⚠️ 不要用短密码或可猜的字符串 —— 拿到它就能冒充管理员。",
      ].join("\n")
    );
  }

  return secret;
}

/**
 * 签发登录状态。
 *
 * @returns 可以直接写进 Cookie 的字符串
 */
export function createSessionToken(
  user: { id: number; username: string },
  secret: string = requireSessionSecret(),
  now: number = Date.now()
): string {
  const payload: SessionPayload = {
    id: user.id,
    username: user.username,
    exp: now + SESSION_DURATION_MS,
  };

  const encoded = toBase64Url(JSON.stringify(payload));

  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * 校验登录状态。
 *
 * 三类失败都返回 null（不区分原因，避免给攻击者额外信息）：
 *   - 格式不对
 *   - 签名对不上
 *   - 已过期
 *
 * @returns 验证通过返回 payload；否则 null
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string = requireSessionSecret(),
  now: number = Date.now()
): SessionPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [encoded, signature] = parts;

  // 先验签名，再解析内容。顺序很重要 ——
  // 没验签名就解析，等于相信了攻击者给的数据。
  const expected = sign(encoded, secret);

  // 长度不同时 timingSafeEqual 会抛错，所以先挡一层
  if (signature.length !== expected.length) {
    return null;
  }

  const signatureOk = timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expected, "utf8")
  );

  if (!signatureOk) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;

    // 结构校验：签名对不代表内容一定是我们期望的形状
    if (
      typeof payload.id !== "number" ||
      typeof payload.username !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    // JSON 解析失败
    return null;
  }
}

/** Cookie 的有效期（秒），给 Set-Cookie 的 Max-Age 用 */
export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;
