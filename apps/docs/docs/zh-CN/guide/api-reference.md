---
title: API 参考
---

# API 参考

基础路径 `/api/v1`，机器可读描述见 `GET /api/v1/openapi.json`。

| 端点                                | 方法         | 说明                                                         |
| ----------------------------------- | ------------ | ------------------------------------------------------------ |
| `/health`                           | GET          | 健康检查（含 db 依赖状态）                                   |
| `/auth/register` `/auth/login`      | POST         | 注册 / 登录（Argon2id + JWT）                                |
| `/agents`                           | GET / POST   | Agent 列表 / 自定义 Agent 创建更新                           |
| `/agents/{name}`                    | GET / DELETE | Agent 详情 / 删除自定义 Agent                                |
| `/agents/models`                    | GET          | 命名模型目录                                                 |
| `/runs`                             | GET / POST   | Run 列表（浏览视图，不含事件流，默认最近 200 条）与创建      |
| `/runs/{id}`                        | GET          | Run 详情（事件流可派生 token 用量）                          |
| `/runs/{id}/events`                 | GET          | SSE 事件流（快照 + 实时）                                    |
| `/runs/{id}/artifacts`              | GET          | Run 产物                                                     |
| `/runs/{id}/retry`                  | POST         | 重试 Run（以原任务新建）                                     |
| `/runs/{id}/cancel`                 | POST         | 取消 Run                                                     |
| `/approvals/pending`                | GET          | 待审批列表                                                   |
| `/approvals/{id}/decision`          | POST         | 提交审批决策                                                 |
| `/tasks`                            | GET / POST   | 任务台账（创建即派生 Run）                                   |
| `/workflows`                        | GET / POST   | Workflow 定义列表 / 注册（tasks 线性或 graph 条件分支）      |
| `/workflows/{name}`                 | DELETE       | 删除 Workflow 定义                                           |
| `/workflows/{name}/runs`            | POST         | 运行 Workflow（执行即 Run，agentName 前缀 `workflow(`）      |
| `/comparisons`                      | GET / POST   | 对比批次（列表 / 创建）                                      |
| `/comparisons/{id}`                 | GET / DELETE | 批次详情（结果从 Run 派生，含 totalTokens）/ 删除            |
| `/comparisons/{id}/export/{format}` | GET          | 导出 CSV / Markdown（含 Tokens 列）                          |
| `/comparisons/stats`                | GET          | 跨批次 Agent 统计（完成/失败/平均耗时/平均 Tokens/最快胜出） |
| `/comparisons/stats/by-model`       | GET          | 按模型分组的同结构统计                                       |
| `/conversations`                    | GET / POST   | Chat 会话（列表 / 创建）                                     |
| `/conversations/{id}`               | GET / DELETE | 会话详情 / 删除                                              |
| `/conversations/{id}/title`         | PATCH        | 会话重命名                                                   |
| `/conversations/{id}/messages`      | POST         | 追加会话消息                                                 |
| `/skills`                           | GET / POST   | Skill 库（列表 / 新建更新）                                  |
| `/skills/{name}`                    | DELETE       | 删除 Skill                                                   |
| `/skills/{name}/enabled`            | PATCH        | 启停（触发引用它的 Agent 重建）                              |
| `/skills/{name}/export`             | GET          | 导出 SKILL.md                                                |
| `/skills/bundled`                   | GET          | 内置技能目录（带 version）                                   |
| `/skills/import-bundled`            | POST         | 一键安装全部内置技能                                         |
| `/skills/import-bundled/{name}`     | POST         | 安装单个内置技能（bundledVersion 防覆盖，force 可越）        |
| `/skills/import-markdown`           | POST         | 粘贴 SKILL.md 导入（服务端校验 + 防覆盖）                    |
| `/skills/export-bundle`             | GET          | 导出技能包 JSON（整库迁移/分享）                             |
| `/skills/import-bundle`             | POST         | 导入技能包（逐条校验，上限 100 条）                          |
| `/skills/usage`                     | GET          | 使用统计（每个 Skill 被多少个自定义 Agent 选中）             |
| `/skills/import`                    | POST         | 从 FORGE_SKILLS_DIR 导入 SKILL.md                            |
| `/workspace/tree` `/workspace/file` | GET          | Workspace 文件树 / 内容                                      |
| `/workspace/file`                   | PUT / DELETE | 写入 / 删除文件                                              |
| `/workspace/git/status` `…/commit`  | GET / POST   | Git 面板后端（status / diff / commit）                       |
| `/memory`                           | GET          | Session Memory 摘要                                          |
| `/metrics`                          | GET          | 运行指标                                                     |

认证：`FORGE_AUTH_REQUIRED=1` 时除 health/openapi 外均需 `Authorization: Bearer <token>`。

Local Runner 对 `workspace`、`runs`（子集）与 `approvals`（Trusted Local
Mode）在 `127.0.0.1` 上提供同形 REST（一次性 token 握手）；Skills /
Conversations / Comparisons 始终由云端 API 提供。
