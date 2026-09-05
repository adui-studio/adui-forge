---
outline: deep
---

<script setup>
const items = [
  { name: "routes/", description: "API endpoints (file-based routing)", link: "#routes" },
  { name: "pages/", description: "Full-stack server-rendered pages", link: "#pages" },
  { name: "middleware/", description: "Global request middleware", link: "#middleware" },
  { name: "db/", description: "Drizzle schema and SQL migrations", link: "#db" },
  { name: "crons/", description: "Scheduled cron jobs", link: "#crons" },
  { name: "queues/", description: "Async queue consumers", link: "#queues" },
  { name: "src/", description: "Shared app code", link: "#src" },
  { name: "public/", description: "Static assets (served as-is)", link: "#public" },
  { name: ".void/", description: "Auto-generated (gitignored)", link: "#void" },
  { name: "vite.config.ts", description: "Vite config with voidPlugin()", link: "#config-files" },
  { name: "void.json", description: "Void project config (optional)", link: "#config-files" },
  { name: ".env", description: "Environment variables", link: "#config-files" },
  { name: "package.json" },
  { name: "tsconfig.json" },
];

const middlewareItems = [
  {
    name: "middleware/",
    children: [
      { name: "01.logger.ts", description: "Runs first" },
      { name: "02.auth.ts", description: "Runs second" },
    ],
  },
];

const dbItems = [
  {
    name: "db/",
    children: [
      { name: "schema.ts", description: "Drizzle schema (source of truth)" },
      { name: "schema/", description: "Optional: split into multiple files" },
      {
        name: "migrations/",
        children: [
          { name: "20260410161500_*.sql" },
          { name: "20260410161501_*.sql" },
        ],
      },
    ],
  },
];

const voidItems = [
  {
    name: ".void/",
    children: [
      { name: "db.d.ts", description: "Drizzle DB instance types" },
      { name: "routes.d.ts", description: "Typed fetch client types" },
      { name: "queues.d.ts", description: "Queue consumer types" },
      { name: "tsconfig.json", description: "TypeScript config fragment" },
      { name: "v3/", description: "Local dev state (D1, KV, R2)" },
    ],
  },
];
</script>

# Project Structure

## Overview

A Void app uses file-based conventions to define routes, pages, middleware, and more. All directories are optional, so you only need the pieces your app actually uses.

<FileTree :items="items" />

## `routes/`

File-based HTTP API endpoints built on [Hono](https://hono.dev). Each file exports named HTTP method handlers.

<RoutesFileTree />

- **Named exports**: `export const GET = defineHandler(...)`, `export const POST = ...`
- **Dynamic segments**: `[id]` becomes `:id` route parameter
- **Catch-all**: `[...slug]` matches the remaining path
- **Route groups**: `(admin)/` organizes files without affecting URL paths
- **Files starting with `_`** are ignored

See [Server Routing](/guide/server-routing) for the full guide.

## `pages/`

Full-stack server-rendered pages with co-located data loading. Available with Vue, React, Svelte, and Solid adapters.

<PagesFileTree />

- **`.server.ts` files** export `loader` for `GET` data and `action` for mutations, paired with the page component of the same name
- **Layouts** nest automatically and persist across navigations
- **Markdown** pages are supported with frontmatter

See [Pages Routing](/guide/pages-routing/overview) for the full guide.

## `middleware/`

Global middleware that runs on every request. Numeric prefixes control execution order.

<FileTree :items="middlewareItems" default-expanded />

Each file exports a `defineMiddleware()` handler. Use middleware to set shared context (auth, logging, rate limiting) available to all routes.

## `db/`

[Drizzle schema](/guide/database#schema-definition) and SQL migration files for the [D1 database](/guide/database).

<FileTree :items="dbItems" default-expanded />

- `db/schema.ts`: your Drizzle table definitions and the source of truth for DB types
- `db/schema/`: optional. Split tables into separate files and re-export them from `db/schema.ts`
- `db/migrations/`: generated SQL migration files, applied in order on deploy

Generate schema with `void gen model` or write it by hand. Generate migrations with `void db generate`.

## `crons/`

[Scheduled jobs](/guide/jobs) that run on a cron schedule.

```ts
// crons/heartbeat.ts
import { defineScheduled } from "void";

export const cron = "*/5 * * * *";

export default defineScheduled(async (controller, env) => {
  // runs every 5 minutes
});
```

## `queues/`

[Async queue consumers](/guide/queues) for background job processing.

```ts
// queues/email.ts
import { defineQueue } from "void";

export default defineQueue(async (batch, env) => {
  for (const msg of batch.messages) {
    // process message
  }
});
```

## `src/`

Shared application code such as components, utilities, and types. This directory has no special convention, so organize it however you like.

## `public/`

Static assets served as-is at the root path. Files here are not processed by Vite.

## `.void/`

Auto-generated directory (gitignored). Contains:

Generate or refresh it with `void prepare`, or let `vite dev` / `vite build` populate it during normal app workflows.

<FileTree :items="voidItems" default-expanded />

## Config Files

| File                    | Purpose                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vite.config.ts`        | Vite configuration. Must include `voidPlugin()`.                                                                                                         |
| `void.json`             | Optional Void config for [routing](/reference/config#routing), [inference](/reference/config#inference), and [worker settings](/reference/config#worker) |
| `tsconfig.json`         | TypeScript config. Extend `.void/tsconfig.json` for auto-generated types; run `void init --tsconfig` when an existing config already uses `extends`.     |
| `.env`                  | Public environment variables (committed)                                                                                                                 |
| `.env.local`            | Secret variables for local dev (gitignored)                                                                                                              |
| `.env.production`       | Public production variables (committed)                                                                                                                  |
| `.env.production.local` | Production secrets for local testing (gitignored)                                                                                                        |

See [Environment Variables](/guide/env-vars) for the full env file loading order.
