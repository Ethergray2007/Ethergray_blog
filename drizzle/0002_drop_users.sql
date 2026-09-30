-- 删除 users 表
--
-- 原因：登录改用 Better Auth 的**无状态模式**（见 src/lib/auth.ts）。
-- 登录状态和 GitHub 身份都存在加密 Cookie 里，服务端验证时不查库，
-- 所以这张表整个不需要了。
--
-- 历史：这张表最初存「用户名 + 密码哈希」，后来改成存 GitHub id
-- （见 0001_github_login.sql），现在连它也不需要了。
--
-- 为什么可以直接删：里面只有初始化脚本造出来的管理员记录，
-- 已经没有任何代码读它。删掉不影响任何功能。

DROP TABLE IF EXISTS "users";
