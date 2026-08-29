# ADui Forge — Evals

本目录存放 **Agent 行为评估（Evaluations）**：用于衡量 Agent 在本仓库中执行任务的质量。

评估对象可以是：

- 在本仓库工作的 Coding Agent（遵循 `.agents/skills/` 中定义的约定）
- ADui Forge 平台本身产出的 Agent Run（`packages/agent-runtime` 的执行结果）

## 目录约定

```text
evals/
├─ README.md
└─ cases/
   └─ <case-name>/
      └─ eval.yaml      # 用例定义
```

## eval.yaml 格式

```yaml
id: example-case # 与目录名一致
name: 示例评估
description: 评估什么、为什么
type: repo-task # repo-task | agent-run | rubric
# repo-task: 给定仓库任务，检查 Agent 行为与产物
# agent-run: 回放/评审一个已有 Agent Run
# rubric:   纯评分标准，无固定输入
setup: [] # 可选：前置命令
task: |
  给 Agent 的任务描述
checks: # 通过条件（全部满足才算通过）
  - id: follows-workflow
    type: rubric
    description: 遵循 Understand → Inspect → Plan → Implement → Test 流程
  - id: vp-check-passes
    type: command
    command: vp check
```

## Harness

评估 Harness（读取 `eval.yaml`、执行用例、汇总结果）将在 `apps/worker` 与
`packages/agent-runtime` 具备基本执行能力后实现，命令约定为：

```bash
vp run evals#run            # 运行全部用例（规划中）
```

当前阶段用例以 Markdown 描述 + YAML 定义为准，作为后续 Harness 的输入契约。

## 原则

- 用例必须可重复执行、可判分，避免依赖人工主观判断。
- 核心评估面优先覆盖 AGENTS.md §62 的测试范围：Agent Loop、Tool Permission、
  File Boundary、Sandbox、Approval、MCP、Workflow。
- 新增用例前先检查是否已有覆盖同一能力的用例。
