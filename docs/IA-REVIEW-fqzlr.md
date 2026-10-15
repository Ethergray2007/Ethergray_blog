# blog.fqzlr.top 信息架构拆解与精简方案

> ⚠️ **这份评审的对象不是本仓库。** blog.fqzlr.top 是另一个人的站点
> （本站视觉有部分参照它，见 AGENTS.md 的「参考站有两个」）。
> 放在这里是为了留一份"别人怎么组织内容"的取证材料，
> 其中的建议**尚未在本仓库实施** —— 不要把文中出现的页面
> （`/anime/`、`/moments/`、`/devices/` 等）当成我们的路由。
>
> 取证时间：2026-10-14
> 取证方式：`web_fetch` / `read_page` 抓取线上页面，`/sitemap-index.xml` → `/sitemap-0.xml` 取全量 URL，
> 逐条访问详情页与过滤 URL 做对照。所有结论均带可复现的 URL 证据。
> 本文只描述**抓到的页面与导航文字**，不依据主题名（Shirone / Firefly / Mizuki）推测实现。

---

## 一、现状 IA

### 1.1 导航树（按抓到的 nav 文字逐字记录）

顶部导航共 **7 个直接可见入口 + 1 个「更多」下拉（7 项）**，合计 13 个入口：

```
番茄主理人 (站名)
├─ 主页        /
├─ 归档        /archive/
├─ 友链        /friends/
├─ 动态        /moments/
├─ 番剧        /anime/
├─ 网址导航    /compass/
├─ 相册        /albums/
└─ 更多  ▾
   ├─ 时间线    /timeline/
   ├─ 项目      /projects/
   ├─ 我的设备  /devices/
   ├─ 技能      /skills/
   ├─ 打赏      /sponsor/
   ├─ 关于      /about/
   └─ GitHub    https://github.com/LyraVoid/Shirone   ← 外链，与站内栏目同级
```

证据：`https://blog.fqzlr.top/`、`https://blog.fqzlr.top/archive/`、`https://blog.fqzlr.top/anime/`、
`https://blog.fqzlr.top/compass/`、`https://blog.fqzlr.top/albums/`、
`https://blog.fqzlr.top/timeline/`、`https://blog.fqzlr.top/projects/`、
`https://blog.fqzlr.top/devices/`、`https://blog.fqzlr.top/skills/`、
`https://blog.fqzlr.top/sponsor/`、`https://blog.fqzlr.top/about/` —— 这些页面的 nav DOM 完全一致。

### 1.2 三类入口的归类

| 类别 | 入口 | 说明 |
| --- | --- | --- |
| **内容** | `主页` `/`、`归档` `/archive/`、`动态` `/moments/`、`番剧` `/anime/`、`相册` `/albums/` | 受众来看的东西 |
| **关于我** | `关于` `/about/`、`时间线` `/timeline/`、`项目` `/projects/`、`我的设备` `/devices/`、`技能` `/skills/`、`打赏` `/sponsor/` | 站长的自我介绍与运营 |
| **工具收藏** | `网址导航` `/compass/` | 外链聚合，60 个站点 |
| **社交** | `友链` `/friends/` | 双向链接，需要对方参与 |
| **外链** | `GitHub` | 不属于站内信息架构 |

### 1.3 内容体量（决定入口该不该给的硬数据）

| 集合 | 体量（页面自报） | 证据 |
| --- | --- | --- |
| 文章 | **43 篇** / 5 页（每页 9 篇） | `/archive/` "43 篇文章"；`/2/` 页码 2/5 |
| 分类 | 6 个 | `/categories/` "6 个分类 · 43 篇文章" |
| 标签 | 93 个（页面自称 165 篇文章，见 §2.6） | `/tags/` |
| 网址导航 | **60 个站点** / 7 组 | `/compass/` "60 个站点" |
| 番剧 | **5 部** / 3 个状态 | `/anime/` "5 部番剧" |
| 我的设备 | **5 款** / 4 组 | `/devices/` "5 款设备" |
| 技能 | **21 项** / 3 组 | `/skills/` "21 项技能" |
| 动态 | **5 条** | `/moments/` "5 条动态" |
| 时间线 | **4 个节点** | `/timeline/` "4 个节点" |
| 项目 | **3 个** | `/projects/` "3 个项目" |
| 相册 | 3 个（+1 个隐藏） | `/albums/` "3 个相册" |

**关键反差**：`/compass/` 有 60 条数据却要藏在「更多」里（不是，它在一级），
而 `/timeline/`（4 条）、`/projects/`（3 个）、`/anime/`（5 部）、`/devices/`（5 款）、
`/moments/`（5 条）这几页都被放进了导航。

### 1.4 完整 URL 名录（来自 `/sitemap-0.xml`，共 72 条）

