/**
 * 一次性验证：会话签名机制是否安全。
 * 用完即删。
 *
 * 这层直接决定"能不能冒充管理员"，所以要把攻击场景都试一遍。
 */
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "../../src/lib/session.ts";

const SECRET = "test-secret-must-be-long-enough-0123456789";
const user = { id: 1, username: "ethergray" };

let passed = 0;
const failed: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ❌ ${name}${detail ? "  ← " + detail : ""}`);
  }
}

console.log("=== 1. 正常流程 ===");
const token = createSessionToken(user, SECRET);
console.log("  token:", token);
check("token 是两段（payload.signature）", token.split(".").length === 2);

const payload = verifySessionToken(token, SECRET);
check("验证通过", payload !== null);
check("能取到用户 id", payload?.id === 1);
check("能取到用户名", payload?.username === "ethergray");
check("有过期时间", typeof payload?.exp === "number");
check("Cookie 名正确", SESSION_COOKIE === "session");
check("有效期是 7 天", SESSION_MAX_AGE_SECONDS === 7 * 24 * 3600);

console.log("\n=== 2. 攻击场景：篡改 payload ===");
// 把用户名改成别的，但保留原签名 —— 签名应该对不上
const [encoded] = token.split(".");
const forgedPayload = Buffer.from(
  JSON.stringify({ id: 999, username: "hacker", exp: Date.now() + 999999 })
).toString("base64url");
const forgedToken = `${forgedPayload}.${token.split(".")[1]}`;
check(
  "改 payload 后签名失效",
  verifySessionToken(forgedToken, SECRET) === null
);

console.log("\n=== 3. 攻击场景：自己编一个签名 ===");
check(
  "假签名被拒绝",
  verifySessionToken(`${encoded}.${"a".repeat(43)}`, SECRET) === null
);
check(
  "空签名被拒绝",
  verifySessionToken(`${encoded}.`, SECRET) === null
);

console.log("\n=== 4. 攻击场景：换密钥后旧 token 失效 ===");
const otherSecret = "a-completely-different-secret-9876543210";
check(
  "换个密钥就验不过",
  verifySessionToken(token, otherSecret) === null
);

console.log("\n=== 5. 过期 ===");
const expired = createSessionToken(user, SECRET, Date.now() - 8 * 24 * 3600 * 1000);
check("过期 token 被拒绝", verifySessionToken(expired, SECRET) === null);

const almostExpired = createSessionToken(user, SECRET, Date.now() - 6.9 * 24 * 3600 * 1000);
check(
  "还没过期就仍然有效",
  verifySessionToken(almostExpired, SECRET) !== null
);

console.log("\n=== 6. 畸形输入不应该抛异常 ===");
const badInputs = [
  undefined,
  null,
  "",
  ".",
  "...",
  "not-a-token",
  "abc.def",
  "!!!.???",
  `${encoded}`,
];
for (const bad of badInputs) {
  try {
    const result = verifySessionToken(bad as never, SECRET);
    check(`${JSON.stringify(bad)?.slice(0, 24) ?? "undefined"} → 返回 null`, result === null);
  } catch (error) {
    check(`${JSON.stringify(bad)} 不抛异常`, false, String(error));
  }
}

console.log("\n=== 7. 签名对但内容不是我们要的形状 ===");
// 这种情况只有攻击者知道密钥才可能发生，但仍要防住
const weirdPayload = Buffer.from(JSON.stringify({ hello: "world" })).toString("base64url");
const { createHmac } = await import("node:crypto");
const weirdSig = createHmac("sha256", SECRET).update(weirdPayload).digest("base64url");
check(
  "结构不对的 payload 被拒绝",
  verifySessionToken(`${weirdPayload}.${weirdSig}`, SECRET) === null
);

console.log("\n=== 8. 缺密钥时的行为 ===");
const savedSecret = process.env.SESSION_SECRET;
delete process.env.SESSION_SECRET;
try {
  createSessionToken(user);
  check("没有 SESSION_SECRET 时应该抛错", false, "居然签发了 token");
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  check("没有 SESSION_SECRET 时抛错", msg.includes("SESSION_SECRET"));
}
if (savedSecret !== undefined) {
  process.env.SESSION_SECRET = savedSecret;
}

console.log(`\n${"=".repeat(50)}`);
console.log(`通过 ${passed} 项，失败 ${failed.length} 项`);
if (failed.length > 0) {
  failed.forEach(n => console.log(`  - ${n}`));
  process.exit(1);
}
console.log("🔐 会话机制安全");
