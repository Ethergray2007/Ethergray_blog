/**
 * 提交前检查
 * ============================================================
 * 为什么需要脚本而不是"下次注意"：
 *   我已经两次把临时文件（写提交信息用的 COMMIT_MSG.txt）
 *   提交进仓库了。两次都是因为"忘了删" —— 这说明光靠记性不管用，
 *   需要一道机械的关卡。
 *
 * 它检查两件事：
 *   1. 有没有不该进仓库的临时文件被暂存了
 *   2. 提交信息格式对不对（type: 描述，type 必须是规定的那几个）
 *
 * 跑法：
 *   npm run commit:check        # 检查暂存区里有没有垃圾文件
 *   npm run commit:check -- "feat: 友链页"   # 顺便检查提交信息
 * ============================================================
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

/** 允许的提交类型（和 AGENTS.md 里的表保持一致） */
const TYPES = [
  "feat",
  "fix",
  "docs",
  "refactor",
  "chore",
  "test",
  "perf",
] as const;

/**
 * 不该出现在仓库里的文件模式。
 *
 * 都是"临时产物"，用完就该删 —— 但很容易忘。
 */
const FORBIDDEN = [
  /^COMMIT_MSG\.txt$/,
  /^MSG\.txt$/,
  /\.tmp$/,
  /^_diag/,
  /^_probe/,
  /^_bench/,
];

/** 允许的例外：这些是故意放着的 */
const ALLOWED = [
  // practice/ 下的下划线开头文件是"用完即删"的探索脚本，
  // 但它们不在仓库里（.gitignore 有 * 开头的规则）。这里只兜底。
  /^practice\/[^/]+\.ts$/,
];

let problems = 0;

function fail(message: string) {
  console.log(`  ❌ ${message}`);
  problems++;
}

function ok(message: string) {
  console.log(`  ✅ ${message}`);
}

/* ------------------------------------------------------------------
 * 1. 检查暂存区
 * ----------------------------------------------------------------- */
console.log("\n=== 检查暂存区有没有临时文件 ===");

let staged = "";
try {
  /**
   * 用 --name-status 而不是 --name-only：
   *   我们关心的是文件**要被加进去**，而不是它出现在列表里。
   *
   * 这个区别很实际：清理临时文件时，那个文件的状态是 D（删除），
   * 如果只看文件名就会把它当成违规拦住 —— 结果**修复反而做不了**。
   * 第一次写这个脚本时就踩了这个坑。
   */
  staged = execSync("git diff --cached --name-status", { encoding: "utf8" });
} catch {
  console.error("  读不到暂存区（是不是不在 git 仓库里？）");
  process.exit(1);
}

const entries = staged
  .split("\n")
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .map(line => {
    const [status, ...rest] = line.split(/\s+/);

    return { status, file: rest.join(" ") };
  });

if (entries.length === 0) {
  console.log("  （暂存区是空的，没有要提交的东西）");
} else {
  const bad = entries.filter(({ status, file }) => {
    // 只有 A（新增）、M（修改）、R（改名）才可能"把垃圾带进仓库"。
    // D（删除）是在往外清理，必须放行。
    if (status === "D") {
      return false;
    }

    const base = file.split("/").pop() ?? file;
    const hit = FORBIDDEN.some(re => re.test(base) || re.test(file));
    const allowed = ALLOWED.some(re => re.test(file));

    return hit && !allowed;
  });

  if (bad.length > 0) {
    for (const { file } of bad) {
      fail(`临时文件不该提交: ${file}`);
    }
    console.log(
      "\n     这些是写完就该删的临时产物。" +
        "\n     如果是提交信息文件，改用 .git/ 目录下（git 不会跟踪它）。"
    );
  } else {
    const deletions = entries.filter(e => e.status === "D").length;

    ok(
      `暂存区干净（${entries.length} 个文件` +
        (deletions > 0 ? `，其中 ${deletions} 个是删除` : "") +
        "）"
    );
  }
}

/* ------------------------------------------------------------------
 * 2. 检查提交信息（可选，从命令行传进来）
 * ----------------------------------------------------------------- */
const message = process.argv[2];

if (message) {
  console.log("\n=== 检查提交信息 ===");

  const match = /^([a-z]+): (.+)$/.exec(message);

  if (!match) {
    fail(`格式不对，应该是「type: 描述」`);
    console.log(`     收到: ${message}`);
  } else {
    const [, type, desc] = match;

    if (!(TYPES as readonly string[]).includes(type)) {
      fail(`type "${type}" 不在允许列表里`);
      console.log(`     允许的: ${TYPES.join(", ")}`);
    } else {
      ok(`type 正确（${type}）`);
    }

    if (desc.trim().length === 0) {
      fail("描述是空的");
    } else if ([...desc].length > 40) {
      fail(`描述太长（${[...desc].length} 字，要求不超过 40）`);
    } else {
      ok(`描述长度合适（${[...desc].length} 字）`);
    }

    if (desc.endsWith("。") || desc.endsWith(".")) {
      fail("描述结尾不要加句号");
    }
  }

  /**
   * 「一次提交只做一件事」没法自动判断，但可以提个醒：
   * type 只有一个，而描述里出现多个动作词时，往往说明混了。
   */
  const mixedHints = ["和", "以及", "顺便", "同时"];
  const hits = mixedHints.filter(word => message.includes(word));

  if (hits.length > 0) {
    console.log(
      `  ⚠️  描述里出现了「${hits.join("、")}」—— 确认一下是不是混了几件事。` +
        "\n     如果确实混了，应该拆成多个提交。"
    );
  }
} else {
  console.log("\n（没传提交信息，跳过格式检查）");
  console.log('  想检查: npm run commit:check -- "feat: 某某功能"');
}

/* ------------------------------------------------------------------
 * 汇总
 * ----------------------------------------------------------------- */
console.log(`\n${"=".repeat(52)}`);

if (problems > 0) {
  console.log(`发现 ${problems} 个问题，先修掉再提交`);
  process.exit(1);
}

console.log("🎉 可以提交");

// 显式退出，避免某些环境下进程挂着
void existsSync;
process.exit(0);