| 分组 | 路由 | 是列表还是详情 |
| --- | --- | --- |
| 首页 + 分页 | `/`、`/2/`、`/3/`、`/4/`、`/5/` | 列表（分页） |
| 文章 | `/posts/cheshi000000001/`、`/posts/notes/lora-xun-lian/`、`/posts/notes/zhi-zuo-liu-cheng/`、`/posts/philosophy/2026-09-19/`、`/posts/philosophy/{camus-sisyphus-happy, kant-moral-law, know-thyself-socrates, nietzsche-gaze-into-abyss, platos-cave-allegory, sartre-existence-precedes-essence, stoicism-dichotomy-of-control, wangyangming-zhixingheyi, wittgenstein-language-limits, zhuangzi-wuyong-zhiyong}/`、`/posts/reading/reading-{dostoevsky-crime-punishment, marquez-hundred-years, maugham-moon-sixpence, qianzhongshu-fortress, yuhua-to-live}/`、`/posts/tech/{24 篇}/` | 详情（42 条 URL） |
| 归档视图 | `/archive/`（`?category=` `/8tag=` 都是它自己）、`/categories/`、`/tags/` | 列表 |
| 动态 | `/moments/` | 单页集合，**无详情路由** |
| 番剧 | `/anime/` | 单页集合，**无详情路由**，卡片外链 B 站 |
| 相册 | `/albums/` + `/albums/{AcgExample, EncryptedExample, ExternalExample, HiddenExample}/` | 列表 + **有**详情 |
| 关于我 | `/about/`、`/timeline/`、`/projects/`、`/devices/`、`/skills/`、`/sponsor/` | 单页 |
| 收藏/社交 | `/compass/`、`/friends/` | 单页 |
| 订阅端点 | `/rss/`、`/atom/`、`/rss.xml` | 端点 + 订阅说明页 |
| 未接入导航 | `/AGENTS/`、`/guestbook/` | 见 §2.1 |

### 1.5 页面模板复用度（实测对照）

**（a）布局外壳：100% 复用 ✅**

每个页面都带同一套：站名 + 7 项 nav + 「更多」+ 亮色/暗色/跟随系统 + 侧栏（头像卡 `fqzlr`
「躬身入局，心为主理……」/ 页面浏览 / 公告「人生是旷野，不是轨道……」/ 友链推广 /
「大版本更新·稳定性修复一批·互换友链·关于我的介绍」更新日志 + 「查看详情」）。
详情页也带这整块 —— 连 `/posts/tech/git-guide/` 都有自己的更新日志侧栏。

**（b）「列表页 + 筛选标签页签 + 卡片网格」：4 处重复实现 ⚠️**

| 页面 | 页签文字 | 数据 |
| --- | --- | --- |
| `/anime/` | 看完 / 在看 / 想看 | 5 部，卡片含评分、集数 `8/12`、年份、制作、标签 |
| `/projects/` | Theme / Android | 3 个，卡片含年份、状态「构建中/已发布」、技术栈、查看源码 |
| `/devices/` | Desk Setup / Mobile & EDC / Audio & Visual / Peripherals | 5 款，卡片含年份、厂商、状态、规格、查看详情 |
| `/skills/` | Frontend / Backend / Tooling | 21 项，卡片含熟练度、描述 |

四者的**交互完全同形**（页签过滤 → 卡片网格 → 外链详情），却是四套独立渲染。

**（c）详情页模板：只有两套，且都只服务一个集合**

- **文章详情** `/posts/<seg>/<slug>/`：标题、日期、字数、阅读时长、页面浏览、分类、标签、
  TOC（`#` 锚点）、封面、正文、「作者 fqzlr / 发布于 / 许可协议 CC BY-NC-SA 4.0」、
  「分享文章」（生成分享图）、「沿着主题读」（同分类相关）、「换条路线」（跨分类随机）、
  「最后更新于 2026-08-10，距今已过 65 天」、上下篇。
  证据：`https://blog.fqzlr.top/posts/tech/git-guide/`
- **相册详情** `/albums/<Name>/`：`← 返回相册`、封面、日期、来源类型「Local archive/Remote source/Private garden」、
  照片数、标签、照片网格（AcgExample 22 张）。
  证据：`https://blog.fqzlr.top/albums/AcgExample/`

**（d）完全没有详情模板的集合**：`/moments/`、`/anime/`、`/compass/`、`/friends/`、
`/timeline/`、`/projects/`、`/devices/`、`/skills/` —— 它们只在索引页内联展示，
「详情」一律外链（B 站、GitHub、apple.com）。

**（e）加密机制存在两套不同实现 ⚠️**

- 文章：`/posts/cheshi000000001/` 显示「## 受保护的文章 / 该文章已被加密保护，请输入访问密码以解锁内容。/ 访问密码 [解锁文章]」
- 相册：`/albums/EncryptedExample/` 首屏**没有任何加锁提示**，只显示封面、「2 张照片」和标签；
  照片网格不出现，解锁 UI 需要 JS。

---

## 二、问题

### 2.1 导航：13 个入口有 6 个是「空壳」，而入口层级和内容量倒挂

- 一级可见 7 项 + 「更多」7 项 = **13 个入口**，超过人一次能扫读的 5~7 项。
- 「更多」里封着 6 个站内栏目（时间线、项目、我的设备、技能、打赏、关于），
  以及一个 **外链 GitHub** —— 外链与站内栏目同级，是信息架构上的分类错误。
- **最刺眼的数据反差**：`/compass/` 有 60 个站点却和 `/timeline/`（4 个节点）、
  `/projects/`（3 个项目）、`/anime/`（5 部）、`/devices/`（5 款）、`/moments/`（5 条）
  共享同一层级的导航权重。后五个的「一页内容量」还不到一屏。

