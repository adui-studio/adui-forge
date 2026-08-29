# ADui Forge — Agent Skills

本目录（`.agents/skills/`）存放 **仓库级 Agent Skill**：指导 Agent 在 ADui Forge 仓库中高质量完成特定任务的可复用能力包。

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
| 4    | [git-commit](./git-commit/SKILL.md)             | 按 conventional commits 规范生成提交         |

### 第三方安装

通过 `skills-lock.json` 锁定来源（安装脚本 / Skill Registry 管理），不要直接修改其内容：

| Skill                                                                     | 来源                                 | 用途                                 |
| ------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| [prisma-\*](./prisma-database-setup/SKILL.md)（7 个）                     | prisma/skills                        | Prisma Schema / Client / Postgres 等 |
| [tauri-v2](./tauri-v2/SKILL.md)                                           | nodnarbnitram/claude-code-extensions | Tauri 2 开发（配置 / Rust / IPC）    |
| [vercel-composition-patterns](./vercel-composition-patterns/SKILL.md)     | vercel-labs/agent-skills             | React 组合模式与组件 API 设计        |
| [vercel-react-best-practices](./vercel-react-best-practices/SKILL.md)     | vercel-labs/agent-skills             | React / Next.js 性能最佳实践         |
| [vercel-react-view-transitions](./vercel-react-view-transitions/SKILL.md) | vercel-labs/agent-skills             | View Transition API 动画             |
| [web-design-guidelines](./web-design-guidelines/SKILL.md)                 | vercel-labs/agent-skills             | UI 可用性与可访问性审查              |
