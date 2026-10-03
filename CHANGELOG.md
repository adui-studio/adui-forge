# Changelog

> 版本与里程碑提交对齐：v0.2.0 → 063fb01，v0.3.0 → 6ec475b，v0.4.0 → 43b5043，v0.5.0 → efc6faf，v0.6.0 → c1937dc，v0.6.1 → ddd285b，v0.7.0 → e633c58，v0.7.2 → be0bc39，v0.8.0 → 3170c17，v0.9.0 → 33fa989，v0.9.1 → 80bc5fa，v0.9.2 → efa66fe，v1.0.0 → 8a8ef62，v1.1.0 → a9155e8，v1.1.1 → d5b63e8，v1.1.2 → 里程碑提交（见下），v1.1.3 → 里程碑提交（见下），v1.1.4 → 里程碑提交（见下），v1.1.5 → 里程碑提交（见下）。

## 1.1.5 — 2026-09-30

### 移动端

- **技能库只读屏**：Skill 列表（名称 / 启停 / 描述）→ 点开查看指令全文
  （可复制）；Chat 屏 AppBar 新增入口。增删改仍归 Web 端
- **Chat 执行 Agent 选择**：输入区上方选择器 + 底部弹层，列出默认与
  自定义 Agent；createConversation / createRun 透传 agentName，与 Web
  端同语义。Agent 列表加载失败时静默降级保持默认可用

### 文档

- Skills 指南更新到市场六步现状（四路导入 / 市场能力 / 技能包，
  zh-CN / en 双语）；README 能力表同步

---

## 1.1.4 — 2026-09-30

### Skill 市场

- **技能包导出/导入**（第五步）：`GET /skills/export-bundle` +
  `POST /skills/import-bundle`——全量 Skill 序列化为可分享 JSON，
  逐条 schema 校验（非法跳过并说明原因，上限 100 条）；Skills 页
  市场卡新增导出/导入按钮，整库迁移与分享闭环
- **使用统计**（第六步）：`GET /skills/usage`——统计每个 Skill 被
  多少个自定义 Agent 选中；已安装卡片显示引用数 Tag（悬停列出名单）

---

## 1.1.3 — 2026-09-30

### Skill 市场

- **版本驱动更新提示**（第三步）：内置技能安装版本（bundledVersion）持久化，
  本地版本低于目录版本时市场卡金色「有更新」标识与高亮按钮；
  同版本但内容不同标记「已修改」
- **粘贴导入**（第四步）：`POST /skills/import-markdown`——粘贴 SKILL.md
  即导入（服务端解析 + schema 校验 + 同名防覆盖，force 可越）；
  Skills 页新增粘贴导入对话框，冲突时显示覆盖勾选项

### 移动端

- **对比统计屏**：按 Agent / 按模型聚合批次数、完成 / 失败、平均耗时、
  最快胜出次数，对比页顶部图标进入
- **修复 5 处 API URL 插值丢失**（cancelRun / retryRun / deleteConversation /
  exportComparison / fetchComparison）——此前 analyze 与测试均能通过但
  请求路径错误，属静默运行时 bug

---

## 1.1.2 — 2026-10-01

### Skill 市场第二步

- **逐技能安装**：`POST /skills/import-bundled/:name`——单个内置技能安装，
  市场卡升级为逐技能列表（名称 / 描述 / 安装或更新按钮）
- **防覆盖保护**：用户已本地修改的同名 Skill 不会被静默覆盖——
  返回 `reason: modified`，UI 金色 Tag 标记并提示强制更新路径
- **version 字段**：内置技能目录版本化（当前 v1），为后续更新判断奠基

---

## 1.1.1 — 2026-10-01

### Skill 市场 MVP

- **内置技能目录**：随应用分发 5 个精选技能（bug-fixing / code-review /
  test-writing / minimal-diff / api-design），零网络依赖、零 SSRF 面
- **一键导入**：`GET /skills/bundled` + `POST /skills/import-bundled`（幂等
  upsert 并触发 Agent 重建）；Skills 页安装卡（i18n 双语）
- 导入的技能与目录导入 / SKILL.md 导出三层来源互通

---

## 1.1.0 — 2026-09-14

### 平台与生态

- **macOS Intel (x64) DMG**：Release matrix 扩展为 arm64 + x64 双包，
  Local Runner sidecar 随平台构建（统一命名 adui-forge-<version>-macos-x64.dmg）