### 2.2 三组孤儿路由：导航删了，页面还在（且在 sitemap 里）

| 路由 | 实测结果 | 问题 |
| --- | --- | --- |
| `/guestbook/` | HTTP 200 → **重定向到 `/404/`** | 死路由，却仍列在 `/sitemap-0.xml` |
| `/404/` | **HTTP 404**（Tencent EdgeOne 平台错误页） | 站点自己的 404 页不存在，跳转目标是坏的 |
| `/AGENTS/` | 200，内容为仓库协作规范（"Keep route files thin…" 等） | **内部开发文档被公开发布并进 sitemap** |
| `/albums/HiddenExample/` | 200，页面自述「This album is omitted from the index but remains available by direct URL」 | 自称"不进索引"却仍在 sitemap |
| `/albums/{AcgExample, EncryptedExample, ExternalExample}` | 200，内容为 `Some lovely pictures` / `A local album scanned from this directory.` / `A password-protected album backed by the reusable protected-content protocol.` | 主题示例内容未清理，仍是全英文占位 |
| `/tags/`、`/categories/`、`/rss/`、`/atom/` | 200，但 **nav 里没有入口**（`/rss/` 仅在侧栏 icon 指向 `/rss.xml` 时被间接使用） | 可访问但不可发现 |

`/archive/` 本身也没有导航入口 —— 它是导航里的「归档」，但 `/` 与 `/archive/` 的第一屏
差异只是「9 篇卡片流」vs「43 篇按年列表」，用户难以预期该点哪个。

### 2.3 内容模型：文章是唯一的「真集合」，其余 7 个栏目是「带样式的链接表」

- **文章**：唯一拥有「列表 + 详情 + 分类 + 标签 + 分页 + RSS + 加密」的集合。
- **动态 / 番剧 / 网址导航 / 项目 / 设备 / 技能 / 时间线**：都是单页内联的条目，
  无详情路由（`/anime/Lycoris-Recoil/` → **404**；`/projects/` 卡片直接外链 GitHub；
  `/anime/` 卡片直接外链 `bilibili.com/bangumi/media/mdxxxx`）。
- **相册**：第二个真集合，有独立详情路由 `/albums/<Name>/` 与独立的加密机制。
- 因此这 7 个栏目**本质是同一种数据**（外链/展示型条目），却被做成了 7 套独立页面。

### 2.4 URL 结构与层级不可预测

同一批文章出现 **3 种分组写法**，且分组名与前台分类**不一致**：

| 写法 | 实例 | 前台分类 |
| --- | --- | --- |
| 有二级组 | `/posts/tech/git-guide/` | 技术教程 |
| 有二级组（组名与分类不同） | `/posts/reading/reading-yuhua-to-live/` | 读书感悟 |
| **无二级组** | `/posts/cheshi000000001/` | cheshi |
| 组名与分类**互相矛盾** | `/posts/philosophy/2026-09-19/` | **cheshi** |
| slug 是日期 | `/posts/philosophy/2026-09-19/` | — |
| slug 是测试串 | `/posts/notes/lora-xun-lian/`（标题「lora 训练」，摘要仍是模板默认的「这是文章的简短描述」） | 分类「分类」 |
| **同一篇文章三个 URL** | `/posts/cheshi000000001/`、`/posts/philosophy/2026-09-19/` 均返回标题「测试1234」、分类 cheshi、日期 2026-09-19 | cheshi |

分类体系本身也含测试残留：`/categories/` 列出 `cheshi 1`、`分类 1`、`个人笔记 1`、`哲学随想 10`、
`技术教程 25`、`读书感悟 5` —— 前三个是占位/测试分类。

### 2.5 筛选是坏功能，且所有筛选 URL 塌缩到同一个 canonical

同一个 canonical（都是 `/archive/`），不同参数返回**完全相同的 43 篇全量列表**：

```
/archive/                              → 43 篇
/archive/?category=哲学随想             → 43 篇（同上，未过滤）
/archive/?category=技术教程&page=1      → 43 篇（同上，未过滤）
/archive/?tag=Astro                    → 43 篇（同上，未过滤）
```

后果：

1. **用户视角**：从文章页点分类/标签（`/posts/tech/git-guide/` 上的
   `/archive/?category=技术教程`）回到归档，看到的是全量 43 篇，筛选等于没发生。
2. **SEO 视角**：全站 99 个分类/标签链接（`/categories/` 6 个 + `/tags/` 93 个 +
   每篇文章页若干）**全部指向同一个没有 canonical 差异的 URL**，全部被 sitemap 收录为同一页。
3. **分页只在首页**：`/2/`…`/5/` 存在，但 `/archive/` 一屏 43 篇无分页。
   `/moments/`（5 条）、`/albums/` 也无分页（当前量小，但结构上没留口子）。

### 2.6 计数数据自相矛盾

| 页面 | 自报数字 |
| --- | --- |
| `/archive/` | 43 篇文章 |
| `/categories/` | 6 个分类 · 43 篇文章 |
| `/tags/` | 93 个标签 · **165 篇文章** |
| `/sitemap-0.xml` | `/posts/*` 实际 **42** 条 |

「165 篇文章」与「43 篇文章」相差近 4 倍，是模板硬编码值残留的典型症状。
「43」与 sitemap 的「42」也差 1（存在有 URL 无列表项的条目）。

