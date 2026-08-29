# @adui-forge/web

ADui Forge Web 工作台（React + React Router + TanStack Query）。

与 Desktop 共享同一套 UI / Feature（AGENTS.md §17）；API 数据一律走 TanStack Query，
不把 Server State 复制进 Zustand。

## 页面（按 REQUIREMENTS §12 逐步补充）

- `/` — 任务发起（对话式输入）
- `/runs` — Run 列表
- `/runs/:id` — Run 详情 + SSE 实时事件流

## 命令

```bash
pnpm --filter @adui-forge/web dev       # 开发服务器
pnpm --filter @adui-forge/web build     # 产物输出 dist/
```
