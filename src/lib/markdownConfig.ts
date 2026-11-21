/**
 * 静态内容与动态文章共用的 Markdown 管线
 * ============================================================
 * 想删除：先在 astro.config 与 postMarkdown 中替换配置，再删除本文件及 README 登记。
 * Mermaid 的集成只会修改构建配置，运行时新建 renderer 不会自动继承，
 * 因此把 Mermaid 代码节点转换放在这份共享配置里，避免两条渲染路径分叉。
 * ============================================================
 */
import type { AstroUserConfig } from "astro";
import { unified } from "@astrojs/markdown-remark";
import rehypeCallouts from "rehype-callouts";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "../utils/transformers/fileName.js";

type MarkdownNode = {
  type: string;
  lang?: string | null;
  value?: string;
  children?: MarkdownNode[];
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!
  );
}

function remarkMermaid() {
  return (tree: MarkdownNode) => {
    function visit(node: MarkdownNode) {
      if (node.type === "code" && node.lang === "mermaid") {
        // 转换发生在代码高亮前；必须转义图表文本，不能把用户的 HTML 当标签执行。
        node.type = "html";
        node.value = `<pre class="mermaid">${escapeHtml(node.value ?? "")}</pre>`;
        delete node.lang;
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

export const markdownConfig = {
  processor: unified({
    remarkPlugins: [remarkMath, remarkMermaid],
    rehypePlugins: [rehypeCallouts, rehypeKatex],
  }),
  shikiConfig: {
    themes: { light: "min-light", dark: "night-owl" },
    defaultColor: false,
    wrap: false,
    transformers: [
      transformerFileName({ style: "v2", hideDot: false }),
      transformerNotationHighlight(),
      transformerNotationWordHighlight(),
      transformerNotationDiff({ matchAlgorithm: "v3" }),
    ],
  },
} satisfies NonNullable<AstroUserConfig["markdown"]>;
