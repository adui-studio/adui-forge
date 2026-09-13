# ADui Forge — Local Runner

桌面本地运行器：在本机进程内提供与云端 API **同形的 REST**，让桌面端工作区
（文件编辑 / Git / 终端）与本地 Agent 运行不依赖云端服务。

架构决策：[ADR-005](../../docs/decisions/ADR-005.md)（进程模型）、
[ADR-006](../../docs/decisions/ADR-006.md)（Sandbox 与审批）、
[ADR-007](../../docs/decisions/ADR-007.md)（Bun sidecar 分发）。

## 运行

```bash
# 开发（tsx / Node——终端功能完整可用）
FORGE_WORKSPACE_ROOT=/path/to/project \
FORGE_MODEL_BASE_URL=... FORGE_MODEL_ID=... \
RUNNER_TOKEN=dev-token RUNNER_PORT=0 \
pnpm dev

# 生产（Bun sidecar 单文件——终端暂不支持，见下方限制）
node ../../scripts/build-runner.mjs windows-x64
FORGE_WORKSPACE_ROOT=... RUNNER_TOKEN=... ./../../desktop/src-tauri/binaries/forge-runner-x86_64-pc-windows-msvc.exe
```

仅监听 `127.0.0.1`；`RUNNER_TOKEN` 由 Tauri 注入，所有业务请求需
`Authorization: Bearer <token>` 或 `?token=` 查询参数（EventSource/WS 场景）。

## REST 形状（与云端 API 同形）

| 端点                                      | 说明                                               |
| ----------------------------------------- | -------------------------------------------------- |
| `GET /health`                             | 存活探测（豁免鉴权，返回 `runtime: bun\|node`）    |
| `GET /api/v1/workspace/tree`              | 目录列表（`.git` 隐藏、目录优先）                  |
| `GET/PUT/DELETE /api/v1/workspace/file`   | 文件读 / 写 / 删（三层边界 + 1 MiB 上限）          |
| `GET /api/v1/runs` · `POST /runs`         | 本地 Run 列表 / 创建（FORGE_MODEL_* 未配置时 503） |
| `GET /api/v1/runs/:id` + `/events`        | Run 详情 + SSE 事件流                              |
| `POST /api/v1/runs/:id/cancel` · `/retry` | 取消 / 重试                                        |
| `GET /api/v1/approvals/pending`           | 待审批列表（Trusted Local Mode）                   |
| `POST /api/v1/approvals/:id/decision`     | 审批决策（approved / rejected）                    |
| `GET /api/v1/terminal/ws`                 | 交互 shell WebSocket（管道模式）                   |

## 能力边界

| 能力       | dev（Node/tsx）  | sidecar（Bun）   |
| ---------- | ---------------- | ---------------- |
| Workspace  | ✅               | ✅               |
| Runs + SSE | ✅（需模型配置） | ✅（需模型配置） |
| 审批闭环   | ✅（信任模式）   | ✅（信任模式）   |
| 终端       | ✅（管道模式）   | ❌ 显式降级      |

- 文件工具恒经 `resolveInWorkspace` 三层边界；
- Shell / Git 工具仅在 **Trusted Local Mode**（`FORGE_TRUSTED_LOCAL_MODE=1`，
  用户在桌面端显式开启）时装配，且全部为 approval 级——触发时阻塞等待
  `POST /approvals/:id/decision`（ADR-006）；
- 终端为管道模式（无 PTY）：不支持全屏 TUI 程序（vim / htop），基本命令可用。

## 测试

```bash
pnpm test    # Vitest：server inject 冒烟、runs 生命周期、审批闭环、本地 Agent 装配
```
