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
];
