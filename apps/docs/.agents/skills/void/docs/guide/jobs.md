---
outline: deep
---

# Cron Jobs

Void supports cron-triggered jobs from a top-level `crons/` directory.

## Job files

Create files in `crons/**/*.ts` (`.mts`, `.js`, `.mjs` also supported).

Each job file must export:

- `export const cron = "<expression>"` (or an array of expressions)
- a default handler (recommended: wrapped with `defineScheduled`)

Example:

```ts
// crons/hourly-heartbeat.ts
import { defineScheduled } from "void";

export const cron = "0 * * * *";

export default defineScheduled(async (controller, env) => {
  await env.KV.put("jobs:last-heartbeat", controller.scheduledTime.toString());
});
```

### Multiple schedules

A single job file can export an array of cron expressions:

```ts
// crons/cleanup.ts
import { defineScheduled } from "void";

export const cron = ["0 * * * *", "30 * * * *"];

export default defineScheduled(async (controller, env) => {
  // Runs at :00 and :30 every hour
});
```

## `defineScheduled`

`defineScheduled(fn)` is a typed identity helper for scheduled jobs.

Handler signature:

```ts
(controller: ScheduledController, env: CloudEnv["Bindings"], ctx: ExecutionContext) =>
  unknown | Promise<unknown>;
```

Notes:

- Jobs are matched by exact cron string.
- Job modules are lazy-loaded at runtime.
- Files or directories starting with `_` are ignored.
- Missing `cron` export causes an error during scan/build.

## Local development

Cron triggers do not fire on their schedule during local dev — this is a Cloudflare Workers / miniflare limitation, not specific to Void. Exercise a job locally by POSTing to the dev endpoint Void exposes:

```
POST /__void/scheduled
Content-Type: application/json
{ "cron": "<expression>", "scheduledTime": <unix_ms> }
```

The `cron` value must match a string you exported from a `crons/*.ts` file — that's how the dispatcher routes to the right handler. Returns `{ "ok": true }` on success.

The endpoint requires a local dev trigger token. Void prints a paste-ready curl command with the current token when the dev server starts.

```bash
curl -X POST http://localhost:5173/__void/scheduled \
  -H "Content-Type: application/json" \
  -H "x-void-dev-trigger: <printed-token>" \
  -d '{"cron":"0 * * * *","scheduledTime":'"$(date +%s000)"'}'
```

If you set `__VOID_PROXY_TOKEN` in `.dev.vars`, that explicit token takes precedence and the printed curl command uses `x-void-internal: <your-token>` instead.

This works the same in default Void mode and every supported framework — SvelteKit, Nuxt, Analog, Astro, TanStack Start, React Router, and vinext. In framework mode the cron handler runs inside the framework adapter's request pipeline (or the dev miniflare for Class A frameworks), so it sees whatever bindings the adapter exposes (D1, KV, R2, queues, AI, etc.).

## Deployment behavior

On deploy, Void includes all discovered job schedules in the deploy manifest and configures worker cron triggers automatically.