### 2.7 模板复用：外壳很好，但「集合页」模式重复了 4 次

- ✅ 布局外壳（nav / 主题切换 / 侧栏）**一套到底**，这部分不需要动。
- ⚠️ 「页签过滤 + 卡片网格」在 `/anime/`、`/projects/`、`/devices/`、`/skills/`
  各写一遍 —— 这才是维护成本失控的地方。加一个新集合要复制一整页。
- ⚠️ 侧栏的「更新日志」（大版本更新 / 稳定性修复一批 / 互换友链 / 关于我的介绍）
  在**每个页面**都出现，包括文章详情页。它和 `/timeline/` 是同一份数据的两个渲染，
  正文页被这段固定的侧栏持续稀释。

---

## 三、建议的目标 IA

### 3.1 设计原则（三条，用于裁决后面所有取舍）

1. **一级导航 ≤ 6 项**，且每项背后必须有 ≥ 10 条内容，否则下沉。
2. **一个内容模型 = 一个集合 = 一套模板**。凡是「条目 + 外链」的数据，统一成一个集合。
3. **URL 必须能预测**：列表页 `/<集合>/`，详情页 `/<集合>/<slug>/`，分页 `/<集合>/page/<n>/`，
   分类 `/<集合>/category/<slug>/`，标签 `/<集合>/tag/<slug>/`。**不使用查询参数做筛选。**

### 3.2 目标导航树（含每项对应路由）

```
番茄主理人
├─ 首页          /
├─ 文章  ▾                     ← 43 篇，站内唯一的内容集合
│   ├─ 全部文章      /posts/            （列表 + 分页；替代现在的 /archive/）
│   ├─ 分类          /posts/categories/ → /posts/category/<slug>/
│   └─ 标签          /posts/tags/       → /posts/tag/<slug>/
├─ 动态          /moments/     ← 短内容，独立模型（无标题/无 slug）
├─ 收藏夹  ▾                   ← 60 站点 + 5 部番剧，全部是外链条目
│   ├─ 网址导航      /bookmarks/
│   └─ 追番          /bookmarks/anime/
├─ 相册          /albums/      → /albums/<slug>/
└─ 关于我  ▾                   ← 「关于」类页面的唯一入口
    ├─ 关于        /about/
    ├─ 时间线      /timeline/
    ├─ 项目        /projects/
    ├─ 我用什么    /uses/      （合并原 /devices/ + /skills/）
    └─ 友链        /friends/

页脚 / 次级入口（不进一级导航）
├─ 打赏          /sponsor/
├─ 订阅          /feed/        （替代 /rss/ + /atom/ 两个说明页）
├─ 搜索          /search/
└─ RSS 端点      /rss.xml、/atom.xml
```

一级条目 **5 项 + 1 个站名**（原来 13 项），全部可达路径 ≤ 2 次点击。

### 3.3 每一项的去向：保留 / 合并 / 砍掉，以及代价

| 原入口 | 处置 | 新位置 | 代价 |
| --- | --- | --- | --- |
| `主页` `/` | **保留** | `/` | 无。但需明确 `/` 是「精选/最新」而非全量，全量去 `/posts/` |
| `归档` `/archive/` | **改址 + 改名** | `/posts/` | 老 URL `/archive/` 需要 301；外部书签与搜索引擎索引会短暂失配 |
| `动态` `/moments/` | **保留** | `/moments/` | 无 |
| `番剧` `/anime/` | **降级到二级** | `/bookmarks/anime/` | 少一个一级入口；番剧是纯外链集合，与网址导航同构，合并后语义反而更准。需 301 `/anime/` |
| `网址导航` `/compass/` | **改名 + 改址** | `/bookmarks/` | 「网址导航」是新奇特导航站的行业词，个人博客语境下「收藏夹」更直观；但改名会让老用户一时找不到 |
| `相册` `/albums/` | **保留** | `/albums/`、`/albums/<slug>/` | 无。仅需清理 3 个示例相册 |
| `时间线` `/timeline/` | **保留，降为二级** | `/about/` 下 | 4 个节点，不够一级权重；下沉后可见性下降 |
| `项目` `/projects/` | **保留，降为二级** | `/about/` 下 | 3 个项目同理；作品集在个人站其实常被点，下沉有损失 —— 可在 `/` 首屏给一个区块补偿 |
| `我的设备` `/devices/` | **合并** | `/uses/` | 与技能语义不同（设备清单 vs 技术能力），合并后一页里要分两个区块，否则读者困惑 |
| `技能` `/skills/` | **合并** | `/uses/` | 同上。合并后 5 + 21 = 26 条，正好够一页 |
| `打赏` `/sponsor/` | **移出导航** | 页脚 + 文章末尾 | 打赏是低频且带交易感，放在一级会稀释内容入口；移出后曝光下降，但在文末出现转化率未必更低 |
| `关于` `/about/` | **保留，升为一级** | `/about/` | 无。它应该是「关于我」分组的标题页 |
| `GitHub`（外链） | **移出导航** | 页脚 / `/about/` | 无。外链不应与站内栏目同级 |
| `友链` `/friends/` | **降为二级** | `/about/friends/`（或保持 `/friends/` 挂 `关于我` 下） | 友链是**互访流量入口**，下沉会降低换链意愿 —— 这是本方案里最需要你拍板的一项 |
| `/AGENTS/` | **删除 + 从 sitemap 排除** | — | 无（这是内部文档，本就不该公开） |
| `/guestbook/` | **删除或修好** | — | 现在它重定向到一个 404 的 404 页 |
| `/albums/{AcgExample, EncryptedExample, ExternalExample, HiddenExample}` | **删除** | — | 无（主题示例数据） |
| `/posts/philosophy/2026-09-19/` | **删除（重复 URL）** | 保留 `/posts/cheshi000000001/` 或改 slug | 若已有外链指向被删的那个，需 301 |
| `/categories/`、`/tags/`、`/rss/`、`/atom/` | **归并** | `/posts/categories/`、`/posts/tags/`、`/feed/` | 老 URL 需 301 |

