-- 登录方式从「用户名 + 密码」改成「GitHub OAuth」
--
-- 改动内容：
--   1. users 表去掉 password_hash，换成 github_id
--   2. 唯一索引从 username 换到 github_id
--   3. 清空 users 表
--
-- 【为什么可以直接清空】
--   原来那一行是初始化脚本按 .env 里的 ADMIN_USERNAME / ADMIN_PASSWORD
--   建出来的，密码哈希已经不再被任何代码使用。
--   清掉之后，你用 GitHub 登录一次就会自动重新写入一行 ——
--   不再需要在配置文件里保存任何密码。
--
--   代价是"已登录的会话失效"，需要重新登录一次。可以接受。
--
-- 【为什么 github_id 用 NOT NULL 且没有默认值】
--   这里表是空的，所以加非空列不会失败。
--   正常情况下 drizzle-kit 生成这种改动时会要求交互确认，
--   这个文件是手写的，就是为了让"删数据"这件事显式写在迁移里。

DELETE FROM "users";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_id" integer NOT NULL;
--> statement-breakpoint
DROP INDEX "users_username_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "users_github_id_unique" ON "users" USING btree ("github_id");
