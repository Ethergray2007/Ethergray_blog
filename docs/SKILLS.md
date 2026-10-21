# 技能清单（Skills）

> 这份文档说明这台机器上给我的 AI 助手都装了哪些「技能」（skill）：
> **每个技能解决什么问题、什么情况下我会自动用它、你想强制用某个技能时该怎么点名。**
> 它只是一份说明书，删掉这个文件不会影响任何功能。
>
> 生成时间：2026-10-16 ｜ 本机共 31 个（第三方安装）+ 4 个（DSH 自带）

---

## 一、先搞懂 4 件事

**1. 技能是什么**

技能就是给 AI 的「专项操作手册」：一个文件夹里放一份 `SKILL.md`（外加脚本、模板、参考资料）。
平时它不占我的上下文，只有当任务匹配上时才被读进来。
所以技能的价值是**防止我凭记忆瞎写**——尤其是那些更新很快的东西（Supabase、AI SDK、Vitest）。

**2. 两种触发方式**

```text
① 我自动触发：任务描述匹配到技能的 description，我会主动加载（catalog 里能看到的都属于这种）
② 只能你点名：技能里写了 disable-model-invocation: true，我永远不主动用，
   必须你输入 /技能名 或明确说「用 xxx 技能」。本机有 3 个属于这种（见第五节）
```

**3. 装在哪儿**

```text
C:\Users\q1213\.agents\skills\     主目录（DSH 和大多数工具都读这里）
C:\Users\q1213\.claude\skills\     镜像给 Claude Code
C:\Users\q1213\.codex\skills\      镜像给 Codex

DSH 自带的 4 个不在上面这些目录里，跟着程序走，npx 管不到：
  office-docx / office-pptx / office-xlsx / diagnose-windows-sandbox-acl
```

**4. 怎么装新的**

```powershell
# 先让 AI 用 find-skills 技能去找（它会查 skills.sh 榜单、核实装机量）
# 再手动装：
$env:npm_config_cache="$PWD\.npm-cache"     # 本机沙箱限制，见 AGENTS.md
npx skills add <owner/repo>@<skill> -g -y   # -g 全局安装，-y 跳过确认
npx skills update                            # 升级已装的
```

⚠️ 本机直连 GitHub 超时，装的时候要带上代理（详见 `AGENTS.md` 的「推送代码」一节）。

---

## 二、总览表

### A. 服务这个博客（Astro / Elysia / 数据库 / 视觉）

| 技能 | 一句话 | 典型触发 |
| --- | --- | --- |
| `astro` | Astro 框架：页面、内容集合、SSR、构建 | 改页面、加内容集合、构建报错 |
| `elysiajs` | ElysiaJS 后端框架 | 写 `/api` 接口、插件组合 |
| `drizzle-orm-patterns` | Drizzle ORM：schema、查询、事务、迁移 | 动 `src/db/`、改表结构 |
| `tailwind-css-patterns` | Tailwind 工具类、响应式、布局套路 | 调样式、写组件 |
| `shadcn` | shadcn/ui 组件增删改查、preset、设计系统 | 加 UI 组件、调主题 |
| `frontend-design` | 视觉方向感：排版、配色、别写成模板样 | 新页面定调、觉得"太业余" |
| `minimalist-ui` | 极简编辑风规范（暖灰、无渐变无重阴影） | 明确要极简风时 |
| `web-design-guidelines` | 按 Web Interface Guidelines 审查 UI（可达性/UX） | 「检查我的 UI」「审一下设计」 |
| `vercel-react-best-practices` | 69 条 React/Next.js 性能规则 | 写 React 组件、拆包、性能问题 |
| `archify` | 画架构图/流程图/时序图 → 独立 HTML + SVG，可导出 | 「画个架构图」「画一下流程」 |

### B. 服务 vibe learning（Next.js / Supabase / AI）

