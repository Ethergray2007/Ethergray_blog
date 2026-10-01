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
 * 【为什么这里从"列举名字"改成了"通用规则"】
 * 最初的版本是遇到一个加一个：`^_diag`、`^_probe`、`^_bench`……
 * 结果漏掉了 `_layout-survey.ts` —— 因为它的名字里没有那几个词。
 *
 * 已经犯过三次同类错误了（COMMIT_MSG.txt 两次、探索脚本一次），
 * 而每次都是"换个名字就绕过了"。所以改成按**约定**判断：
 *
 *   1. 下划线开头的文件（除 few 例外）→ 一次性脚本，用完即删
 *   2. 常见临时文件名（提交信息、备份、导出）
 *
 * 配套的约定写在 AGENTS.md 里：
 * **临时写的验证脚本一律用 `_` 开头**，.gitignore 里 `practice/_*` 也挡住了。
 * 这样起什么名字都不会误提交，不依赖这个脚本兜底。
 */
const FORBIDDEN = [
  /* 通用：下划线开头 = 临时产物 */
  /^_/,
  /* 常见临时文件名 */
  /^(COMMIT_MSG|MSG|COMMIT_EDITMSG)\.txt$/i,
  /\.(tmp|bak|orig|rej|log)$/i,
  /~$/,
  /* 截图分析脚本的中间产物 */
  /^shots-crops\//,
];

/**
 * 允许的例外。
 *
 * 注意这里**不再**放宽 practice/ 下的文件 ——
 * 那个例外本意是"练习册里的文件是正经文件"，
 * 但它把所有 practice/*.ts 都放行了，等于形同虚设。
 * 现在靠 .gitignore 的 `practice/_*` 约定来区分，
 * 这个脚本只做最后一道关。
 */
const ALLOWED = [
  /* 下划线开头的 Astro 路由片段是正儿八经的私有目录（如 _components） */
  /\/_components\//,
  /* 内容集合里下划线开头的是"模板/示例"，约定就是留着 */
  /src\/content\/[^/]+\/_/,
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
} catch (error) {
  /**
   * 【为什么要把真实错误打出来】
   * 这里原本写的是 `catch {` 加一句"是不是不在 git 仓库里？"。
   * 结果在受限沙箱里跑时，真实原因是
   *     spawnSync C:\WINDOWS\system32\cmd.exe EPERM
   * —— Node 捕获子进程输出要开管道，而沙箱不允许。
   * 脚本却报"不在 git 仓库里"，把人往完全错误的方向带（查了半天）。
   *
   * 教训和 validation.ts 里那条一样：**别把真实错误换成自己猜的原因**。
   * 打印原始信息，让人自己判断。
   */
  console.error("  读不到暂存区。原始错误：");
  console.error(`    ${error instanceof Error ? error.message : String(error)}`);
  console.error("  （如果错误里有 EPERM，那是环境限制，不是 git 仓库的问题）");
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
