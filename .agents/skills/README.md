# ADui Forge — Agent Skills

本目录（`.agents/skills/`）是全仓库唯一的 Skill 存放位置：指导 Agent 在 ADui Forge 仓库中高质量完成特定任务的可复用能力包。

> ZCode 会同时扫描 `.zcode/skills/` 与 `.agents/skills/`，为避免同一 Skill 出现两份、
> 互相遮蔽，本仓库统一只维护 `.agents/skills/`（跨 Agent 工具共享、git 单一来源）。
> skills CLI 若再生成 `.zcode/skills/`，请把内容并入本目录后删除该目录。

与平台产品中的 Skill（`packages/skill-sdk`，面向 ADui Forge 用户的 Agent 能力）不同，
本目录的 Skill 面向"在 ADui Forge 仓库里工作的 Coding Agent"。

## 目录约定

```text
.agents/skills/
└─ <skill-name>/
   ├─ SKILL.md        # 必须：Skill 定义（frontmatter + 指令正文）
   ├─ scripts/        # 可选：可执行脚本
   ├─ references/     # 可选：参考文档
   └─ assets/         # 可选：静态资源
```

## SKILL.md 格式

```markdown
---
name: skill-name # kebab-case，与目录名一致
description: 一句话说明何时使用本 Skill
---

# 正文：具体指令、流程、约束
```

## 规则

- 新增 Skill 不得偷偷扩大 Tool Permission / Secret Permission / System Permission（见 AGENTS.md §45）。
- Skill 内容必须与 [AGENTS.md](../../AGENTS.md)、[docs/](../../docs/) 保持一致；修改规范时同步检查相关 Skill。
- 保持精简：Skill 是给 Agent 的操作指令，不是文档副本，能用链接引用的不要复制。

## 现有 Skill

### 本仓库自有

| 顺序 | Skill                                           | 用途                                         |
| ---- | ----------------------------------------------- | -------------------------------------------- |
| 1    | [plan](./plan/SKILL.md)                         | 动手前强制先理解需求、勘察现状、制定最小方案 |
| 2    | [repo-conventions](./repo-conventions/SKILL.md) | 在本仓库开发时遵循的工程约定与工作流         |
| 3    | [bug-fixing](./bug-fixing/SKILL.md)             | 按复现 → 根因 → 回归测试 → 修复的流程修 Bug  |

### 第三方安装（skills-lock.json 锁定来源）

skills CLI 管理，不要直接修改其内容。

#### 工作流与规范

| Skill                                                                                                                             | 来源                   | 用途                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------- |
| [git-commit](./git-commit/SKILL.md)                                                                                               | github/awesome-copilot | Conventional Commits 提交 |
| [conventional-commit](./conventional-commit/SKILL.md)                                                                             | github/awesome-copilot | 提交信息规范              |
| [conventional-branch](./conventional-branch/SKILL.md)                                                                             | github/awesome-copilot | 分支命名规范              |
| [git-flow-branch-creator](./git-flow-branch-creator/SKILL.md)                                                                     | github/awesome-copilot | Git Flow 分支创建         |
| [github-issues](./github-issues/SKILL.md)                                                                                         | github/awesome-copilot | GitHub Issue 管理         |
| [github-release](./github-release/SKILL.md)                                                                                       | github/awesome-copilot | GitHub Release 发布       |
| [github-actions-efficiency](./github-actions-efficiency/SKILL.md)                                                                 | github/awesome-copilot | Actions 工作流效率        |
| [github-actions-hardening](./github-actions-hardening/SKILL.md)                                                                   | github/awesome-copilot | Actions 安全加固          |
| [github-actions-runtime-upgrade-conventions](./github-actions-runtime-upgrade-conventions/SKILL.md)                               | github/awesome-copilot | Actions 运行时升级        |
| [create-github-action-workflow-specification](./create-github-action-workflow-specification/SKILL.md)                             | github/awesome-copilot | Actions 工作流规格        |
| [create-github-issue-feature-from-specification](./create-github-issue-feature-from-specification/SKILL.md)                       | github/awesome-copilot | 从规格生成 Feature Issue  |
| [create-github-issues-feature-from-implementation-plan](./create-github-issues-feature-from-implementation-plan/SKILL.md)         | github/awesome-copilot | 从实施计划生成 Issue      |
| [create-github-issues-for-unmet-specification-requirements](./create-github-issues-for-unmet-specification-requirements/SKILL.md) | github/awesome-copilot | 为未满足需求生成 Issue    |
| [create-readme](./create-readme/SKILL.md)                                                                                         | github/awesome-copilot | README 生成               |
| [memory-merger](./memory-merger/SKILL.md)                                                                                         | github/awesome-copilot | 记忆 / 上下文合并         |

