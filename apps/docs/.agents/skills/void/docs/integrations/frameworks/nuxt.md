---
outline: deep
---

# Nuxt

[Nuxt](https://nuxt.com/) has its own CLI and build system based on Nitro. Add `voidPlugin()` to Nuxt's Vite config for binding inference, typed DB, and migrations during development.

## Setup

### 1. Create a new project

```bash
npm create nuxt@latest my-app
cd my-app
```

### 2. Install dependencies

```bash
npm install -D void wrangler
```

The `wrangler` dependency is needed by Nuxt to create Cloudflare platform proxy during dev.

### 3. Configure `nuxt.config.ts`

```ts
import { resolve } from "node:path";
import { voidPlugin } from "void";

export default defineNuxtConfig({
  nitro: {
    preset: "cloudflare-module",
    alias: {
      // Nitro has its own bundler that doesn't use Vite aliases.
      // Duplicate @schema here so Nitro can resolve it.
      "@schema": resolve(__dirname, "db/schema.ts"),
    },
  },
  vite: { plugins: [voidPlugin()] },
});
```

By default, Nuxt Cloudflare dev runtime and `voidPlugin()` migrations share Wrangler's local state at `.wrangler/state/v3`, so no extra persistence configuration is required.

### 4. Create `wrangler.jsonc`

`voidPlugin()` auto-syncs inferred bindings into this file on dev startup:

```jsonc
{
  "name": "my-app",
  "compatibility_date": "2026-02-24",
  "compatibility_flags": ["nodejs_compat", "nodejs_als"],
}
```

### 5. Deploy

```bash
void auth login
void deploy
```

## Using Void Platform Features

Most [Void platform features](../../guide/app-types.md#void-apps) work with Nuxt. Use them in server routes, API handlers, and middleware:

Void-managed auth is not supported in framework mode yet. Use Better Auth's official Nuxt integration directly for now.

### Database

```ts
// server/api/users.get.ts
import { db } from "void/db";
import { users } from "@schema";

export default defineEventHandler(async () => {
  return db.select().from(users);
});
```

::: warning ⚠️ Nuxt limitation
Nuxt uses Nitro, which bundles server routes outside of Vite's plugin pipeline. The schema cannot be injected into the `db` instance, so `db.query.*` relational queries are not available in Nuxt. Use the standard query builder API (`db.select().from(table)`) instead.
:::

### KV Storage

```ts
import { kv } from "void/kv";

export default defineEventHandler(async () => {
  return kv.get("app:settings");
});
```

### Blob Storage

```ts
import { storage } from "void/storage";

export default defineEventHandler(async () => {
  return storage.get("avatars/user-1.png");
});
```

### AI

```ts
import { ai } from "void/ai";

export default defineEventHandler(async () => {
  return ai.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt: "Summarize the latest news",
  });
});
```

### Cron Jobs

```ts
// crons/daily-cleanup.ts
import { defineScheduled } from "void";

export const cron = "0 0 * * *";

export default defineScheduled(async () => {
  // runs daily at midnight
});
```

### Queue Consumers

```ts
// queues/emails.ts
import { defineQueue } from "void";

export default defineQueue<{ to: string; subject: string }>(async (batch) => {
  for (const msg of batch.messages) {
    // process each message
    msg.ack();
  }
});
```

### Environment Variables

Void gives you a typed env layer: declare keys in `env.ts`, read them via `import { env } from "void/env"`, and get schema validation at build + deploy time plus a client-leak guard that fails the build if a server-only key reaches the browser. See the [env vars guide](../../guide/env-vars.md) for the full feature set.

`void/env` replaces `useRuntimeConfig()` and `event.context.cloudflare.env` for env-var access. Keep `event.context.cloudflare.env` around when you need raw binding access (D1, KV, R2, etc.), and `useRuntimeConfig()` when you need non-env runtime config.

## Accessing Bindings Directly

You can also access raw Cloudflare bindings via Nitro's event context:

```ts
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  const { DB } = event.context.cloudflare.env;
  const { results } = await DB.prepare("SELECT * FROM users").all();
  return results;
});
```
