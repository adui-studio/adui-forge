---
title: 配置参考
---

# 配置参考

环境变量经 `apps/api/.env`（复制根目录 `.env.example`）或部署环境注入。

## 数据库与设施

| 变量           | 说明                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL 连接串；配置后 Run / Task / User / Workflow 自动持久化，未配置显式降级内存实现 |
| `REDIS_URL`    | Redis（预留）                                                                             |

## 模型

| 变量                   | 说明                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `FORGE_MODEL_BASE_URL` | OpenAI Compatible 端点（未配置时默认 Agent 不注册，Run 请求 404） |
| `FORGE_MODEL_ID`       | 模型 ID（业务代码不硬编码模型名）                                 |
| `FORGE_MODEL_API_KEY`  | 模型 API Key                                                      |
| `FORGE_MODEL_NAME`     | Provider 名称（默认 forge-provider）                              |

## Agent Loop 与沙箱

| 变量                       | 说明                                     |
| -------------------------- | ---------------------------------------- |
| `FORGE_AGENT_MAX_STEPS`    | 最大模型轮数（默认 16）                  |
| `FORGE_AGENT_TIMEOUT_MS`   | 单次 Run 超时（默认 300000）             |
| `FORGE_AGENT_TOKEN_LIMIT`  | 累计 token 上限（可选）                  |
| `FORGE_SANDBOX`            | `docker`（默认）/ `host` / `off`         |
| `FORGE_SANDBOX_IMAGE`      | Docker 沙箱镜像（默认 node:22-bookworm） |
| `FORGE_WORKSPACE_ROOT`     | 文件工具的根目录                         |
| `FORGE_TRUSTED_LOCAL_MODE` | `1` 时允许 Host 沙箱（无隔离，谨慎）     |

## MCP 与认证

| 变量                  | 说明                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `FORGE_MCP_SERVERS`   | JSON 数组 `[{name, command, args?, env?}]`，启动时 stdio 连接并桥接工具 |
| `FORGE_JWT_SECRET`    | JWT 签名密钥（认证必需）                                                |
| `FORGE_AUTH_REQUIRED` | `1` 时全局启用 Bearer 校验                                              |
