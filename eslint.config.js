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
