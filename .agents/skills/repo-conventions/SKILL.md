---
name: repo-conventions
description: 在 ADui Forge 仓库中进行任何开发任务时使用，确保遵循仓库工程规范与 Vite+ 工具链。
---

# Repo Conventions — ADui Forge 开发约定

在 ADui Forge 仓库中执行任何开发任务时，遵循本 Skill。

## 任务执行顺序

```text
Understand → Inspect → Plan → Implement → Test → Review Diff → Explain
```

1. 先读 [AGENTS.md](../../../AGENTS.md)，再读 [docs/REQUIREMENTS.md](../../../docs/REQUIREMENTS.md) 与目标模块 README。
2. 阅读现有实现后再设计；先通过 [plan](../plan/SKILL.md) 完成规划，禁止看到需求立即写代码。
3. 制定最小方案：最少修改文件、最少新增依赖、最少改变公共接口。
4. 完成后运行验证命令（见下），并 `git diff` 检查无关改动。

## 工具链命令

```bash
vp check          # Lint + Format + Type Check
vp test           # Vitest
vp build          # 构建
vp run -r <cmd>   # 递归运行 workspace 内命令
```

包管理只用 `pnpm`；格式化 / Lint 已由 Vite+（Oxfmt / Oxlint）内置，不额外引入 ESLint / Prettier。

## 硬性约束

- 依赖方向：`apps → packages`，Domain 包禁止依赖 React / Flutter / Tauri / Nest Controller。
- TypeScript 严格模式；禁止 `any` 泛滥、`@ts-ignore`、吞异常的 `catch {}`。
- 事件命名 `domain.action`；禁止模拟 Streaming。
- Secret 不进源码 / 日志 / 提交；用户未提交的修改不得覆盖或顺手重构。
- 只格式化修改过的文件，不整仓库重排。
- 重大架构变更（换 DB / ORM / SDK / 状态管理等）先写 ADR 到 `docs/decisions/`。