### 3.4 内容模型：合并成 5 个模型

| 模型 | 现在长什么样 | 目标形态 | 需要什么 |
| --- | --- | --- | --- |
| **POST 文章** | `posts` 集合，slug 分组不一致 | `slug` 全局唯一，URL 扁平 `/posts/<slug>/` | 一个 `category` + `tags[]` 字段（已有），删除路径里的分组 |
| **MOMENT 动态** | 独立单页 | 保持独立（允许无标题、无 slug、不进 RSS） | `id` + `date` + `body` + 可选 `image` |
| **LINK_ITEM 条目** | 番剧 / 项目 / 设备 / 技能 / 网址导航 **5 套** | **合并成 1 个集合**，用 `type` 区分 | `type: anime\|project|device|skill|site`、`title`、`url`、`group`、`year`、`status`、`tags[]`（可选 `rating` / `spec` / `level`） |
| **ALBUM 相册** | 独立集合，加密实现与文章不同 | 保持独立，**统一加密协议** | 复用一个 `<ProtectedContent>` 组件，替代现在两套 |
| **单例页** | about / timeline / friends / sponsor | 保持单例（配置文件驱动，不是集合） | 无详情/列表之分，不进 sitemap 的集合路由 |

**ARTIST 的关键收益**：`/bookmarks/`（60 站 + 番剧）与 `/uses/`（设备 + 技能）与
`/projects/` 三页**共用同一个「集合卡片网格」组件**，只是 `type` 不同。

### 3.5 组件与路由复用方案

```
src/layouts/
  PageShell.astro              ← 现有外壳（nav / 主题切换 / 侧栏），不动
  CollectionPage.astro         ← 新增：集合列表页（页签过滤 + 卡片网格 + 分页）
  DetailPage.astro             ← 现有文章详情壳

src/components/collection/
  CollectionGrid.astro         ← 替代 /anime /projects /devices /skills 四份重复实现
  CollectionCard.astro         ← 卡片：标题 / 年份 / 状态 / 标签 / 外链按钮
  CollectionTabs.astro         ← 页签（原来 4 处各写一遍）
  Pagination.astro             ← 抽出来，首页与 /posts/ 共用

src/pages/
  posts/index.astro                        ← 全部文章（列表 + 分页）
  posts/page/[page].astro                  ← 分页，替代 /2/ /3/ ...
  posts/category/[category].astro          ← 替代 /archive/?category=
  posts/tag/[tag].astro                    ← 替代 /archive/?tag=
  posts/categories/index.astro
  posts/tags/index.astro
  posts/[...slug].astro                    ← 文章详情（扁平 slug）
  bookmarks/index.astro                    ← { type: 'site' }
  bookmarks/anime.astro                    ← { type: 'anime' }
  uses/index.astro                         ← { type: 'device' | 'skill' }
  projects/index.astro                     ← { type: 'project' }
  moments/index.astro
  albums/index.astro + albums/[slug].astro
  about/index.astro + timeline/ + friends/ + sponsor/
  feed/index.astro                         ← 替代 /rss/ + /atom/
  search/index.astro
```

**一套集合页 = 一个配置对象**（给出 TypeScript 形状，直接可用）：

```ts
type CollectionType = "anime" | "project" | "device" | "skill" | "site";

interface CollectionPageSpec {
  type: CollectionType;
  title: string;          // 走 src/i18n/，不硬编码
  tabs?: string[];        // 页签分组键，对应条目的 group 字段
  externalLabel: string;  // 「查看源码」「前往 B 站」「查看详情」
}
```

**页面内容量核对**（合并后每页都撑得住）：

| 目标页 | 条目数 |
| --- | --- |
| `/posts/` | 43 |
| `/bookmarks/` | 60 |
| `/bookmarks/anime/` | 5 |
| `/uses/` | 5 + 21 = 26 |
| `/projects/` | 3 |
| `/albums/` | 3 |
| `/moments/` | 5 |

---

## 四、落地要点

### 4.1 分两步走，路由改动可以不做

**第一步（零风险，只动导航配置 + 加 301）**
1. 导航从 13 项收到 5 项 + 2 个下拉，**路由全部不变**。
2. 加 `_redirects`：`/anime/ → /compass/?tab=anime`（或先保留 `/anime/`）。
3. 删 `/AGENTS/`、`/guestbook/`、3 个示例相册，清理测试分类与重复 URL。

**第二步（URL 规范化，可选但推荐）**
4. 文章 slug 扁平化 + 全量 301 表。
5. 筛选从 `?category=` 改成预渲染路由。

