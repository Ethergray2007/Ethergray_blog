/**
 * Better Auth 的挂载点
 * ============================================================
 * 自包含模块：整个文件只做一件事 —— 把 /api/session/* 的请求
 * 原样交给 Better Auth 处理。
 *
 * 为什么单独一个文件而不是塞进 [...path].ts：
 *   1. 路径分工一目了然 —— 看网址就知道谁在处理
 *   2. Better Auth 要独占它下面的一整棵路由树，
 *      混在通用 API 路由里会和 /api/posts 之类互相干扰
 *   3. Astro 的路由优先级是"更具体的路径优先"，
 *      所以 /api/session/* 不会被 /api/[...path] 抢走
 *
 * Better Auth 在这个路径下提供这些接口（前端调用它们）：
 *   POST /api/session/sign-in/social   发起 GitHub 登录
 *   GET  /api/session/callback/github  GitHub 回调
 *   GET  /api/session/get-session      查当前登录状态
 *   POST /api/session/sign-out         登出
 *
 * ⚠️ 这是普通 .ts 文件，不是 .astro 组件，所以不要写 --- 分隔符。
 *
 * 想删掉登录功能？
 *   1. 删掉这个文件
 *   2. 删掉 src/lib/auth.ts
 *   3. 删掉 src/pages/admin/ 和 src/utils/adminApi.ts
 *   4. 从 package.json 移除 better-auth
 * ============================================================
 */
import type { APIRoute } from "astro";

import { auth } from "../../../lib/auth.ts";

/**
 * 必须在每次请求时执行 —— 登录是动态的，不能预渲染。
 * 博客正文页仍然是构建时生成的静态 HTML，不受影响。
 */
export const prerender = false;

/** 所有方法都交给 Better Auth，由它按路径分派 */
export const ALL: APIRoute = ({ request }) => auth.handler(request);
