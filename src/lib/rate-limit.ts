/**
 * 登录限流
 * ============================================================
 * 作用：同一个人连续输错密码多次后，暂时不允许再试。
 *
 * 【为什么需要】
 * 没有限流的话，攻击者可以每秒尝试成百上千个密码。
 * scrypt 计算要 30ms 是**被动**的防护（拖慢速度），
 * 限流是**主动**的（直接拒绝）。
 *
 * 【为什么存在内存里】
 * 这是刻意的取舍：
 *   内存版   重启就清空；多实例时每个实例各算各的。
 *            但对个人博客完全够用 —— 攻击者拿不到任何好处。
 *   数据库版 持久、跨实例一致，但要多一张表 + 每次登录查库。
 * 先用最简的。真需要时再换（接口一样，替换内部实现即可）。
 *
 * ⚠️ 局限（要心里有数）：
 *   Netlify 冷启动或部署后计数会清空；函数有多实例时，
 *   攻击者可能"分散"到不同实例上绕过限制。
 *   要彻底解决得上数据库/Redis，这里不做。
 * ============================================================
 */

/** 连续失败多少次开始锁定 */
const MAX_FAILURES = 5;

/** 锁定时长：15 分钟 */
const LOCK_DURATION_MS = 15 * 60 * 1000;

type Attempt = {
  /** 连续失败次数 */
  failures: number;
  /** 第一次失败的时间，用来判断何时可以把计数清掉 */
  firstFailureAt: number;
};

/** key 是"谁在尝试"，目前用 IP */
const attempts = new Map<string, Attempt>();

/**
 * 判断是否已被锁定。
 *
 * @returns 被锁则返回还需等待多少秒；没锁返回 0
 */
export function getLockRemainingSeconds(key: string, now = Date.now()): number {
  const record = attempts.get(key);

  if (!record) {
    return 0;
  }

  // 失败计数已经过期，清掉重新开始
  if (now - record.firstFailureAt > LOCK_DURATION_MS) {
    attempts.delete(key);
    return 0;
  }

  if (record.failures < MAX_FAILURES) {
    return 0;
  }

  const unlockAt = record.firstFailureAt + LOCK_DURATION_MS;

  return Math.max(0, Math.ceil((unlockAt - now) / 1000));
}

/** 记一次失败。达到上限后就进入锁定状态 */
export function recordFailure(key: string, now = Date.now()): void {
  const record = attempts.get(key);

  if (!record || now - record.firstFailureAt > LOCK_DURATION_MS) {
    attempts.set(key, { failures: 1, firstFailureAt: now });
    return;
  }

  record.failures += 1;
}

/** 登录成功后清空计数 */
export function clearFailures(key: string): void {
  attempts.delete(key);
}

/** 测试用：清空所有记录 */
export function resetAllFailures(): void {
  attempts.clear();
}

/** 对外暴露上限，方便测试和提示文案 */
export const LOGIN_MAX_FAILURES = MAX_FAILURES;
export const LOGIN_LOCK_MINUTES = LOCK_DURATION_MS / 60000;
