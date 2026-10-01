# 项目约定

> 这份文档是给"接手这个项目的 AI"看的，也是给你的备忘。
> 每次改动都按这里的规矩来，代码才不会越做越乱。

---

## 这个项目的定位

**不只是博客，也是学习项目。**

所以要同时满足两件事：

1. 博客要真的能用、好看、快
2. 代码要让人**看得懂、改得动、删得掉**

第二点经常和"写得快"冲突。冲突时**选第二点**。

---

## 硬性规矩

### 1. 一个功能 = 一组自包含文件

新功能不要散落在各处。标准结构：

```text
src/utils/xxx.ts                          纯计算，不碰 DOM，不碰 Astro
src/pages/.../\_components/Xxx.astro       只做渲染
```

**接入页面时最多 2 行**：一个 import + 一个标签。

### 2. 每个新文件头部写"怎么删"

```astro
---
/**
 * 功能名
 * ============================================================
 * 自包含模块：只依赖 xxx.ts
 *
 * 想删掉这个功能？
 *   1. 删掉这个文件
 *   2. 删掉文章页里的 <Xxx /> 那一行
 *   3. 删掉 src/utils/xxx.ts
 * ============================================================
 */
```

同时在 `README.md` 的「可选模块」表里登记一行。

### 3. 注释解释"为什么"，不是"做什么"

```ts
// ❌ 没用：把月份加 1
const month = date.getMonth() + 1;

// ✅ 有用：getMonth() 返回 0~11，1 月是 0，所以要 +1
const month = date.getMonth() + 1;
```

遇到**反直觉的地方必须写注释**：
- 为什么不能用那个"更现成"的方案（比如为什么 TOC 不能用 `slugifyStr`）
- 为什么顺序不能换（比如为什么必须先删代码块）
- 踩过的坑和它报的错长什么样

### 4. 中文优先

- 注释用中文
- 界面文案必须走 `src/i18n/`，**不要硬编码在模板里**
- 加文案要同时改三个文件：`types.ts`、`lang/zh.ts`、`lang/en.ts`

### 5. 能简单就不复杂

- 不加没有实际用途的配置开关
- 不为了"以后可能用到"而抽象
- 一个函数只做一件事
- 优先用项目已有的模式，不引入新写法

---

## 提交信息规范

**格式**：

```text
<类型>: <一句话说清做了什么>

（可选）为什么要做、有什么取舍、踩了什么坑
```

**类型只有这几个**（取自 Conventional Commits，是通行标准，
`git log --grep` 和自动生成 CHANGELOG 的工具都认它）：

| 类型 | 什么时候用 | 例子 |
| --- | --- | --- |
| `feat` | 加新功能 | `feat: 友链页` |
| `fix` | 修 bug | `fix: 登录检查写错了钩子` |
| `docs` | 只改文档 | `docs: 记录推送报 schannel 的处理` |
| `refactor` | 改结构但不改行为 | `refactor: 精简 api-errors` |
| `chore` | 杂事（依赖、配置、清理） | `chore: 删掉模板残留的 25 个文件` |
| `test` | 只改测试 | `test: 补登录权限的回归测试` |
| `perf` | 性能优化 | `perf: 换用 Neon HTTP 驱动` |

**硬性要求**：

```text
□ 标题不超过 40 字，一句话
□ 用中文（这个项目中文优先）
□ 不写"更新了 xxx"这种没有信息量的
□ 不写句号结尾
□ 一次提交只做一件事 —— 混在一起就该拆成两个提交
```

**为什么标题要短**：`git log --oneline` 是日常看得最多的视图，
一行放不下就会被截断，等于没写。详细原因放正文里。

**好的例子**：

```text
feat: 友链页
fix: 未登录时先回 401 而不是 422
perf: 数据库换成 Neon HTTP 驱动（冷启动快 2~4 倍）
chore: 删掉模板残留的 25 个文件
docs: 记录 git 推送报 schannel 的解法
```

**差的例子**：

```text
❌ 更新了一下                     ← 更新了什么？
❌ 修复 bug                       ← 哪个 bug？
❌ feat: 新增友链页面功能并顺便优化了一下样式和文档
                                  ← 太长，而且混了三件事
❌ 阶段 2d：在线写作后台           ← "阶段 2d" 是过程，不是结果
```

