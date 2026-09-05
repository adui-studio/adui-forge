---
name: void
description: Void skill for app development and CLI operations. Use this skill to route user requests to the appropriate bundled Void docs.
---

# Void Skill

This skill is a router. Open the minimum relevant docs files under `docs/` and execute.

Docs in this skill are bundled from `docs/` during `void` package build and live at:

- `skills/void/docs/**/*.md`

## Command Naming

Use `void` in examples and commands in this skill. For first-time setup, prefer `void init` followed by `void deploy`; in an empty directory, install `void` first and let `void init` add the matching Pages adapter and starter dependencies with Vite+ as the default scaffold toolchain. In an existing app, `void init` configures Void in place by adding missing Vite scripts and creating or patching `vite.config.*` with `voidPlugin()`. `void init` can also handle auth and project linking interactively.

Use `void` and `@void/*` in code examples and package manifests.

## No-Args Behavior

If invoked without a concrete task, do a brief app status check and report:

1. App type (`void`, `framework`, `spa`, `static`) using `docs/app-types.md` criteria.
2. Backend feature usage (`routes/`, `pages/`, `middleware/`, `migrations/`, `crons/`, `queues/`, SSR entries).
3. Runtime signals (`void/db`, `void/kv`, `void/storage`, queue usage).
4. Auth signals (`void/auth`, `auth` client imports, OAuth env vars).
5. Project linkage (`.void/project.json`) and config readiness (`void.json`, tsconfig extends).
6. Optional health checks (`void auth whoami`, `void db status` when relevant).

Then ask what to do next.

## Task Routing

| User intent                                | Docs file(s)                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| CLI command syntax, flags, env vars        | `docs/reference/cli.md`                                                                   |
| Initial setup, onboarding, first app       | `docs/guide/quickstart.md`, `docs/reference/cli.md`                                       |
| App type detection and mode behavior       | `docs/guide/app-types.md`, `docs/reference/config.md`                                     |
| Server/API routing and middleware          | `docs/guide/server-routing.md`, `docs/integrations/hono.md`                               |
| Pages mode, loader/action, forms, layouts  | `docs/guide/pages-routing/*.md`, `docs/guide/type-safety.md`                              |
| Database and migrations                    | `docs/guide/database.md`, `docs/guide/type-safety.md`                                     |
| Typed fetch and end-to-end typing          | `docs/guide/typed-fetch.md`, `docs/guide/type-safety.md`                                  |
| Authentication                             | `docs/guide/auth.md`, `docs/guide/env-vars.md`                                            |
| Cloudflare runtime bindings and config     | `docs/integrations/cloudflare.md`, `docs/reference/config.md`, `docs/guide/env-vars.md`   |
| AI inference (Workers AI, providers)       | `docs/guide/ai.md`                                                                        |
| KV / storage / queues / cron jobs          | `docs/guide/kv.md`, `docs/guide/storage.md`, `docs/guide/queues.md`, `docs/guide/jobs.md` |
| SSR and caching                            | `docs/guide/ssr.md`, `docs/guide/edge/*.md`                                               |
| Rewrites, redirects, fallbacks             | `docs/guide/edge/rewrites.md`, `docs/guide/edge/redirects.md`, `docs/reference/config.md` |
| Static site generation                     | `docs/guide/ssg.md`                                                                       |
| Deployment and CI                          | `docs/guide/deployment.md`, `docs/reference/cli.md`                                       |
| Self-host deploy to own Cloudflare account | `docs/integrations/cloudflare.md`, `docs/reference/cli.md`                                |
| Project status, deployment history         | `docs/reference/cli.md`                                                                   |
| Cache purging                              | `docs/reference/cli.md`                                                                   |
| Project logs, runtime errors               | `docs/reference/cli.md`                                                                   |
| Secrets management (put/sync/delete)       | `docs/reference/cli.md`, `docs/guide/env-vars.md`                                         |
| Typed env vars (`defineEnv`, `env.ts`)     | `docs/guide/env-vars.md`                                                                  |
| Custom domain setup                        | `docs/reference/cli.md`                                                                   |
| Database status, reset, seed, export       | `docs/reference/cli.md`, `docs/guide/database.md`                                         |
| Auth login/logout/whoami                   | `docs/reference/cli.md`                                                                   |
| Overview / introduction                    | `docs/guide/index.md`                                                                     |
| API surface details                        | `docs/reference/api.md`                                                                   |
| Meta framework integration                 | `docs/integrations/frameworks/*.md`                                                       |
| Coding agent setup                         | `docs/integrations/agents.md`                                                             |
| Node.js / Bun / Deno targets               | `docs/integrations/nodejs-bun-deno.md`                                                    |
| ORMs and external databases                | `docs/integrations/orms-and-external-dbs.md`                                              |
| Project structure and conventions          | `docs/reference/structure.md`                                                             |
| Resource/binding inference                 | `docs/reference/resource-inference.md`                                                    |

## Working Rules

- For any task involving running `void` commands — including checking status, managing secrets, viewing logs, or deploying — open `docs/reference/cli.md` FIRST. Do not guess command syntax.
- Never guess or infer `void` CLI command names or flags. Always consult `docs/reference/cli.md` for the exact command before running it.
- For multi-topic tasks, combine only the needed doc files.
- If docs and memory differ, follow docs.
- **Env vars:** When the project has `env.ts`, the canonical access pattern is `import { env } from "void/env"`. Declare every env key in `env.ts` via `defineEnv({...})` so values are typed and validated. Do not introduce ad-hoc `process.env.X` or untyped `c.env.X` access in new code — add the key to `env.ts` first.
