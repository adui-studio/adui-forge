# @adui-forge/workflow

Workflow 引擎（REQUIREMENTS.md §40）：数据化的步骤定义 + 顺序执行运行时。

- 节点类型：`agent`（调用 Agent 并留存输出）、`tool`（直接执行工具）、`condition`（按上下文裁剪分支）
- `WorkflowDefinition` 即运行时格式，不依赖任何图编辑器（React Flow 仅作前端编辑器，后续接入）
- 事件：`workflow.started / workflow.step.started / workflow.step.completed / workflow.step.failed / workflow.completed`
- 前序步骤输出经 `context.outputs[stepId]` 引用；agent 节点的 task 可用函数从上下文派生

审批与沙箱约束由节点内引用的 Agent / Tool 自身携带，本引擎不放宽任何权限。
