---
title: 架构总览
---

# 架构总览

ADui Forge 采用 Monorepo：

```text
apps/       应用层：web / desktop / mobile / api / worker / runner / docs
packages/   共享包层：shared / contracts / agent-runtime / ...
```

依赖方向（强制）：`apps → packages`，Domain Package 不得依赖 UI。

## 云端 API 与本地 Runner

两端对前端暴露**同一套 REST 形状**（`/api/v1/workspace`、`/runs`、审批、终端）——
前端 `PlatformAdapter` 把请求透明路由到云端 API 或本机 Local Runner（Bun sidecar）。
Agent 领域逻辑（Loop / 工具 / Workspace 边界 / Skill 组装）在 `packages/`，两端共用。

完整架构见仓库 `docs/ARCHITECTURE.md`；Workspace 与 Runner 决策见
ADR-004 / 005 / 007。