#### 后端与数据

| Skill                                                         | 来源                         | 用途                              |
| ------------------------------------------------------------- | ---------------------------- | --------------------------------- |
| [nestjs-best-practices](./nestjs-best-practices/SKILL.md)     | kadajett/agent-nestjs-skills | NestJS 架构与最佳实践             |
| [prisma-\*](./prisma-database-setup/SKILL.md)（7 个）         | prisma/skills                | Prisma Schema / Client / Postgres |
| [postgresql-code-review](./postgresql-code-review/SKILL.md)   | github/awesome-copilot       | PostgreSQL 代码审查               |
| [postgresql-optimization](./postgresql-optimization/SKILL.md) | github/awesome-copilot       | PostgreSQL 查询与索引优化         |
| [sql-code-review](./sql-code-review/SKILL.md)                 | github/awesome-copilot       | SQL 代码审查                      |
| [sql-optimization](./sql-optimization/SKILL.md)               | github/awesome-copilot       | SQL 优化                          |

#### 前端与 UI

| Skill                                                                                       | 来源                                 | 用途                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------- |
| [vercel-react-best-practices](./vercel-react-best-practices/SKILL.md)                       | vercel-labs/agent-skills             | React / Next.js 性能最佳实践  |
| [vercel-composition-patterns](./vercel-composition-patterns/SKILL.md)                       | vercel-labs/agent-skills             | React 组合模式与组件 API 设计 |
| [vercel-react-view-transitions](./vercel-react-view-transitions/SKILL.md)                   | vercel-labs/agent-skills             | View Transition API 动画      |
| [web-design-guidelines](./web-design-guidelines/SKILL.md)                                   | vercel-labs/agent-skills             | UI 可用性与可访问性审查       |
| [ui-ux-pro-max](./ui-ux-pro-max/SKILL.md)                                                   | nextlevelbuilder/ui-ux-pro-max-skill | UI/UX 设计智能                |
| [react19-concurrent-patterns](./react19-concurrent-patterns/SKILL.md)                       | github/awesome-copilot               | React 19 并发模式             |
| [react19-source-patterns](./react19-source-patterns/SKILL.md)                               | github/awesome-copilot               | React 19 源码模式             |
| [react19-test-patterns](./react19-test-patterns/SKILL.md)                                   | github/awesome-copilot               | React 19 测试模式             |
| [react-audit-grep-patterns](./react-audit-grep-patterns/SKILL.md)                           | github/awesome-copilot               | React 代码审计 grep 模式      |
| [react-container-presentation-component](./react-container-presentation-component/SKILL.md) | github/awesome-copilot               | 容器 / 展示组件分离           |

#### 桌面 / 工具链 / 安全 / 测试

| Skill                                                             | 来源                                 | 用途                             |
| ----------------------------------------------------------------- | ------------------------------------ | -------------------------------- |
| [tauri-v2](./tauri-v2/SKILL.md)                                   | nodnarbnitram/claude-code-extensions | Tauri 2 开发                     |
| [vite](./vite/SKILL.md)                                           | antfu/skills                         | Vite 配置 / 插件 / Rolldown 迁移 |
| [rust-mcp-server-generator](./rust-mcp-server-generator/SKILL.md) | github/awesome-copilot               | Rust MCP Server 生成             |
| [security-review](./security-review/SKILL.md)                     | github/awesome-copilot               | 代码变更安全审查                 |
| [mcp-security-audit](./mcp-security-audit/SKILL.md)               | github/awesome-copilot               | MCP Server 安全审计              |
| [playwright-generate-test](./playwright-generate-test/SKILL.md)   | github/awesome-copilot               | Playwright E2E 测试生成          |