- **Skill 市场占位**：Skills 页与文档站说明市场路线（导入导出已就绪）
- **文档站新增 Skills 指南**（zh-CN / en 双语，含生命周期与目录约定）

### 移动端

- **Run 详情屏增强**：模型输出展示、非终态自动轮询、取消 / 重试
- **对比查看 + 报告导出**：批次列表 / 详情 / CSV 与 Markdown 复制到剪贴板
- **会话删除**：历史会话二次确认删除

## 1.0.2 — 2026-09-14

### 产物命名规范化

- 全平台安装包统一命名 `adui-forge-<version>-<platform>.<ext>`：
  windows-x64-setup.exe / windows-x64.msi / macos-arm64.dmg /
  linux-x64.AppImage / linux-x64.deb / android.apk
- 各平台 Release job 增加重命名步骤（版本号单一来源为 tauri.conf.json / pubspec.yaml）

## 1.0.0 — 2026-09-14

### 首个正式版

v0.6.0 以来九个版本迭代收束：Workspace IDE（文件/Git/终端/Agent 三栏）、
Local Runner 本地闭环（Bun sidecar 分发、Trusted Local Mode、审批闭环、
Job Object 沙箱）、Skill 系统（SDK/注入/SKILL.md 双向）、Model Registry、
Workflow 条件分支图、会话持久化、对比分析（跨批次统计 + 报告导出）、
任务台账、i18n 双语（Web 与文档站）。CI / Release 持续全绿。

### 新增

- **对比报告导出**：`GET /comparisons/{id}/export/{csv|md}`——CSV 遵循
  RFC 4180（逗号/引号/换行转义），Markdown 含结果表与逐 Agent 输出；
  对比页选中历史批次后一键下载双格式

---

## 0.9.2 — 2026-09-14

### 本地沙箱（ADR-008）

- **JobObjectSandbox（Windows）**：Trusted Local Mode 下 Shell/Git 执行经 Windows
  Job Object——超时/abort/会话结束时**整树强制终止**，不再留孤儿进程
- Runner 沙箱选择：Windows + 信任模式自动选用；koffi 加载失败显式降级
  HostSandbox 并警告
- 诚实边界：内存/进程数上限经 koffi 3.3.2 存在兼容缺陷（恒 ERROR_BAD_LENGTH），
  暂缓启用（Query 同句柄正常，确认非句柄问题）；待 koffi 修复后补齐
- POSIX 沿用进程组树杀语义

---

## 0.9.1 — 2026-09-14

### 本地沙箱（ADR-008，docs/decisions）

- **JobObjectSandbox（Windows）**：Trusted Local Mode 下 Shell/Git 执行经 Windows
  Job Object——整树终止（超时/abort/会话结束不留孤儿）、koffi FFI（纯 npm 依赖）
- Runner 沙箱选择：Windows + 信任模式自动选用，koffi 加载失败显式降级 HostSandbox
  并警告；POSIX 沿用进程组语义
- 诚实边界：Job Object 提供进程树生命周期与限制，不做文件系统/网络隔离——那些由
  三层文件边界 + 审批 + Workspace 根约束

---

## 0.9.0 — 2026-09-14

### 文档站国际化（apps/docs）

- **zh-CN / en 双语**：内容重构为双语言根（Rspress 2 locales 约定：目录名 = lang），
  导航栏自动出现语言切换；部署后 <https://adui-studio.github.io/adui-forge/> 按浏览器
  语言自动跳转
- **全部 8 篇指南双语对照**：核心概念、快速开始、架构、API 参考、配置、安全模型、
  部署、Desktop 与 Mobile——内容更新至 v0.8.0（含自定义 Agent / 命名模型 / Skill /
  Workspace IDE / Local Runner / 对比分析 / 会话持久化等全部新能力）
- API 参考补齐 v0.8.0 全部新端点（agents CRUD、comparisons、conversations、skills、
  workspace、git 面板）；配置参考补 `FORGE_MODELS` / `FORGE_SKILLS_DIR`

### Web

- **404 路由**：catch-all 兜底页（i18n 文案 + 回控制台入口）

---

## 0.8.0 — 2026-09-14

### 平台能力

- **Workflow 删除**：`DELETE /workflows/:name`（内存/Prisma 双实现）+ 页面删除按钮
  （Popconfirm 确认）