最后一条值得说明：**提交信息记录的是"这次改了什么"，
不是"我在哪个阶段"**。半年后看 `git log` 的人不关心阶段编号。

### 临时脚本一律用 `_` 开头

**这是踩了三次同一个坑之后定的约定。**

```text
❌ 第一次  把提交信息写到根目录的 COMMIT_MSG.txt，被 git add -A 收了
❌ 第二次  同样的错又犯一遍
❌ 第三次  写了 practice/_layout-survey.ts（调研别人博客布局用的），
          名字里带下划线，但当时 .gitignore 里没有对应规则
```

前两次的教训是"提交前要检查"，于是有了 `scripts/commit-check.ts`。
但它只能拦**已经列进模式的名字**（`^_diag`、`^_probe`…）——
换个名字就绕过去了，第三次就是这么漏的。

**所以现在改成按约定办，不靠列举**：

```text
在 practice/ 下临时写的验证 / 调研脚本，一律用 _ 开头。

   practice/_layout-survey.ts      ✅ 被忽略
   practice/_contrast-check.ts     ✅ 被忽略
   practice/layout-survey.ts       ❌ 会被提交
```

配套两道关（都要在）：

```text
.gitignore                practice/_*      ← 从源头不跟踪
scripts/commit-check.ts   /^_/            ← 万一被手动 add 了也拦得住
```

**为什么用下划线**：项目里已经有这个约定 ——
`src/pages/**/_components/` 就是"下划线开头 = 不是路由"。
同一个符号表示"内部/临时的东西"，不用记两套规则。

**正式文件不受影响**：`practice/tests/*.ts`、`practice/lesson-*.ts`
都是正经内容，照样进仓库。

### 提交前先跑检查器

```bash
npm run commit:check -- "feat: 你的提交信息"
```

它会检查两件事：

```text
1. 暂存区里有没有临时文件（写提交信息用的 COMMIT_MSG.txt 之类）
2. 提交信息格式对不对（type 是否合法、长度、结尾标点）
```

**这个脚本是踩坑之后加的，不是预防性设计。** 我犯过两次同样的错：

```text
❌ 第一次：把提交信息写到项目根目录的 COMMIT_MSG.txt，
          然后 git add -A 把它一起提交了
❌ 第二次：同样的错又犯了一遍 —— 说明"下次注意"不管用
```

所以现在有了机械的关卡。写提交信息时用 `.git/` 目录下的文件
（git 不会跟踪 `.git/` 里的东西），或者干脆用 `-m` 直接写。

**提交前的固定动作**：

```bash
git status --porcelain        # 先看一眼要提交什么
npm run commit:check          # 确认没有临时文件混进去
```

`git add -A` 很方便，但它会把**所有**变化都收进去 ——
包括你刚写的临时脚本、调试输出、提交信息文件。
提交前扫一眼 `git status` 是最便宜的保险。

---

## 改完必须过的检查

**按这个顺序跑**，先跑最快的：

```bash
npm run format:check # 1. 最快，而且能抓到别人抓不到的错（见下）
npx astro check      # 2. 类型检查，必须 0 错误
npx eslint .         # 3. 必须 0 问题
npm run build        # 4. 最慢，但最接近真实运行环境
```

四条全过才算做完。

**顺序很重要。** `format:check` 看着只是"格式化"，但它是唯一能发现
**"表达式内部写了 HTML 注释"**的检查：

```astro
{
  cond ? (
    <div>
      <!-- 这样写是错的，Prettier 会报 SyntaxError -->
    </div>
  ) : null
}
```

`astro check` 和 `build` **都不会报这个错** —— 构建能通过，但文件以后
再也格式化不了。所以先跑它，别等最后才发现。

正确写法是用 JSX 风格注释：`{/* 说明 */}`

**不要跳过 build** —— 它比 `astro check` 多抓一类问题
（比如 satori 不支持 woff2 这种运行时才会暴露的坑）。

---

## 这个项目特有的坑

### 设计系统：只有一套 token，改颜色前必读

**这个项目曾经同时跑着两套互不相干的颜色体系，这才是「页面显得业余」的真正原因。**

```text
src/styles/theme.css           自定义的 --background / --foreground / --accent
@plugin "daisyui";（光秃秃的）  daisyUI 预设的 --color-base-100 / --color-primary / …
```