> 如果站外已经有不少链接指向 `/archive/?tag=xxx` 或 `/posts/tech/xxx/`，
> 就停在第一步 —— 架构收益的 80% 来自导航分组，URL 改写的收益/风险比要差得多。

### 4.2 路由契约（写死，不再商量）

```
/                                首页（精选，分页复用）
/posts/                          全部文章，分页 /posts/page/2/
/posts/<slug>/                   文章详情，slug 全局唯一且 kebab-case
/posts/category/<slug>/          分类，预渲染
/posts/tag/<slug>/               标签，预渲染
/moments/                        动态
/albums/  /albums/<slug>/        相册
/bookmarks/  /bookmarks/anime/   收藏（外链条目）
/about/ /timeline/ /projects/ /uses/ /friends/
/sponsor/                        从页脚进
/feed/  /rss.xml  /atom.xml      订阅
/search/                         搜索
```

**明令禁止**：用 `?category=` / `?tag=` / `?layout=` 做内容筛选。
筛选状态必须是一个能被 sitemap 收录、能被分享的独立 URL。

### 4.3 加什么、删什么、怎么删（对齐本仓库 AGENTS.md 的约定）

- 新增 `CollectionPage.astro` / `CollectionGrid.astro` 时，文件头按 AGENTS.md 要求写清
  「想删掉这个功能？」三步，并在 `README.md` 的「可选模块」表登记一行。
- 删 `/anime/`、`/devices/`、`/skills/` 三个独立页时，同步删掉它们各自的
  「页签 + 卡片网格」重复实现；**删之前确认已被 `CollectionGrid` 覆盖**。
- 界面文案（新导航名「收藏夹」「我用什么」）必须走 `src/i18n/`，
  同时改 `types.ts`、`lang/zh.ts`、`lang/en.ts` 三个文件。
- 分类/标签 slug 用中文还是英文要一次定死。现在 `/archive/?category=技术教程` 是
  URL 编码后的中文，建议改用英文 slug（`tech` / `reading` / `philosophy`）并保留中文显示名，
  否则 93 个标签会造出大量编码 URL。

### 4.4 验收方式（可复现，用来证明修好了）

| # | 验收项 | 判定方法 |
| --- | --- | --- |
| 1 | 导航入口 ≤ 6 | 打开 `/`，数 nav 一级项 |
| 2 | **筛选真的变了** | `/posts/category/philosophy/` 与 `/posts/tag/astro/` 返回的条目集合**不相同**，且都少于全部文章 |
| 3 | 无重复 URL | sitemap 中 `测试1234` 只出现 1 次 |
| 4 | 计数一致 | `/posts/` 顶部数字 = `/posts/categories/` 顶部数字 = `/posts/tags/` 顶部数字 |
| 5 | 无孤儿路由 | sitemap 中不含 `/AGENTS/`、`/guestbook/`、示例相册 |
| 6 | 老 URL 不 404 | 逐个请求 `/archive/`、`/anime/`、`/devices/`、`/skills/`、`/compass/`，返回 301 且落在正确目标 |
| 7 | 404 页是站内页 | 请求一个不存在的路径，返回站内 404 而非 Tencent EdgeOne 平台错误页 |
| 8 | 加密体验一致 | 加密文章与加密相册首屏都出现同一个密码输入组件 |

### 4.5 仍需你拍板的三个点

1. **友链要不要留在一级**？它是互访流量入口，下沉到 `/about/friends/` 会降低换链意愿。
   建议：留一级，把「关于我」也提到一级 —— 那就是 6 项，压线可接受。
2. **`/archive/` 是改址成 `/posts/`，还是保留原址只改显示名**？改址更干净但伤外链。
3. **番剧降级成 `/bookmarks/anime/` 之后，5 部番剧还值不值得单独一页**？
   如果追番是会持续增长的兴趣（比如计划补到 30 部），保留独立页更合理。

---

## 五、补充取证：视觉 / 前端 / 内容 / UX（第二轮）

> 前四节解决的是「结构该怎么改」。这一节补另外四层：**视觉（哪些是主题默认值）**、
> **前端工程（体积 / 元信息 / 可达性）**、**内容（栏目价值与更新节奏）**、**UX（逐屏走查）**。
> 取证方式仍是 HTTP 抓取（线上页面 + 构建产物 + `HEAD` 探测），结论可按 URL 复核。
>
> ⚠️ **本轮的空白**：取证环境无法启动浏览器，所以这里是**定性判断，没有真实渲染数据** ——
> 不含 LCP / CLS / INP，也不含「动效顺不顺」的观感结论。
> 凡是「看起来怎样」的都要自己在浏览器里确认。

### 5.1 视觉：先分清哪一层是谁做的

| 层 | 内容 | 判定 |
| --- | --- | --- |
| 主题配方（出厂默认） | M3 type scale 12 档、圆角 4/8/12/16/28px、间距 4~40px 八档、星芒纹理层、顶部 3px 彩虹线、入场 stagger | 不是作者的设计 |
| 站点配置（作者唯一的颜色输入） | `--configHue: 165` 一个色相角驱动全套动态取色，次色 +65°、第三色 −100° | 机制本身有辨识度 |
| 作者手改（真正像「设计」的地方） | 中文正文用手写体 Yozai、卡片 hover 描边变虚线、纹理层用 SVG Data URI 当 mask、提示块用 `color-mix` 而非亮饱和色 | 值得看 |