- **对比统计按模型分组**：`GET /comparisons/stats/by-model`——自定义 Agent 取其
  配置模型、其余归 default；对比页新增模型维度胜负表
- **移动端会话管理**：Chat 历史会话删除（二次确认 + 列表即时刷新），与 Web 端
  共享 conversations 数据

---

## 0.7.0 — 2026-09-13

### 本地 Agent 能力升级（ADR-006，docs/decisions）

- **Trusted Local Mode**：用户显式信任后，本地 Agent 经 HostSandbox 装配
  `shell_exec` / `git_*` 工具（全部 approval 级）；默认关闭，能力上限仍为文件读写
- **本地审批闭环**：Runner 内置审批服务（与云端 ApprovalService 同语义）——
  approval 级工具触发 → `approval.required` 经 SSE 推送到 Agent 面板 → 批准/拒绝
  → Loop 继续/中止；端点 `GET /approvals/pending` + `POST /approvals/:id/decision`
- **桌面信任开关**：工作区页一键切换（确认卡说明风险），Runner 进程带
  `FORGE_TRUSTED_LOCAL_MODE` 重启生效
- **Runner retry 端点**：`POST /runs/:id/retry` 以原任务/原 Agent 新建 Run

### 流水线修复（此前 CI 与 Release 全红的根因）

- `frontendDist` 相对 src-tauri 解析，`../web/dist` 从未指向正确产物——Release
  Desktop 打包自首个 tag 起即失败；修正为 `../../web/dist` 并在全新 clone 复现验证
- CI Linux 补齐 Tauri 系统依赖（webkit2gtk 等），desktop cargo check 恢复
- workflow 编辑器测试固定 zh-CN（CI navigator 语言是 en-US）
- Release Flutter 安装修复被吞的 `$RUNNER_TEMP` 变量并加克隆重试
- AgentsModule 补导出 AgentConfigService（Linux 下 SkillsController DI 启动崩溃）
- bootstrap 冒烟测试：轮询放宽至 120s、早退即时失败并带出 stdout/stderr 诊断

---

## 0.6.1 — 2026-09-13

### Workspace 补强（阶段 4）

- **Runner retry 端点**：`POST /api/v1/runs/:id/retry` 以原任务/原 Agent 新建 Run，
  桌面端重试不再回落云端
- **Agent 面板嵌入 IDE**：工作区页三栏布局（文件树 / 编辑器 / Agent 对话），
  复用 chatReducer 流式语义与 runs 分发
- **编辑上下文注入**：Agent 面板可附带当前打开文件的实时内容（20K 字符截断保护，
  可开关）
- **Git 面板与编辑器联动**：变更文件一键在编辑器 Tab 打开（与 Diff 视图互补）

---

## 0.6.0 — 2026-09-13

### Workspace IDE（ADR-004/005，docs/decisions）

- **文件 API**：`/workspace/{tree,file}` tree/read/write/delete，复用 tool-sdk 三层边界
  （路径遍历 / symlink 逃逸 / 1 MiB 写上限 / 二进制拒绝）
- **工作区页**：文件树 + Monaco 编辑器（本地打包不走 CDN）+ 多 Tab + 新建/删除文件 +
  脏标记保存
- **Git 面板**：status / diff / commit（execFile 无 shell 拼接）+ Monaco DiffEditor
  对比 HEAD 与当前内容

### 本地运行闭环（Local Runner）

- **Runner 应用（apps/runner）**：Fastify 同形 REST（workspace + runs + SSE + cancel +
  retry），token Bearer/查询参数握手，仅监听 127.0.0.1
- **本地 Agent**：FORGE_MODEL_* 模型 + Workspace 文件工具（无进程执行工具，Sandbox First）
- **桌面分发**：Tauri spawn/stop/status 命令 + PlatformAdapter 路由——工作区与 Runs
  请求在桌面端自动指向本地 Runner，云端 API 与本地对页面透明

### 平台能力

- **Skill 系统**：packages/skill-sdk（schema / resolveSkills / composeSystemPrompt）、
  Skill 管理 API 与页面、Agent 指令注入与即时重建、SKILL.md 导入/导出双向闭环
- **Model Registry**：FORGE_MODELS 命名模型目录，自定义 Agent 可指定模型
- **Workflow 图定义**：可序列化条件分支（graph 校验/编译/执行），编辑器自由连线 +
  条件节点 + 画布坐标持久化
