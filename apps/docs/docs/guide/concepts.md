---
title: 核心概念
---

# 核心概念

ADui Forge 的领域模型围绕"Agent 执行软件工程"组织。

## Agent 与 Run

- **Agent**：一次可复用的执行者定义 = 模型 + 工具集 + 系统提示 + Loop 上限
  （maxSteps / timeout / tokenLimit）。定义处可审计其工具权限集合。
- **Run**：Agent 对一个任务的一次执行，拥有独立的状态机
  （queued → running → waiting_approval → completed / failed / …）、
  步骤序列与事件流。
- **Step**：Run 内一轮"模型 → 工具"循环，事件按 `step.started / step.completed` 划分。

## Tool 与权限

- Tool 是 Agent 可调用的原子能力，必须有名称、描述、输入 Schema 与权限级别。
- 权限两级：`free`（直接执行，如读文件）与 `approval`（必须人工批准，
  如 shell 执行、git 提交、git push）。
- 工具执行强制经 Sandbox：Host（仅可信本地模式）或 Docker 容器
  （默认无网络、资源受限、只挂载工作区）。

## Workflow

多步骤编排：`agent` / `tool` / `condition` 三类节点顺序执行，
前序步骤输出可供后续引用；事件以 `workflow.*` 前缀进入统一事件流。

## Multi-Agent

Agent-as-Tool 委派：把专项 Agent 包装为工具供协调者调用；
子 Run 完全独立，审批边界不因委派放宽（见 ADR-003）。

## 事件协议

所有执行过程以 `domain.action` 命名的事件对外发布
（`run.started`、`model.delta`、`tool.failed`、`approval.required`…），
经 SSE 实时推送；这是 Web、Mobile 与未来集成方的统一观测接口。
