---
title: API 参考
---

# API 参考

基础路径 `/api/v1`，机器可读描述见 `GET /api/v1/openapi.json`。

| 端点                           | 方法       | 说明                                          |
| ------------------------------ | ---------- | --------------------------------------------- |
| `/health`                      | GET        | 健康检查（含 db 依赖状态）                    |
| `/auth/register` `/auth/login` | POST       | 注册 / 登录（Argon2id + JWT）                 |
| `/agents`                      | GET        | 已注册 Agent 及工具清单                       |
| `/runs`                        | GET / POST | Run 列表（status/agentName/limit 过滤）与创建 |
| `/runs/{id}`                   | GET        | Run 详情                                      |
| `/runs/{id}/events`            | GET        | SSE 事件流（快照 + 实时）                     |
| `/runs/{id}/artifacts`         | GET        | Run 产物                                      |
| `/runs/{id}/retry`             | POST       | 重试 Run                                      |
| `/approvals/pending`           | GET        | 待审批列表                                    |
| `/approvals/{id}/decision`     | POST       | 提交审批决策                                  |
| `/tasks`                       | GET / POST | 任务台账（创建即派生 Run）                    |
| `/workflows`                   | GET / POST | Workflow 定义列表与注册                       |
| `/workflows/{name}/runs`       | POST       | 运行 Workflow                                 |

| `/agents` / `/agents/{name}` | GET/POST/DEL | 自定义 Agent CRUD（含模型/工具/Skill 配置） |
| `/agents/models` | GET | 命名模型目录 |
| `/workflows/{name}` | DELETE | 删除 Workflow 定义 |
| `/comparisons` | GET / POST | 对比批次（列表 / 创建） |
| `/comparisons/stats` | GET | 跨批次 Agent 胜负统计 |
| `/comparisons/stats/by-model` | GET | 按模型分组的胜负统计 |
| `/conversations` | GET / POST | Chat 会话（列表 / 创建 / 重命名 / 删除） |
| `/conversations/{id}/messages` | POST | 追加会话消息 |
| `/skills` / `/{name}/export` | GET / POST | Skill 库 CRUD + SKILL.md 导出 |
| `/skills/import` | POST | 从 FORGE_SKILLS_DIR 导入 SKILL.md |
| `/workspace/tree` `/workspace/file` | GET | Workspace 文件树 / 内容 |
| `/workspace/file` | PUT / DELETE | 写入 / 删除文件 |
| `/workspace/git/status` `…/commit` | GET / POST | Git 面板后端（status / diff / commit） |
| `/memory` | GET | Session Memory 摘要 |
| `/metrics` | GET | 运行指标 |

认证：`FORGE_AUTH_REQUIRED=1` 时除 health/openapi 外均需 `Authorization: Bearer <token>`。