- **会话持久化**：conversations 存储 + REST + Chat 历史会话/重命名/删除/失败重试
- **对比分析**：多 Agent 并排流式对比 + 批次持久化 + 跨批次胜负统计

### 工程与体验

- **i18n**：i18next 双语言（zh-CN/en）全页面迁移、antd locale 跟随、语言切换持久化、
  键覆盖守卫测试
- **交互惯例修复**：侧栏导航、URL 深链接（Runs/Tasks 筛选）、破坏性操作确认、
  路由级 code-splitting
- **任务台账页**（Tasks）：新建派生 Run、实时状态回填

---

## 0.5.0 — 2026-09-05

### 发布工程

- Release 流水线：tag 触发 Desktop 安装包（Windows NSIS/MSI）与 Mobile APK 上传 GitHub Release
- 全端版本号统一 0.5.0（web / desktop / tauri / mobile）

---

## 0.4.0 — 2026-09-05

### 平台能力

- Agents 页：Agent 清单与工具集（`GET /api/v1/agents`）
- 侧边栏登录态区块（有令牌显示退出，否则登录入口）

### 品牌与体验

- Mobile 品牌化主题：Material 3 深色（电光绿 × 深紫，与 Web 一致）；Android 应用名改为 ADui Forge

---

## 0.3.0 — 2026-09-05

### 平台能力

- **Run 取消**：`POST /runs/:id/cancel`（AbortController 中止，收敛为 cancelled）
- Run 详情增强：执行产物展示（Artifacts）、内联审批（等待时直接批准/拒绝）、
  取消与重试按钮

---

## 0.2.0 — 2026-09-05

### 品牌与体验

- 页面结构参照 Dify / n8n / LangSmith 重构：侧边栏导航 + 控制台落地页
  （指标卡 / 快速发起 / 最近 Runs）
- 沉浸式品牌主题：电光绿 × 深紫（取自 logo 渐变），极光背景 + 玻璃拟态 + 辉光交互
- 设置页：API 健康（含数据库状态）、登录态管理
- 侧边栏实时状态：API 健康呼吸灯 + 审批待办角标（轮询）

### 品牌

- logo 全端接入：Web favicon/页头/登录页、文档站页头、Desktop 启动图标（BMP ICO）、
  Mobile 全套启动图标（flutter_launcher_icons）；scripts/generate-icons.cjs 一键再生成

---

## 0.1.0 — 2026-08-30

首个可用里程碑（MVP-1 至 MVP-45）。

### 领域核心

- `packages/contracts`：Run / Step / 事件（`domain.action`）/ 模型与工具协议
- `packages/agent-runtime`：有界 Agent Loop（maxSteps / timeout / abort /
  tokenLimit），Tool 输入 Zod 校验，Approval 挂起
- `packages/agent`：Agent 定义组装、注册表、`agentToTool` Multi-Agent 委派
- `packages/tool-sdk`：defineTool / ToolRegistry / 文件与 Git 工具 /
  Workspace 边界防御 / Sandbox 抽象（Host + Docker）/ shell_exec
- `packages/ai`：AI SDK streamText 桥接（token 级流式）+ ModelRegistry
- `packages/workflow`：agent / tool / condition 节点引擎
- `packages/mcp`：MCP Server 工具桥接（ajv 校验）

### 平台

- `apps/api`：Auth（Argon2id + JWT）、Agents、Runs（SSE/Artifacts/Retry）、
  Approvals、Tasks、Workflows、Memory、Metrics、OpenAPI、Rate limit
- `apps/web`：任务发起、Runs 列表与详情（实时事件流/过滤）、审批页、
  Workflows 页、登录页
- `apps/docs`：Rspress 文档站（GitHub Pages 部署）
- `infra`：PostgreSQL / Redis / MinIO 开发设施、api/web 镜像

- `apps/desktop`：Tauri 2 桌面壳（复用 Web UI，PlatformAdapter 双实现，cargo build 产物验证）
- `apps/mobile`：Flutter App（Runs / 详情 / 审批 / 设置 / 登录五屏，Riverpod + go_router + Dio + 安全存储，widget 测试）

### 工程

- Vite+ / pnpm catalog 统一工具链；CI（GitHub Actions）全量验收
- 冒烟脚本 `pnpm run smoke`
