---
title: Architecture
---

# Architecture

ADui Forge is a Monorepo:

```text
apps/       api / web / desktop / mobile / runner / docs
packages/   agent / agent-runtime / ai / contracts / mcp / skill-sdk /
            tool-sdk / workflow / shared
```

Dependency direction (enforced): `apps → packages`; domain packages never
depend on UI.

## Cloud API vs Local Runner

Both expose **the same REST shape** (`/api/v1/workspace`, `/runs`, approvals,
terminal) — the frontend `PlatformAdapter` routes requests to the cloud API or
the on-device Local Runner (Bun sidecar) transparently. Domain logic (agent
loop, tools, workspace boundary, skills) lives in `packages/` and is shared by
both.

See the repository `docs/ARCHITECTURE.md` for the full document, and
ADR-004/005/007 for the workspace & runner decisions.