| 技能 | 一句话 | 典型触发 |
| --- | --- | --- |
| `vercel-react-best-practices` | （同上）React/Next.js 性能与数据获取 | 见上 |
| `supabase` | Supabase 全产品：DB/Auth/Storage/Edge/Realtime + CLI + MCP + 排错 | 任何和 Supabase 有关的活 |
| `supabase-postgres-best-practices` | Postgres 8 类规则：建表、RLS、索引、EXPLAIN、连接池、pgvector | 写/改任何 SQL 或表结构之前 |
| `ai-sdk` | Vercel AI SDK：生成、流式、结构化输出、工具调用、`useChat` | 写 AI 出题、流式输出、结构化 JSON |
| `better-auth-best-practices` | Better Auth 配置：适配器、会话、插件、环境变量 | 登录注册、权限、会话 |

### C. 测试与验收

| 技能 | 一句话 | 典型触发 |
| --- | --- | --- |
| `tdd` | 先写测试再写实现（红绿重构）、测试该放哪、反模式 | 「用 TDD 做」「先写测试」 |
| `vitest` | Vitest 5 用法：mock、覆盖率、过滤、fixture | 写单元测试配置文件 |
| `webapp-testing` | 用 Python Playwright 测本地 web 应用（自带起服务器脚本） | 「测一下本地页面」 |
| `playwright-cli` | 命令行浏览器自动化：开页面、点击、快照 | 交互式点点点、跑 E2E |
| `agent-browser` | 浏览器自动化 CLI（CDP + 可访问性快照） | 「打开网站」「截图」「填表」「抓数据」 |

### D. 教学与课程结构

| 技能 | 一句话 | 典型触发 |
| --- | --- | --- |
| `scaffold-exercises` | 脚手架生成练习目录：`章节/练习/{problem,solution,explainer}` | 建课程章节、出练习题骨架 |
| `teach` ⚠️只能点名 | 状态化教学工作区：`MISSION.md` + `lessons/` + `reference/` + 学习记录 | 你要我系统教你一个主题时 |

### E. 文档与办公文件

| 技能 | 一句话 | 典型触发 |
| --- | --- | --- |
| `office-docx` / `docx` | 读写 Word（前者用自带 LibreOffice，推荐） | .docx 进或出 |
| `office-pptx` / `pptx` | 读写 PPT（含母版、备注、图表） | .pptx 进或出 |
| `office-xlsx` / `xlsx` | 读写 Excel（含公式、格式、pandas 分析） | .xlsx/.csv 进或出 |
| `pdf` | PDF 全套：读、抽表、合并拆分、水印、填表、加密、OCR | .pdf 进或出 |
| `web-artifacts-builder` | 造复杂单页 HTML 制品（React + Tailwind + shadcn） | 「做个能点的小 demo」 |

### F. 元技能（关于"怎么干活"本身）

| 技能 | 一句话 | 典型触发 |
| --- | --- | --- |
| `find-skills` | 去 skills.sh 生态搜技能并核实装机量 | 「有没有能做 X 的技能」 |
| `codebase-design` | 深模块词汇：接口、接缝、深度 | 设计模块边界、决定在哪测 |
| `setup-ts-deep-modules` ⚠️只能点名 | 用 dependency-cruiser 强制"包 = 深模块" | 想给仓库加边界检查时 |
| `grill-me` ⚠️只能点名 | 对你的方案做不留情面的追问 | 「拷问我这个方案」 |
| `diagnose-windows-sandbox-acl` | Windows 沙箱 ACL 拒绝访问时的诊断修复（DSH 自带） | 沙箱报"文件访问被拒绝" |

---

## 三、分类详解

### A. 这个博客本身

**`astro`** —— 博客的骨架就是 Astro。
- 用：加/改页面（`src/pages/`）、内容集合（`src/content/` 的友链/说说/项目）、SSR 适配、`astro.config.ts`、构建报错。
- 注意：本机构建还有「字体下载超时」「dev server 和 build 抢 `.astro/`」两个坑，写在 `AGENTS.md`，和这个技能无关。

**`elysiajs`** —— `/api` 那一层的框架。
- 用：加接口、写插件（`.use()` 组合）、修路由匹配。
- 注意：**不要照它的文档把鉴权改成 `guard` + `resolve`** —— 本项目为了「401 优先于 422」特意每个处理函数自己检查登录，理由写在 `AGENTS.md` 和 `validation.ts` 文件头。