**按 WCAG 相对亮度算出来的对比度**（用来判断「它的层级能不能抄」）：

| 用途 | 亮色 | 暗色 |
| --- | --- | --- |
| 正文 | 17.3:1 | 15.6:1 |
| 元数据 | 10.4:1 | 9.3:1 |
| 主色链接 | 6.4:1 | 11.1:1 |
| 透明度派生的 `text-75` | **3.8:1（低于 AA）** | 12.4:1 |
| 透明度派生的 `text-30` | **2.9:1** | — |

两条结论：

1. 它的正文与元数据层级**站得住**，两套主题都过 AA；
2. 但**透明度派生的层级在亮色下是失效的**（两档都低于 AA，且 `text-30` 三个页面里根本没用过）。
   这正好印证本仓库 `theme.css` 里那条注释：**浅色背景上能当正文读的最多只分得出两档**。
   → **不要抄它的透明度派生，保留本仓库的三档方案。**

### 5.2 前端工程：实测到的体积与元信息

| 项 | 实测值 |
| --- | --- |
| CSS | 13 个文件约 **52.6 KB**（最大 `MainGridLayout.*.css` 23.4 KB） |
| JS | 12 个文件约 **17.1 KB**（最大 `BannerStage.*.js` 5.0 KB） |
| 中文正文字体 | `/_astro/fonts/*.woff2` **699.5 KB**，且**全站无 preload** |
| 头像 / 封面 | 525.6 KB / 495.9 KB（单张） |
| **自托管 banner 视频** | **7.51 MB + 13.44 MB**（同域、无 poster） |
| 首页 HTML | 解码 332.8 KB；线上 br 后 58.1 KB，其中内联 JS 23.1 KB + 内联 style 56.7 KB + 内联 SVG 24.0 KB |

**做得对的地方（本仓库可以直接照做）**

- 内容哈希资源 `cache-control: public,max-age=31536000,immutable`；
  HTML 走 `max-age=0` + ETag（实测 `If-None-Match` 命中返回 304）。
- 图片是**构建期**生成 AVIF + WebP 多档 + `srcset`/`sizes`，
  `loading="lazy" decoding="async"` 到位，`onerror` 回退默认封面。
- 搜索（Pagefind）不进 head，用 `import()` 惰性加载，
  **失败时降级成空结果而不是白屏崩溃**。
- Islands 按 `client:load` / `client:visible` / `client:only` 分级水合，
  侧栏与列表卡片用 `visible`。

**缺口**

- **全站无 `canonical`**（抓 7 个页面一个都没有）。分页 `/`、`/2/`…`/5/`
  与 `?category=` 筛选页共用同一份 title/description —— 静态站最容易被判重复内容的地方。
- **无 `og:image` / `twitter:image`**，但文章页又声明了 `twitter:card = summary_large_image`
  （分享卡片会缺图）。
- 首页 `title` 与 `description` **逐字相同**；分页 title 也逐字相同。
- 无 `theme-color`（移动端地址栏与站点主题不一致）、无 `manifest`、无 `apple-touch-icon`、
  无任何 `preconnect` / `dns-prefetch`（第三方域至少 4 个）。
- 可达性：`lang="zh-CN"` ✅；首页 20 张图里 9 张无 `alt`；
  列表封面**没有** `width`/`height`（CLS 风险）；`/tags/`、`/archive/` 标题层级是 `h1 → h3`（跳过 h2）。
- `robots.txt` 的 `Disallow: /_astro/` 会挡住 Googlebot 取回 CSS/JS，
  影响「移动端适合性 / 渲染」评估 —— **它真正该屏蔽的是 `/AGENTS/`，不是自己的样式表**。

### 5.3 内容：43 篇的构成与更新节奏

| 分类 | 篇数 | 实际写的是什么 |
| --- | --- | --- |
| 技术教程 | 28 | 几乎全部是「搭 / 魔改 Astro 博客主题」——域名、图床、评论迁移、写作流、主题对比、壁纸 |
| 哲学随想 | 10 | 苏格拉底、柏拉图、庄子、王阳明、康德、尼采、萨特、加缪、斯多葛、维特根斯坦 |
| 读书感悟 | 5 | 《活着》《百年孤独》《围城》《月亮与六便士》《罪与罚》 |
| 其它 | 3 | 2 篇加密 + 1 篇测试稿 |

四个结构性问题：

1. **标题能力在两条线上差距极大。** 哲学 / 读书线统一用
   「人物或书名：一句可独立成立的断言」，后半句本身就是钩子
   （「尼采：凝视深渊时，别弄丢了自己」）；技术线却是搜索词式的
   （「怎么使用 obsidian 来编写 astro 博客」「lora 训练」「制作流程」）。
2. **系列编号断裂。** 5 月那篇自称「博客系列**第 3 期**」（`/rss.xml` 里可直接读到），
   而 9 月那批标着**第 14 / 15 / 16 期** —— 中间十期在归档里不存在。
   一个自称系统教程的系列缺了十期，读者无法顺序学习。
