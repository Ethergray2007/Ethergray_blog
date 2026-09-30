/**
 * 密码哈希
 * ============================================================
 * 用 Node 内置的 `scrypt` 做密码哈希，**不引入第三方库**。
 *
 * 为什么不直接用 SHA-256 之类的普通哈希：
 *   普通哈希算得太快，攻击者拿到数据库后每秒能试几十亿次。
 *   scrypt 故意设计成"又慢又吃内存"，让暴力破解变得不划算。
 *
 * 为什么不用 bcrypt / argon2 这类专门的库：
 *   它们需要编译原生模块，在 Netlify Functions 这种 Serverless 环境里
 *   容易出问题（体积、平台兼容性）。Node 自带的 scrypt 完全够用，
 *   而且是标准库，不会因为依赖升级而失效。
 *
 * 存储格式（一个字符串包含全部信息）：
 *     scrypt$<盐的十六进制>$<哈希的十六进制>
 * 把盐和参数一起存下来，将来想换算法或调参数时，
 * 老密码仍然能用老参数验证通过。
 * ============================================================
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/** 算法标识，写在哈希串开头，将来换算法时用来区分 */
const ALGORITHM = "scrypt";

/**
 * scrypt 参数。
 *
 * N = 16384     迭代次数（CPU 开销）
 * r = 8         块大小
 * p = 1         并行度
 * keylen = 64   派生密钥长度（字节）
 *
 * 这几个值决定了"算一次要多久"。当前配置在普通机器上约 30ms，
 * 登录时用户感觉不到，但攻击者想暴力破解就非常昂贵。
 *
 * 注意：N 必须是 2 的幂。
 */
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, keylen: 64 };

/** 盐的长度（字节）。16 字节 = 128 位，足够避免碰撞 */
const SALT_BYTES = 16;

/**
 * 把 scrypt 包成 Promise。
 *
 * ⚠️ 不能用 `promisify(scrypt)`：
 *   node:crypto 的 scrypt 有多个重载（带/不带 options、带/不带 callback），
 *   promisify 只能推断出其中一个，于是参数个数对不上，报
 *   "Expected 3 arguments, but got 4"。
 *   手写一层反而更短也更清楚。
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  options: typeof SCRYPT_OPTIONS
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, options.keylen, options, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

/**
 * 严格的十六进制校验。
 *
 * ⚠️ 这里必须自己校验，不能依赖 Buffer.from(x, "hex") ——
 * 它遇到非法字符时**静默返回空 Buffer，不抛异常**。
 *
 * 这个坑很危险：如果盐和哈希都解析成空 Buffer，
 * timingSafeEqual(空, 空) 会返回 true，等于任何密码都能登录。
 * （实测 `verifyPassword("任意密码", "scrypt$zzzz$zzzz")` 曾经返回 true）
 */
function isHex(value: string, expectedBytes: number): boolean {
  return value.length === expectedBytes * 2 && /^[0-9a-f]+$/.test(value);
}

/**
 * 把明文密码转成可存进数据库的哈希串。
 *
 * 每次调用都会生成**新的随机盐**，所以同一个密码两次哈希结果不同 ——
 * 这是刻意的：攻击者无法通过"两个用户哈希相同"推断出他们密码相同，
 * 也无法用预先算好的表（彩虹表）反查。
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);

  const derived = await scryptAsync(password, salt, SCRYPT_OPTIONS);

  return `${ALGORITHM}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * 校验密码是否正确。
 *
 * 用 timingSafeEqual 而不是 `===` 比较：
 *   普通字符串比较会在第一个不同的字符处立刻返回，
 *   攻击者可以通过测量响应时间一个字符一个字符地猜出哈希值。
 *   timingSafeEqual 无论内容如何都花同样的时间，堵住这个侧信道。
 *
 * @returns 密码正确返回 true；格式不对或密码错误都返回 false
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");

  // 格式不对（比如数据库里是空值或旧数据）直接判失败，不要抛异常
  if (parts.length !== 3 || parts[0] !== ALGORITHM) {
    return false;
  }

  const [, saltHex, hashHex] = parts;

  // 严格校验格式。见上面 isHex 的注释：
  // Buffer.from 对非法十六进制不会报错，会偷偷给个空 Buffer，
  // 不挡住的话就变成"任何密码都能通过"。
  if (!isHex(saltHex, SALT_BYTES) || !isHex(hashHex, SCRYPT_OPTIONS.keylen)) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");

    const derived = await scryptAsync(password, salt, SCRYPT_OPTIONS);

    // 长度不一致时 timingSafeEqual 会抛错，所以先挡一层
    if (derived.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(derived, expected);
  } catch {
    // 十六进制串损坏之类的异常，一律当成验证失败
    return false;
  }
}