**`drizzle-orm-patterns`** —— 表和查询。
- 用：改 `src/db/schema.ts`、写仓库函数、加约束、跑 `db:test`。
- 注意：本项目三条特例（相对导入带 `.ts`、仓库函数收 `db` 参数、能用数据库约束就别写在代码里）优先于技能里的一般写法。

**视觉四件套怎么分工**（容易混）：

```text
frontend-design          决定"长什么样"——方向、排版、气质（新页面定调时用）
minimalist-ui            一套具体的极简风格配方（只在明确要这种风格时用）
tailwind-css-patterns    怎么用 Tailwind 把它写出来（布局/响应式/工具类）
shadcn                   具体组件的用法与增删（有 components.json 时）
web-design-guidelines    写完之后的审查关：可达性、交互、UX 问题
```

⚠️ 本项目还有自己的**唯一事实来源** `src/styles/theme.css`。视觉技能给的是通用建议，**和它冲突时以 theme.css + AGENTS.md 的设计系统规则为准**（比如"正文用三档 `text-base-content-*`，不要自己编 `/50`"）。

**`archify`** —— 需要"讲清楚结构"时用。
- 用：画 vibe learning 的「课程制作工具 ↔ 学习平台」架构、闯关流程图、判分时序图；也能吃 Mermaid，输出可交互 HTML + 可导出 PNG/SVG/WebM。
- 注意：涉及真实代码的图它会先去仓库里核对，所以别拿它画"想象中的架构"。

### B. 服务 vibe learning

**`supabase`**（官方，326K 装机）—— 只要碰 Supabase 就该加载。
- 用：数据库表、Auth（登录/JWT/Cookie/RLS）、Storage、Edge Functions、Realtime、Vectors、Cron、CLI、MCP、以及**排错**（HTTP/Postgres 报错、`permission denied`、schema cache、超时、日志）。
- 它自带两条硬规则：① **不许凭记忆写 Supabase**，先看 changelog 有没有 breaking change；② 改完必须跑一次查询验证。

**`supabase-postgres-best-practices`**（官方，446K）—— 比上一条更底层，**管 SQL 和表结构本身**。
- 用：建表/改列（含选类型）、schema 设计、迁移、**RLS 策略及验证测试**、索引、触发器、函数、pg_cron/pgmq、pgvector、`pg_restore`；以及慢查询、CPU 高、超时、`EXPLAIN`、连接耗尽、锁、膨胀、"看到了不该看到的行"。
- 定位：**8 类规则按影响排序**（查询性能、连接管理 → … → 高级特性），每条都带"错误写法 vs 正确写法"。
- 对 vibe learning 的意义：**「答案和隐藏测试不能给前端」这条红线，落地就是 RLS**，这个技能正好覆盖。

**`ai-sdk`**（官方，64K）—— 第 2 步「AI 分析项目 → 按模板产出题目」的核心工具。
- 用：`generateText` / `streamText` / **structured output（结构化输出）** / tool calling / agent / embedding / `useChat` / RAG。
- 它最重要的一句话：**别信我的记忆，去读 `node_modules/ai/docs/`** —— 那才是和你装的版本一致的文档。
- 对本项目的用法：让 AI 输出严格符合 JSON Schema 的题目对象，比"输出 JSON 然后正则抠"可靠得多。

**`better-auth-best-practices`**（官方，123K）
- 用：`auth.ts` 配置、数据库适配器、会话、插件、环境变量。
- 两个项目都用得上：博客已经用 Better Auth（无状态 Cookie 模式），vibe learning 也要登录。

### C. 测试与验收

**`tdd`**（1.1M 装机）
- 核心概念是 **seam（接缝）**：测试只写在"公开接口"上，不碰内部实现；写之前先跟你确认接哪些缝。
- 用：判分引擎、课程包校验、模板渲染这种"输入输出明确"的模块最适合先写测试。

**`vitest`**（antfu 官方，41K）
- 是**文档型**技能：Vitest 5.0.1 的 API、mock、覆盖率、fixture，防止我写出旧 API。
- 用：写 `*.test.ts`、配 `vitest.config.ts`、调覆盖率。

**三个浏览器技能的区别**（重要，别选错）：

