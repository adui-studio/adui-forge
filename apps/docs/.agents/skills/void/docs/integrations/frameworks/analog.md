---
outline: deep
---

# Analog

[Analog](https://analogjs.org/) is a Vite-based Angular meta-framework powered by Nitro. Add `voidPlugin()` to the Vite config for binding inference, typed DB, and migrations during development.

## Setup

### 1. Create a new project

```bash
npx create-analog@latest my-app
cd my-app
```

### 2. Install dependencies

```bash
npm install -D void wrangler nitro-cloudflare-dev
```

The `wrangler` dependency is needed for local Cloudflare bindings. `nitro-cloudflare-dev` creates a Cloudflare platform proxy during dev so that `void/db`, `void/kv`, and other runtime helpers can access bindings.

### 3. Configure `vite.config.ts`

```ts
import { resolve } from "node:path";
import { defineConfig } from "vite";
import analog from "@analogjs/platform";
import { voidPlugin } from "void";

export default defineConfig({
  resolve: {
    mainFields: ["module"],
  },
  plugins: [
    analog({
      ssr: true,
      nitro: {
        preset: "cloudflare-module",
        modules: ["nitro-cloudflare-dev"],
        alias: {
          // Nitro has its own bundler that doesn't use Vite aliases.
          // Duplicate @schema here so Nitro can resolve it.
          "@schema": resolve(__dirname, "db/schema.ts"),
        },
      },
    }),
    voidPlugin(),
  ],
});
```

### 4. Create `wrangler.jsonc`

`voidPlugin()` auto-syncs inferred bindings into this file on dev startup:

```jsonc
{
  "name": "my-app",
  "compatibility_date": "2026-02-24",
  "compatibility_flags": ["nodejs_compat", "nodejs_als"],
}
```

`nodejs_compat` is required for Nitro's Cloudflare runtime. `nodejs_als` is required for `void/*` runtime helpers (e.g. `void/db`, `void/kv`).

### 5. Deploy

```bash
void auth login
void deploy
```

## Using Void Platform Features

Most [Void platform features](../../guide/app-types.md#void-apps) work with Analog. Use them in page server loaders, actions, and API routes:

Void-managed auth is not supported in framework mode yet. Use Better Auth's official integration directly for now.

### Database

```ts
// src/app/pages/users.server.ts
import type { PageServerLoad } from "@analogjs/router";
import { db } from "void/db";
import { users } from "@schema";

export const load = async ({ event }: PageServerLoad) => {
  return { users: await db.select().from(users) };
};
```

::: warning ⚠️ Analog limitation
Analog uses Nitro, which bundles server routes outside of Vite's plugin pipeline. The schema cannot be injected into the `db` instance, so `db.query.*` relational queries are not available in Analog. Use the standard query builder API (`db.select().from(table)`) instead.
:::

### KV Storage

```ts
import type { PageServerLoad } from "@analogjs/router";
import { kv } from "void/kv";

export const load = async ({ event }: PageServerLoad) => {
  return { settings: await kv.get("app:settings") };
};
```

### Blob Storage

```ts
import type { PageServerLoad } from "@analogjs/router";
import { storage } from "void/storage";

export const load = async ({ event }: PageServerLoad) => {
  return { avatar: await storage.get("avatars/user-1.png") };
};
```

### AI

```ts
// src/server/routes/api/summarize.ts
import { eventHandler } from "h3";
import { ai } from "void/ai";

export default eventHandler(async () => {
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

`void/env` replaces the H3 event context and `import { env } from "cloudflare:workers"` for env-var access. Keep those around when you need raw binding access (D1, KV, R2, etc.).

## Accessing Bindings Directly

You can also access raw Cloudflare bindings via the H3 event context or the `cloudflare:workers` module:

```ts
// src/server/routes/api/users.ts
import { eventHandler } from "h3";
import { env } from "cloudflare:workers";

export default eventHandler(async () => {
  const { results } = await env.DB.prepare("SELECT * FROM users").all();
  return results;
});
```
