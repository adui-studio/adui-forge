---
title: Getting Started
---

# Getting Started

```bash
pnpm install        # install dependencies
pnpm run ready      # check + test + build (full gate, same as CI)
```

## Running each app locally

| App          | Command                                            |
| ------------ | -------------------------------------------------- |
| API (NestJS) | `pnpm --filter @adui-forge/api dev`                |
| Web (React)  | `pnpm --filter @adui-forge/web dev`                |
| Docs site    | `pnpm --filter @adui-forge/docs dev`               |
| Runner       | see [Desktop & Mobile](/guide/desktop-mobile.html) |

Open <http://localhost:5175> once API and Web are up. Without `DATABASE_URL`
everything runs in in-memory mode (data resets on restart).

## Model configuration

The default agent registers only when `FORGE_MODEL_BASE_URL` and `FORGE_MODEL_ID`
are set (see [Configuration](/guide/configuration.html)). Configure additional
named models via `FORGE_MODELS` to make them selectable per custom agent.

## Desktop build

```bash
pnpm --filter @adui-forge/web build        # web assets
node scripts/build-runner.mjs windows-x64  # Local Runner sidecar (Bun)
pnpm --filter @adui-forge/desktop bundle   # NSIS / MSI installers
```

The installer ships the Local Runner as a single-file sidecar: after picking a
local directory in the Workspace page you can start the runner and edit files,
run git, use the terminal (dev builds) and run the local agent — all on-device.
