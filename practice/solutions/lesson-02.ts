/**
 * 第 2 课答案
 * ============================================================
 */

import type { Post } from "../data.ts";

/* ------------------------------------------------------------
 * 知识点 1：用类型描述"返回的对象长什么样"
 *
 * 只要返回值的属性名和这里对不上，TS 就会报错。比如把 title 写成 titel：
 *   对象字面量只能指定已知属性，"titel" 不在类型 "PostSummary" 中
 *
 * 这个报错看着啰嗦，但它替你拦住了最容易犯的错 —— 拼错属性名。
 * ---------------------------------------------------------- */
export type PostSummary = {
  title: string;
  tagCount: number;
  hasTags: boolean;
};

/* ------------------------------------------------------------
 * 知识点 2：返回对象
 *
 * 返回类型写成 PostSummary 之后，函数体里 return 的对象
 * 会被 TS 逐字段检查。
 *
 * 也可以不写返回类型，让 TS 自己推断 —— 但显式写出来更清楚，
 * 而且能保证"实现"不会偷偷改变"约定"。
 * ---------------------------------------------------------- */
export function summarize(post: Post): PostSummary {
  return {
    title: post.title,
    tagCount: post.tags.length,
    hasTags: post.tags.length > 0,
  };
}
