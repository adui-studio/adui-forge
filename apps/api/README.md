# @adui-forge/api

ADui Forge 平台 API（NestJS + Fastify）。

- 全局前缀 `/api/v1`，现有端点：`GET /api/v1/health`
- Controller 只做 Routing / Validation / Auth，业务下沉 Application Service（AGENTS.md §25）
- 后续按 Domain 拆分 Module（AuthModule / AgentModule / RunModule / ...）

## 命令

```bash
pnpm --filter @adui-forge/api dev      # tsx watch 启动
pnpm --filter @adui-forge/api build    # tsc 输出 dist/
```