```text
webapp-testing    写 Python + Playwright 脚本，自带 with_server.py 起本地服务器
                  → 适合"给我把这条流程自动跑一遍，产出结论"
playwright-cli    命令行交互式点点点（open/goto/click/screenshot）
                  → 适合"我正在排查一个具体交互，一步一步来"
agent-browser     更快的 CDP 自动化 + 可访问性快照（@eN 引用）
                  → 适合"打开网站、填表、截图、抓数据、探索式 QA/找 bug"
```

⚠️ **现状：`playwright-cli` 和 `agent-browser` 的命令行还没装**（`Get-Command` 查不到），要用得先 `npm i -g agent-browser && agent-browser install` / 装 `playwright-cli`。`webapp-testing` 需要 Python Playwright（本机有捆绑 Python，一般可用）。

### D. 教学与课程结构

**`scaffold-exercises`**（450K）—— 和你的「课程包结构」互为印证。
- 目录约定：`exercises/XX-章节名/XX.YY-练习名/{problem|solution|explainer}/`
  - `problem/` 学生要填的 TODO 工作区
  - `solution/` 参考答案
  - `explainer/` 讲解材料（没有 TODO）
- 用：建课程章节骨架、批量生成练习桩。注意它默认对接的是 mattpocock 自己的 `ai-hero-cli lint`，我们的项目里那一步用不上，**只借它的目录结构和"三选一"思路**。

**`teach`** ⚠️只能你点名（`/teach`）—— 816K 装机，最值得研究的一个。
- 它把"教你"变成**状态化工作区**：`MISSION.md`（你为什么学这个）+ `lessons/*.html`（一节一个自包含课程）+ `reference/*.html`（速查卡）+ `learning-records/*.md`（学到哪了，决定下一节教什么）+ `RESOURCES.md`。
- 对 vibe learning 的意义：**这就是你要做的东西的一个可运行参考实现**——"为什么学（MISSION）"对应学习动机，"learning record"对应你的闯关进度，"reference"对应知识点卡片。设计课程包 JSON 时建议对着它抄概念。
- 注意：它是**用户点名型**，我不会自动用；用法是 `/teach 我想学 XXX`。

### E. 文档与办公文件

- **`office-docx` / `office-pptx` / `office-xlsx`**（DSH 自带）：优先用这三个 —— 它们只用程序自带的 LibreOffice，环境已配好。
- **`docx` / `pptx` / `xlsx` / `pdf`**（Claude 生态版）：功能更全（PDF 有 OCR、填表、加密；xlsx 带 pandas 分析），需要时也能用。
- `web-artifacts-builder`：做"能点、有状态、能路由"的单页 demo。⚠️ 它是给 claude.ai artifact 场景设计的，**这个博客的正式页面不要用它**，正式页面走 Astro + 项目自己的设计系统。

### F. 元技能

- **`find-skills`**：以后想加能力，先让我用它搜（会看装机量和来源可信度），别乱装。
- **`codebase-design`**：一套"深模块"词汇（接口 / 接缝 / 深度）。和 AGENTS.md 里"一个功能 = 一组自包含文件、接入最多 2 行"是同一个思路的两套说法，可以互相参考。
- **`setup-ts-deep-modules`** ⚠️只能点名：给仓库装 dependency-cruiser，强制"包的根文件才是公开接口"。想给博客加这种机械边界检查时用。
- **`grill-me`** ⚠️只能点名：**目前装了但用不了** —— 它全文只有一句「调用 grilling 技能」，而 `grilling` 没装（见第五节）。

---

## 四、场景速查：我要干 X，用谁

