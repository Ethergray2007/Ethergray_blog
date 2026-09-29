/**
 * node 预加载钩子（给"用 node 直接跑 TS 工具函数"用）
 * ============================================================
 * 为什么需要它：
 *   src/utils/ 里的函数按 Astro 的写法导入依赖，有两种 node 处理不了的情况：
 *
 *   1. `import type { X } from "astro:content"`
 *      astro:content 是 Astro 的**虚拟模块**，磁盘上不存在。
 *      但它是 `import type`，编译后会被完全删掉，所以只要骗过解析这一步就行。
 *
 *   2. `import { slugifyStr } from "./slugify"`
 *      省略了 .ts 后缀。Astro/Vite 能自动补，node 不能。
 *
 * 关键点：补后缀必须在 **resolve 阶段**完成。
 * 放到 load 阶段没用 —— node 在 resolve 时找不到模块就直接抛错了，
 * 根本走不到 load。
 *
 * 用法：
 *   node --import ./practice/node-ts-hook.mjs 某个脚本.ts
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

/** Astro 虚拟模块在 node 里的替身 */
const ASTRO_STUB = new URL("./_virtual-astro-stub.mjs", import.meta.url).href;

/** 项目根目录（这个文件在 practice/ 下，所以往上走一级） */
const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");

/**
 * 路径别名。
 *
 * 和 tsconfig.json 里的 paths 保持一致，长的那条要放前面，
 * 否则 "@/astro-paper.config" 会先被 "@/ → src/" 匹配走。
 *
 * 注意 @/astro-paper.config 指向的是**根目录**的 astro-paper.config.ts，
 * 不是 src/ 下面的东西。
 */
const ALIASES = [
  ["@/astro-paper.config", "astro-paper.config"],
  ["@/", "src/"],
];

/** 相对导入缺后缀时，按这些顺序试一遍 */
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

/** 给定一个不带后缀的路径，找出磁盘上真实存在的文件 */
function resolveWithExtensions(base) {
  if (existsSync(base) && path.extname(base)) {
    return base;
  }

  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // 情况 1：Astro 虚拟模块（astro:content 等）
    if (specifier.startsWith("astro:")) {
      return { url: ASTRO_STUB, shortCircuit: true };
    }

    const importerDir = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : process.cwd();

    // 情况 2：路径别名 @/xxx
    for (const [prefix, target] of ALIASES) {
      if (specifier.startsWith(prefix)) {
        const base = path.join(
          PROJECT_ROOT,
          target,
          specifier.slice(prefix.length)
        );
        const found = resolveWithExtensions(base);

        if (found) {
          return { url: pathToFileURL(found).href, shortCircuit: true };
        }
      }
    }

    // 情况 3：省略后缀的相对导入
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !path.extname(specifier)
    ) {
      const found = resolveWithExtensions(path.resolve(importerDir, specifier));

      if (found) {
        return { url: pathToFileURL(found).href, shortCircuit: true };
      }
    }

    return nextResolve(specifier, context);
  },
});
