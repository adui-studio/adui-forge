---
title: Core Concepts
---

# Core Concepts

ADui Forge's domain model is organized around "agents doing software engineering".

## Agent & Run

- **Agent**: a reusable executor definition = model + tool set + system prompt +
  loop limits (maxSteps / timeout / tokenLimit). Tool permissions are auditable
  at the definition site.
- **Run**: one execution of an agent against a task, with its own state machine
  (queued → running → waiting_approval → completed / failed / …), step sequence
  and event stream.
- **Step**: one "model → tools" round inside a run; events are grouped by
  `step.started / step.completed`.

## Custom Agents, Models & Skills

- **Custom agents** let you define name / description / systemPrompt / tool set /
  model / loop limits at runtime — no code changes. Built-in agents stay
  read-only.
- **Named models** (`FORGE_MODELS`) make multiple providers selectable per agent;
  the default model comes from `FORGE_MODEL_*`.
- **Skills** are reusable capabilities above tools: Markdown instructions
  injected into the agent's system prompt. Skills can be imported from
  `SKILL.md` directories and exported back.

## Tools & Permissions

- A tool is an atomic capability with a name, description, input schema and
  permission level.
- Two permission levels: `free` (runs directly, e.g. read files) and `approval`
  (requires human sign-off, e.g. shell execution, git commit / push).
- Tool execution goes through a Sandbox: Host (trusted local mode only) or
  Docker container (default: no network, resource-limited, workspace-only mount).

## Workflow

Serializable graph with `agent` and `condition` nodes. Graphs are validated
(no cycles, single entry, labeled branches), compiled to steps and executed by
the workflow engine; events use the `workflow.*` prefix. The visual editor
supports free connection, condition nodes and persisted canvas positions.

## Multi-Agent

Agent-as-Tool delegation: wrap a specialist agent as a tool for an orchestrator;
child runs are fully independent and approval boundaries are never relaxed by
delegation (see ADR-003).

## Event Protocol

All execution is published as `domain.action`-style events
(`run.started`, `model.delta`, `tool.failed`, `approval.required`, …) and
streamed over SSE — the single observation interface for Web, Mobile and
future integrations.
