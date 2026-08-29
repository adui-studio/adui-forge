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

详见仓库 `docs/ARCHITECTURE.md`。
