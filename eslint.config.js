import eslintPluginAstro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    /**
     * 全局忽略。
     *
     * practice/ 是 TypeScript 练习册，里面的函数是**故意留空**的
     * （参数没用到、函数体返回占位值），lint 和 astro check 都会误报。
     * 它有自己的检查方式：
     *   npx tsc -p practice/tsconfig.json
     *   npm run learn:check
     */
    ignores: [
      "dist/**",
      ".astro/**",
      "practice/**",
      /**
       * .netlify 是适配器生成的构建产物（每次 astro build 都会重新生成）。
       * 它里面有几百个打包后的文件，lint 它们既没意义又很慢。
       */
      ".netlify/**",
      // 工具/编辑器产生的杂项目录，不属于项目源码
      // （.dsh-probe 是 DSH harness 临时生成的）
      ".dsh-probe/**",
      "**/.dsh-probe/**",
      /**
       * 临时调研 / 验证目录。
       *
       * ⚠️ 这一条不能省，而且**光加 .gitignore 不够**：
       * 上面的 ignores 是 ESLint 的**显式列表**，它不读 .gitignore。
       * 所以一个没被 git 跟踪的临时目录照样会被 lint ——
       * 而临时脚本里必有 console.log，于是 `npx eslint .` 直接变红，
       * CI 的 lint 关卡跟着挂。
       *
       * 这个坑踩过一次：code-review/ 下放了几个验证脚本，
       * eslint 报了 11 个 no-console 错，但那些文件根本不该被检查。
       */
      "code-review/**",
      "**/code-review/**",
      ".diag/**",
      /**
       * 根目录下的下划线项（_audit/、_walkthrough/、_probe_fqzlr/），
       * 和 .gitignore 里的 /_* 是**同一条规则的两处登记** —— 少一处就漏。
       *
       * 两条都要写，而且**不能**给它加"任意层级"的前缀：
       * 那样会把 src/pages 下 _components/ 这种**正式目录**一起忽略掉
       * （下划线在 src/pages 里表示"不是路由"，是正式代码）。
       *
       * 漏登记的代价实测过：这三个目录没被忽略时，npx eslint . 报
       * 787 个 no-console 错，第 3 道检查直接变红。
       */
      "_*",
      "_*/**",
    ],
  },
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
  },
  { rules: { "no-console": "error" } },
  {
    /**
     * scripts/ 下都是命令行工具，输出结果只能靠 console ——
     * 这是它们的正常用法，不是调试残留。
     */
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
];
