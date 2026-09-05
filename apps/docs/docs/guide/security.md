---
title: 安全模型
---

# 安全模型

ADui Forge 面向"让 Agent 动手改代码"，安全边界是第一设计约束。

## Sandbox First

Agent 的一切进程执行必须经 Sandbox 抽象，不直接落宿主机：

| 实现   | 隔离级别                                                | 启用条件                                 |
| ------ | ------------------------------------------------------- | ---------------------------------------- |
| Docker | 容器隔离：默认无网络、内存/CPU/进程数上限、只挂载工作区 | 默认（`FORGE_SANDBOX=docker`）           |
| Host   | 无隔离                                                  | 仅 `FORGE_TRUSTED_LOCAL_MODE=1` 显式开启 |

禁止挂载根目录、用户 HOME、SSH 密钥与 docker.sock。

## Workspace 边界

所有文件工具的路径输入经过三层防御：

1. `../` 路径遍历在真实路径解析前拦截；
2. symlink / junction 逃逸经 realpath 二次校验；
3. 不存在的路径统一报错，不泄露外部文件系统信息。

## Approval（人工审批）

以下操作默认需要人工批准，Agent 不得绕过：

- `shell_exec`（任意 shell 命令）
- `git_add` / `git_commit` / `git_push`
- git push 另有硬约束：`remote` / `branch` 参数禁止携带 git 选项
  （防 `--upload-pack` 类注入），force push 被策略性拒绝

流程：Loop 在 approval 级工具上挂起 → `approval.required` 事件 →
用户在 Web / Mobile 审批页决策 → Run 继续或收敛。

## 认证与 Secret

- 口令 Argon2id 散列，访问令牌为 HS256 JWT（24h）；`FORGE_AUTH_REQUIRED=1`
  时全局启用 Bearer 校验，默认关闭以保持本地模式优先。
- Secret 不进源码 / 日志 / 提交；`.env` 已被 gitignore，仅提交 `.env.example`。
- MCP Server 内容视为不可信输入：工具默认 `approval` 权限，入参经 JSON Schema 校验。