| 我想干的事 | 该上的技能 | 说明 |
| --- | --- | --- |
| 给博客加一个页面/组件 | `astro` + `tailwind-css-patterns` + `shadcn` | 设计规则以 `theme.css` 为准 |
| 「首页看着太业余，帮我改」 | `frontend-design` → 改完 `web-design-guidelines` 审一遍 | 两步走：先定调，再挑错 |
| 改数据库表 / 写仓库函数 | `drizzle-orm-patterns`（博客）；`supabase-postgres-best-practices`（新项目） | 动表之前先加载 |
| 做一个 AI 出题功能 | `ai-sdk` + `supabase` | 结构化输出 + 存库 |
| 设计课程包 JSON / 练习结构 | `scaffold-exercises` + `teach`（点名） | 抄目录结构，不抄 lint |
| 给判分逻辑写测试 | `tdd` + `vitest` | 先确认"缝"在哪 |
| 「帮我打开页面看看哪里不对」 | `agent-browser`（需先装 CLI）或 `webapp-testing` | 我现在看不到你的页面，全靠这个 |
| 把方案讲清楚给人看 | `archify` | 输出可交互 HTML + 可导出图 |
| 出一份 Word/Excel/PPT/PDF | `office-*`（首选）或 `docx`/`xlsx`/`pptx`/`pdf` | |
| 找新能力 / 装新技能 | `find-skills` | 会核实装机量与来源 |
| 方案想被泼冷水 | `/grill-me`（当前不可用，见下） | |

---

## 五、注意事项与已知问题

**1. 有 3 个技能"只能你点名"，我不会自动用**

```text
grill-me                 拷问方案
teach                    系统教一个主题
setup-ts-deep-modules    给仓库加强制模块边界
```

它们的 `SKILL.md` 里写了 `disable-model-invocation: true`，所以不进入我的自动触发目录。
用法是 `/技能名`，或者直接说「用 teach 技能教我 XXX」。

**2. `grill-me` 现在是坏的**

它全文只有一句「Call the Skill tool with "grilling"」，而 `grilling` 这个技能**没有安装**
（mattpocock 仓库里它是独立的一个技能）。要修就补装：

```powershell
npx skills add mattpocock/skills@grilling -g -y
```

**3. 两个浏览器技能的命令行还没装**

`playwright-cli`、`agent-browser` 这两个技能是"说明书 + 命令行工具"的组合，
技能装了、CLI 还没装（`Get-Command` 查不到）。真正要用浏览器时先补：

```powershell
npm i -g agent-browser; agent-browser install     # agent-browser
npx -y playwright-cli --version                    # playwright-cli 走 npx 即可
```

**4. `agent-browser` 是 `hidden: true`** —— 它的说明书写着"优先用我，而不是内置浏览器工具"，但它藏起自己，只留一句"去跑 `agent-browser skills get core` 拿最新文档"。

**5. 重叠技能怎么选**（别同时加载，会互相打架）

| 重叠的一组 | 首选 | 理由 |
| --- | --- | --- |
| `office-docx/pptx/xlsx` vs `docx/pptx/xlsx` | `office-*` | DSH 自带、只用捆绑 LibreOffice、环境已配好 |
| `supabase-postgres-best-practices` vs `drizzle-orm-patterns` | 按项目 | 博客是 Neon + Drizzle → 用后者；vibe learning 若选 Supabase → 用前者 |
| `frontend-design` / `minimalist-ui` / `tailwind-css-patterns` | 按阶段 | 定调 / 风格配方 / 落地写法，不是三选一 |
| `webapp-testing` / `playwright-cli` / `agent-browser` | 按任务 | 自动化跑流程 / 交互排查 / 探索式 QA |
| `web-artifacts-builder` vs `astro` | 看交付物 | 临时 demo 用前者，博客正式页面用后者 |

**6. 技能也吃上下文**

技能内容读进来就算上下文。所以"多装"不等于"更强"——
一次任务里别同时加载五六个技能，按上表挑 1~3 个最对口的。

**7. DSH 自带的 4 个不受 `npx skills` 管理**

`office-docx` / `office-pptx` / `office-xlsx` / `diagnose-windows-sandbox-acl` 跟着程序走，
`npx skills update` 不会碰它们，也删不掉（除非改程序本体）。

---

## 六、怎么维护这份清单

```text
1. 想加能力  → 让我用 find-skills 搜（会核实装机量 + 来源可信度，只留官方或 100K+ 的）
2. 装          npx skills add <owner/repo>@<skill> -g -y   （记得带代理 + 项目内 npm 缓存）
3. 升          npx skills update
4. 改完这份文档：更新「二、总览表」的计数和对应分类那一行
```

**上次更新的判断依据**：skills.sh 装机量榜单 + `npx skills find` 检索，
只推荐官方仓库（vercel / vercel-labs / supabase / microsoft / anthropics / antfu / better-auth）
或装机量 10 万以上的个人仓库。