因为没关掉 daisyUI 的颜色层，它的 `[data-theme=dark]` 会**压过**我们自己的
`--background`。于是同一个页面里：`text-primary` / `border-base-300` / `btn-primary`
走 daisyUI 的靛蓝紫，而 `text-base-content-strong` / `section-heading` 走自定义的橙蓝。
这不是审美问题，是**没有单一事实来源**。

**现在的结构（改视觉前先读懂这几层怎么配合）：**

```text
src/styles/theme.css        唯一事实来源。用 @plugin "daisyui/theme" 定义 light / dark
                            所有 --color-* 语义色 + 圆角 + 字体 + 文字三档
src/styles/global.css       @plugin "daisyui" { themes: false }  ← 不能删
                            并把下面几个样式文件串起来
src/styles/atmosphere.css   页面背景：网格底纹 + 光晕（自包含模块）
src/styles/hero.css         首屏：固定深色舞台 + 7 层 mesh gradient
```

**四条必须遵守的规则：**

```text
□ themes: false 不能删
  删了之后 daisyUI 的内置颜色层会重新发出来，压过我们的主题，
  表现是"改了颜色但页面没变"。这个坑踩过。

□ 改颜色只改 theme.css，不要在组件里写死色值
  唯一例外是首屏 hero.css —— 它是**固定深色区**、不跟随主题切换，
  所以那里的色值是写死的，文件里注明了原因。

□ 正文颜色用三档工具类，不要自己编 /50 /60 /70
  text-base-content-strong  要读的文字（页面说明、卡片摘要）
  text-base-content-muted   辅助说明（页脚、副标题）
  text-base-content-faint   元数据（日期、计数）
  这三档的数值是按 WCAG 对比度**算出来的**，表格在 theme.css 里。
  随手多加一个透明度 = 层级重新变糊 —— 原来"整页发灰"就是这么来的。

□ 字体：正文用 --font-sans（系统无衬线栈，零网络请求），
  代码和数字才用 --font-mono（Google Sans Code）
  正文以前用的是等宽字体，中文会被硬塞进等宽格子里。
```