3. **更新节奏是「脉冲式」**：9/5 那天 75 分钟内集中发了 7 篇
   （归档只显示日期，看不出这一点）；10 月只有 1 篇且是加密的 ——
   对陌生访客而言**近一个月没有可读的新内容**。
4. **加密稿与测试稿占据公开归档与首页黄金位**，另有 2 篇 `description`
   还是占位符「这是文章的简短描述」，分类里还留着 `cheshi`、以及名叫「分类」的分类。

这一节的问题不是技术问题，是**内容治理**问题 —— 修起来几乎零成本
（删、改名、补一句），但不修会持续消耗可信度。

### 5.4 UX：三条值得学、三条该避

**值得学**

1. **文章页的阅读闭环**：正文前分类 chips，正文后「分享文章（生成分享图或复制链接）」
   +「沿着主题读（同标签同分类 3 篇）」+「换条路线（跨分类 2 篇）」+ 上/下一篇 + 评论。
2. **内容新鲜度提示**：文章尾部写「最后更新于 2026-08-20，**距今已过 53 天**，
   部分内容可能已过时」—— 用天数算出来的提醒比「最后更新：某日期」有用得多。
   **这条最值得抄进本仓库。**
3. **三态主题（亮 / 暗 / 跟随系统）+ 首帧前内联脚本落位**：图标由纯 CSS 消费
   `data-theme-mode`，**没有水合闪烁**；全局还有 `prefers-reduced-motion` 兜底。

**该避**

1. **首页第一屏 100% 给了壁纸**：构建后 CSS 把 `#main-layout` 推到 `top: 100lvh`，
   第一屏只有壁纸 + 宣言 + 社交图标，**没有任何一篇内容的入口**。
2. **文章页移动端被侧栏挤在正文前**：侧栏被显式放到 `row-start-2`，主内容列没有显式行号 ——
   从搜索结果点进来的人要先滚过一整套首页级侧栏（10 张卡片）才见到正文。
3. **导航把「内容」和「关于我」放在同一层**：13 个入口里真正的内容类目
   （`/categories/`、`/tags/`）反而不在导航里，只能从归档页的 tab 进。

### 5.5 落到本仓库的取舍（三条）

1. **只抄两样结构性的东西**：文章页阅读闭环（含「距今 N 天」）与缓存分层
   （哈希资源 immutable + HTML 协商）。
2. **不要抄它的正文排版与透明度层级**：前者是 Tailwind Typography 未改的默认值，
   后者在亮色下低于 AA —— 本仓库 `theme.css` 的三档文字层级更严谨。
3. **把它当「内容治理的反面教材」**：示例数据占位、坏数字、测试稿进公开归档 ——
   这三件事和「两套颜色体系」是同一种病：**没有单一事实来源**。

### 5.6 本轮未决项（需开浏览器复核，不要当已验证）

| # | 待确认 | 冲突情况 |
| --- | --- | --- |
| 1 | `/projects/`、`/skills/`、`/devices/`、`/timeline/` 是空壳还是模板数据 | 一份取证说空壳，两份独立取证引用了同样的条目字符串（Shirone / FolkPatch / KernelPatch、21 项技能、MacBook Pro 16"）→ 倾向「有模板数据」，**未终判** |
| 2 | `/moments/` 有没有 5 条动态 | 三份取证口径不一（有 5 条 / 无条目 / 404）→ **未决**。注意其中一份测的是主题内部路由名（`/dynamic/`、`/gallery/`），不是导航实际路由 |
| 3 | 首页图片统计 | 20 张 img / `alt` 缺失 9 张 / 缺宽高 7 张 —— 数字口径不同，但方向一致：**列表封面缺尺寸信息** |
| 4 | sitemap URL 数 | 71 vs 73（口径差，不影响结论） |

**本轮已独立复核、可直接引用的两条**：

- `/archive/` 写「43 篇文章」、`/tags/` 写「93 个标签 · 165 篇文章」—— 矛盾成立；
- `/AGENTS/` 返回 200，正文是内部开发约定（`src/config/README.md`、
  `src/types/sidebarConfig.ts`、`tests/site/a11y.spec.ts`）。

---

## 附录：本次取证用到的 URL 清单

抓取成功：`/`、`/2/`、`/archive/`、`/archive/?category=...`、`/archive/?tag=Astro`、
`/archive/?layout=list`、`/categories/`、`/tags/`、`/friends/`、`/moments/`、`/anime/`、
`/compass/`、`/albums/`、`/albums/AcgExample/`、`/albums/EncryptedExample/`、
`/albums/ExternalExample/`、`/albums/HiddenExample/`、`/timeline/`、`/projects/`、
`/devices/`、`/skills/`、`/sponsor/`、`/about/`、`/AGENTS/`、`/rss/`、`/atom/`、
`/posts/tech/git-guide/`、`/posts/cheshi000000001/`、`/posts/philosophy/2026-09-19/`、
`/posts/notes/lora-xun-lian/`、`/posts/notes/zhi-zuo-liu-cheng/`、
`/robots.txt`、`/sitemap-index.xml`、`/sitemap-0.xml`、`/rss.xml`

返回 404/重定向：`/search/`、`/category/技术教程/`、`/anime/Lycoris-Recoil/`、
`/moments/1/`、`/firefly/`、`/404/`、`/guestbook/`（→`/404/`）
