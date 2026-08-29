# ADui Forge

**ADui Forge — Agent-Driven Development Platform**

一个面向开发者与研发团队的 Agent 驱动软件开发平台：开发者描述意图与边界，
Agent 负责理解、规划、检索、修改、测试、修复与交付，高风险操作由人工审批。

> 项目处于 **Phase 0（初始化完成）** 阶段，`apps/`、`packages/` 待按规划逐步搭建，
> 见 [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)。

## 文档

| 文档                                               | 内容                             |
| -------------------------------------------------- | -------------------------------- |
| [AGENTS.md](AGENTS.md)                             | Agent 开发规范（修改代码前必读） |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)       | 完整需求定义                     |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)       | 总体架构                         |
| [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md)       | 代码库地图（现状 + 规划）        |
| [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) | 项目上下文快照                   |
| [docs/decisions/](docs/decisions/)                 | 架构决策记录（ADR）              |
| [.agents/skills/](.agents/skills/)                 | 仓库级 Agent Skill               |
| [evals/](evals/)                                   | Agent 行为评估用例               |

## 技术栈

```text
工具链   Vite+ · pnpm · TypeScript · ESM
Web      React · TanStack Query · Zustand · Tailwind · shadcn/ui
Desktop  Tauri 2 · Rust
Mobile   Flutter · Riverpod
Backend  NestJS · Fastify · Prisma · PostgreSQL · Redis · BullMQ
AI       AI SDK · MCP TypeScript SDK v2
文档     Rspress
测试     Vitest · Playwright · Cargo Test · Flutter Test
```

## 开发

```bash
pnpm install        # 安装依赖
vp check            # Lint + Format + Type Check
vp test             # 运行测试
vp build            # 构建
vp run ready        # check + test + build 全量检查
```

要求：Node.js >= 22.18，包管理只使用 pnpm。