**颜色与参考站的关系**：整套视觉参照 [elysia.nodejs.cn](https://elysia.nodejs.cn/)。
强调色 `#f06292` 直接来自它的 `--vp-c-brand-1`，首屏那 7 层光晕也照搬了它的
mesh gradient 配方（两个关键细节写在 `hero.css` 里：色标停在 50%、定位故意疏密不均）。
它是 VitePress + Tailwind 手写 CSS，**没有用任何 UI 组件库** ——
所以"换成 Elysia 用的那套 UI"这件事不存在，观感是自己写出来的。

### `git diff` 显示的差异 ≠「这次会话改的」

**我在这个坑上犯过错，代价是构建当场变红。**

看到 `git diff src/i18n/types.ts` 有变化，就认定是当前会话改的，
于是 `git restore --source=HEAD` 回退 —— 结果把**之前就存在的未提交改动**
一起冲掉了（那个文件里既有新改动，也有旧的未完成工作）。

```text
□ git diff 的基线是 HEAD（上一次提交），不是「你会话开始时的状态」
□ 回退之前先逐段核对内容，确认哪些是本次改的、哪些原本就有
□ 不要因为"文件时间戳是刚才"就断定它是这次会话写的 ——
  子代理、格式化工具、编辑器都可能更新它
```

### 构建可能因为**下载字体超时**而整体失败，而且报错会骗人

**这是实测遇到过的，不是理论风险。** 表现是这样的：

```text
[WARN] [assets] No data found for font family Google Sans Code. Review your configuration
[ERROR] Error: Cannot find the font path.
[ERROR] [build] Caught error rendering /og.png
build exit: 1
```

**看到这三行不要往字体配置上找** —— `astro.config.ts` 里的 `fonts` 段是对的。
真正的原因是：**Astro 在构建时要联网去 Google Fonts 下载字体**，
而那一次请求超时了：

```text
code: 'UND_ERR_CONNECT_TIMEOUT'
```

于是字体没进缓存 → `fontData` 里没有该字重 → `getFontPathByWeight()` 返回
`undefined` → `og.png.ts` 抛出 `Cannot find the font path.`，整个构建失败。

**这条报错链里没有一句话提到网络**，所以很容易误判成配置写错、
或者以为 satori 不认字体格式。正确的排查顺序是：

```text
1. 确认能不能连上 fonts.googleapis.com（这台机器直连会超时，见下面代理那节）
2. 看缓存目录 node_modules/.astro/fonts/ 里有没有文件
3. 两边都不行就是下载失败 —— 重跑一次 build 通常就好（瞬时故障）
```

**为什么这个坑暂时没法彻底消除**：字体缓存放在 `node_modules/.astro/fonts/`，
而 `node_modules/` 不进 git —— 所以**每次全新克隆、每次 Netlify 构建都要重新下载**。
Astro 7 也没有「只预下载字体」的命令（`astro --help` 里没有），
所以没法把它拆成一个可以单独重试的步骤。

**想彻底解决**（目前没做，留作后续）：把 ttf 提交进仓库，
改用自定义 provider 指过去，不再依赖构建时联网。
代价是仓库里多几个字体文件，以及要改 `astro.config.ts` 的 `fonts` 段。

⚠️ 顺带记住：**`formats` 里的 `ttf` 不能删**。
satori 底层的 opentype.js 不认 woff2，删了会报
`Unsupported OpenType signature wOF2`。

### 推送代码：必须走代理，而且可能要关掉证书吊销检查

这台机器直连 github.com 会超时，必须走本地代理：

```bash
git -c http.proxy=http://127.0.0.1:7892 \
    -c https.proxy=http://127.0.0.1:7892 \
    push Ethergray_blog <branch>
```

**如果报这个错**：

```
schannel: failed to receive handshake, SSL/TLS connection failed
```

先确认代理本身是通的（浏览器能开 github 就说明通），然后加上
`-c http.schannelCheckRevoke=false`：

```bash
git -c http.schannelCheckRevoke=false \
    -c http.proxy=http://127.0.0.1:7892 \
    -c https.proxy=http://127.0.0.1:7892 \
    push Ethergray_blog <branch>
```

原因是 Windows 的 git 用系统自带的 schannel 做 TLS，
它会去查证书吊销列表 —— 走代理时这一步容易失败，于是整个握手就断了。
`schannelCheckRevoke=false` 只是跳过这个检查，不影响传输加密。

**这个错会骗人**：一开始会以为是节点断了，但实测代理能正常访问
github.com，问题只在 git 这一侧。

### 装依赖必须用项目内的缓存目录（而且它必须被 gitignore）

沙箱环境不允许写全局的 npm 缓存，所以装包时要指定项目内的目录：

```powershell
$env:npm_config_cache = "$PWD\.npm-cache"
npm install 某个包
```

**⚠️ `.npm-cache/` 必须在 `.gitignore` 里。**
我犯过一次错：清理时觉得这个规则"没用了"就删掉了，
结果后来又用它装包（为了省时间），下次 `git add -A` 时
**482 个缓存文件被提交进了仓库**。虽然下一个提交就移除了，
但仓库历史里永远留着那些垃圾。

**教训**：删 `.gitignore` 规则之前先确认对应的目录真的不会再产生。
"现在不需要"和"以后也不会需要"是两件事 ——
尤其这条规则是**环境限制**逼出来的，而环境限制不会自己消失。

### 分支约定：推 main 前必须问

```text
develop  → Netlify 的 Deploy Preview（带密码保护，只有本人能看）
main     → 生产环境，所有人都能访问
```

**推送到 main 必须先获得确认。** develop 可以随便推。

### Mermaid 图表：不要往 `<pre class="mermaid">` 里塞任何东西

**这是踩过的坑，而且表现得非常费解。**

astro-mermaid 在浏览器里这样取图表定义：

```js
diagram.setAttribute('data-diagram', diagram.textContent || '');
```

问题出在 `textContent` —— **它会把所有子元素的文字都算进去**，
而且**不看 CSS**。一个 `position: absolute` 的按钮视觉上不占位置，
但它的文字照样进 `textContent`。

于是发生的事是：

```text
图表定义本来应该读到：   C --> F[结束]
实际读到：              C --> F[结束]Copy
结果：                  Parse error on line 7
```

**具体踩法**：AstroPaper 模板自带的 `attachCopyButtons()` 用
`#article pre` 抓代码块，把 "Copy" 按钮 `appendChild` 进 `<pre>`，
而 Mermaid 的块也是 `<pre>`。所以那个按钮污染了 Mermaid 的输入。

**现在的做法**：模板那段代码已删掉，统一用
`CopyCodeButton.astro`，它的选择器是 `pre.astro-code`
（只匹配 Shiki 高亮的块，天然避开 `<pre class="mermaid">`）。

**以后注意**：

```text
□ 往代码块里加东西（按钮、行号、文件名）之前，
  先确认选择器不会匹配到 pre.mermaid
□ 判断"会不会污染"要看 textContent，不能看 CSS 定位
□ 这个 bug 只在浏览器里出现 —— 服务端 HTML 是干净的，
  所以 curl 或构建产物检查都发现不了，必须真的打开页面看
```

### Windows + PowerShell

路径里有 `[...slug]` 这种方括号时，PowerShell 会把它们当**通配符**，
导致 `Test-Path` / `Get-ChildItem` 找不到文件。

```powershell
# ❌ 找不到
Test-Path "src\pages\posts\[...slug]\index.astro"

# ✅ 用 -LiteralPath
Test-Path -LiteralPath "src\pages\posts\[...slug]\index.astro"
```

### 沙箱环境会干扰构建

如果在受限沙箱里跑构建，可能报 `require is not defined`。
那是 Vite 内部 spawn 被拦截导致的（它会**静默失败**，然后把 CommonJS 包
当成 ESM 内联执行）。

**这不是代码问题。** 在正常终端里跑就好。

### 路径别名

```text
@/xxx     →  src/xxx
```

`astro.config.ts` 里用的是相对路径 `./src/...`，因为它要被 Node 直接加载。

### `@ts-expect-error` 不要随便用

`tsc` 和 Astro 的语言服务对同一段代码的判断可能不一致。
`@ts-expect-error` 在"没有错误可压制"时会**报错并中断构建**。

需要压制提示时用 `@ts-ignore`，并在注释里说明为什么该压制。

已知例子：`CopyCodeButton.astro` 里的 `document.execCommand` —— 它在
`astro check` 里是 deprecated 提示，但 `tsc` 不认，用 `@ts-expect-error` 会构建失败。

### 数据库层（src/db/）的三条特殊约定

**1. 相对导入必须写全 `.ts` 后缀**

项目其他地方都省略后缀，但 `src/db/` 不行 —— 这一层要在 Astro 之外
单独跑测试（`npm run db:test`），而 Node 直接执行 TS 时不支持省略后缀，
会报 MODULE_NOT_FOUND。

**2. 仓库函数接收 db 参数，不在文件顶部建连接**

```ts
export async function listPublishedPosts(db: Db, limit?: number)
```

这样测试时可以塞一个内存数据库（PGlite）进来，不碰线上数据。

**3. 能用数据库约束表达的规则，就不要只写在代码里**

例子：`posts_published_requires_date` 检查约束保证"已发布必有发布时间"。
放到数据库层之后，查询里就不用写 `nulls last` 之类的兜底逻辑，
而且不管从哪个入口写入都绕不过去。

### 几个踩过的坑

**`Buffer.from(x, "hex")` 对非法输入不报错，静默返回空 Buffer**

这会导致 `timingSafeEqual(空, 空) === true`，也就是**任何密码都能登录**。
十六进制串必须先自己校验格式。

（这个坑是在自己写密码校验时踩到的。现在登录改用 Better Auth，
`src/db/password.ts` 已经删掉 —— 但这条教训适用于任何手写校验的地方。）

**`promisify` 处理不了有重载的函数**

`promisify(scrypt)` 报 "Expected 3 arguments, but got 4" ——
scrypt 有多个重载，promisify 只推断出其中一个。手写一层 Promise。

**Drizzle 的错误被包装了一层**

```ts
error.message; // "Failed query: insert into ..."        ← 看不到原因
error.cause.message; // 'duplicate key value violates ...' ← 真正的原因
```

断言约束是否生效时要顺着 `cause` 找，不能只看 `message`。
第一次跑测试时这里表现为"约束没生效"，其实是**断言写错了** ——
改断言之前先打印真实的错误对象结构。

**Drizzle 0.45 的 `desc()` 没有 `nullsLast()` 方法**

那是 gel-core 的 API。需要 NULL 排序时改写 SQL，或者（更好）
用数据库约束消除 NULL 的存在。

### API 层（src/pages/api/）的约定

**1. 相对导入写全 `.ts` 后缀**

和 `src/db/` 一样，这一层要能在 Astro 之外跑测试（`npm run api:test`）。

**2. 接法用 Elysia 官方推荐的 Astro 集成模式**

[官方文档](https://elysiajs.com/integrations/astro)给的写法是：

```ts
const handle = ({ request }: { request: Request }) => app.handle(request);
export const GET = handle;
export const POST = handle;
```

我们用 `export const ALL = handler` 是它的通配版本，把所有方法一次接住。
另按官方要求：Elysia 放在 `pages/api/[...path].ts` 里时必须加
`prefix: "/api"`，否则路由匹配不上。

**3. 登录交给 Better Auth，不要自己写**

见下面「认证」那一节。

**4. 每个处理函数自己检查登录，不用 `onBeforeHandle`**

看起来重复，但是有原因的（见下面「Elysia 的坑」）。

**5. 整个 API 层只有一处类型断言**

`context.ts` 里的 `asContext()`。Elysia 的 handler 参数类型是深度推导的，
我们没声明 schema、db 又是自己 decorate 的，它推不出完整形状。
把断言收在一处之后，其他地方的所有属性访问都受类型检查 ——
拼错 `set.headers` 会立刻报错，而不是运行时才 500。

**6. 依赖通过参数注入，方便测试**

```ts
createApi(db, resolveUser)      // 数据库 + 怎么判断登录用户
createApi(db, alwaysLoggedIn)   // 测试：假装已登录
createApi(db, neverLoggedIn)    // 测试：假装未登录
```

这样 API 测试不需要真实数据库，也不需要走 GitHub OAuth 流程。

### 认证（Better Auth）

**不要自己写登录。** 这一点有明确的理由和代价核算：

自己写一套 GitHub OAuth + 会话 Cookie 要 800 多行安全代码
（state 防 CSRF、PKCE、HMAC 签名、防时序攻击……），
每一行写错都可能变成漏洞。改用 Better Auth 之后只剩 286 行（含注释）。

- 配置：`src/lib/auth.ts`（约 12 行有效配置）
- 挂载：`src/pages/api/session/[...path].ts`
- 前端：`src/utils/adminApi.ts` 里的 `authClient`

**用的是无状态模式**（配置里不传 `database`），所以：
- 登录状态存在**加密** Cookie 里，服务端验证时不查数据库
- `users` 表被删掉了 —— 数据库里不存任何用户信息
- 代价：没法"立刻踢掉某个会话"。要作废全部登录就改
  `session.cookieCache.version` 再部署

**为什么用 Better Auth 而不是别的**：
[Astro 官方文档推荐](https://docs.astro.build/en/guides/authentication/)它，
而且它官方支持 Elysia。

**⚠️ 别再去装 Arctic 或 Lucia**：
Arctic 在 2026 年 7 月弃用、Lucia 在 2025 年 3 月弃用，
作者现在建议"自己写一段单文件实现"。所以那个方向不要走回头路。

### Elysia 的几个坑（都实测过）

**`ctx.body` 会自动解析，`request.body` 会被标记为已读**

Elysia 看到 `content-type: application/json` 就会自动解析请求体放进
`ctx.body`，同时把 `request.body` 标记成已消费。这时再去读 request：

```
TypeError: Body is unusable: Body has already been read
```

⚠️ **这段历史要记住，因为它的结论被推翻过一次**：

当时我们自己写了个 `readJsonBody()` 去读 request，撞上这个问题，
所有带 body 的接口 500 而 GET 正常，排查了很久。改成
`readJsonBody(request, ctx.body)` 之后解决了。

**后来接入 Better Auth 时，登录那条路径不再需要它了** ——
但 `readJsonBody()` **并没有被删掉**，它还在 `validation.ts` 里，
被文章接口的 POST / PATCH 使用（`posts.ts`）。

所以这条坑的现状是：**不要再自己去读 request body**。
如果确实需要读，走 `readJsonBody(request, ctx.body)` ——
它用 `request.bodyUsed` 判断该用哪个来源，而不是猜。

**`onBeforeHandle` / `preHandler` 不适合做鉴权守卫**

它绑定时就把上下文类型固定了，注册函数必须精确匹配那个类型。
而且数据校验可能先于它执行，导致未登录时返回 422 而不是 401。
现在每个处理函数第一行自己调用 `resolveUser`，没有隐式规则。

**`guard` + `resolve` 也解决不了这个问题 —— 别照着技能文档改回来**

它们是 Elysia 官方推荐的"消除重复鉴权"写法（想一下少写几行检查），
但对本项目不成立：`resolve` 跑在校验**之后**（见技能
`elysiajs/references/lifecycle.md` 的 "Resolve" 一节），
用它做鉴权，校验就会先跑 —— 未登录的人照样先收到 422。

所以"每个处理函数自己检查登录"不是将就，是为了
**401 优先于 422** 的有意选择。同一个理由也写在
`src/pages/api/_routes/validation.ts` 的文件头里。

**看到 404 先怀疑请求 URL 本身**

排查期间我一直以为"所有请求 404"是钩子或 `.use()` 组合方式的问题，
还为此改过架构。**真正原因是我的探测脚本用了 `http://x` 这种
单字母主机名**，Elysia 匹配不上路由。换成 `http://localhost` 就正常。

**教训：先确认输入本身是否合法，再怀疑框架。**

**插件用 `.use()` 组合**

```ts
// ✅ 标准插件写法
export function xxxRoutes() { return new Elysia({ name: "xxx" }).get(...) }
// 使用时：new Elysia({ prefix: "/api" }).use(xxxRoutes())
```

**`Elysia<any>` 在参数位置不兼容**

Elysia 的类型在参数位置是逆变的，`Elysia<any>` 接不住
`Elysia<"/api", ...>`。用插件写法，或者用它导出的 `AnyElysia`。

**`.mount()` 会把整棵子树交出去**

Better Auth 用 `.mount()` 挂载时独占一个路径前缀。
我们因此给它单独开了 `/api/session/*`（而不是让它占用 `/api/auth/*`），
这样它和 `/api/posts` 之类互不干扰。

### 测试的边界：只测我们自己的代码

API 测试里有 `alwaysLoggedIn` / `neverLoggedIn` 两个替身，
**不走真实的 GitHub OAuth 流程**。

为什么不测：那要浏览器、要 GitHub 服务器，跑不了。
而且测的是 Better Auth 自己 —— 它有自己的测试，我们再测一遍没意义，
它一升级我们的测试还会碎。

所以测试只覆盖**我们写的部分**：访问控制、文章增删改查、
参数校验、状态码、错误格式。

### HTTP 头的字符限制

HTTP 头按规范只能包含字节（0~255）。往里面塞中文时，
Node 的 `fetch` 会在**发请求之前**就抛 ByteString 错误：

```
TypeError: Cannot convert argument to a ByteString because the
character at index 8 has a value of 20266 which is greater than 255
```

写测试时注意：Cookie、User-Agent 这类头的值只能用 ASCII。
浏览器也不会发出这种请求，所以这不是被测代码的问题。

### 目录结构

```text
src/pages/            文件路径 = 网址。index.astro → /
  [...slug]/          动态路由
  _components/        下划线开头 = 不会被当成路由
src/content/posts/    文章（Markdown），字段定义在 src/content.config.ts
src/utils/            纯函数
src/i18n/             文案
src/types/config.ts   站点配置的类型定义
```

---

## 写新功能时的推荐顺序

```text
1. 先写 src/utils/ 里的纯函数           ← 最容易测试，逻辑都在这
2. 用 node 直接跑一下验证逻辑对不对      ← node xxx.ts 可以跑 TS
3. 再写 .astro 组件，只负责渲染
4. 接入页面（2 行）
5. 跑四条检查
6. 更新 README 模块表
```

第 2 步很关键：**先把逻辑跑通，再关心样式。**
出问题时你也能立刻分清是"逻辑错"还是"渲染错"。

---

## 给 AI 的额外要求

- 改动前先读文件，不要凭印象改
- 一次只做一件事，做完立刻验证
- 不确定的 API 先去 `node_modules` 里看真实实现，不要猜
- 发现问题先报告，不要顺手改无关的东西
- 用户是初学者：解释用中文，术语第一次出现时用一句话说明

---

## 学习资料的位置

```text
docs/LEARNING-ROADMAP.md  学习路线，每个知识点对应仓库里哪个文件
practice/                 TypeScript 练习册（8 节课，能自动判分）
README.md                 模块清单 + 怎么删
```
