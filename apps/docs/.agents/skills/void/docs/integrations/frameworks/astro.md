---
outline: deep
---

# Astro

[Astro](https://astro.build/) has its own CLI and Cloudflare adapter (`@astrojs/cloudflare`). Add `voidPlugin()` to Astro's Vite config for binding inference, typed DB, and migrations during development.

::: warning Astro 6 required

- [Astro 6+](https://astro.build/blog/astro-6/) is required to use `import { x } from "void/x"` helpers in Astro apps.
- You also need to enable `"nodejs_als"` under `compatibility_flags` in your wrangler config.
  :::

## Setup

### 1. Create a new project

```bash
npm create astro@latest my-app
cd my-app
```

### 2. Install dependencies

```bash
npm install -D @astrojs/cloudflare void
```

### 3. Configure `astro.config.mjs`

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import { voidPlugin } from "void";

export default defineConfig({
  adapter: cloudflare(),
  vite: { plugins: [voidPlugin()] },
});
```

By default, Astro Cloudflare runtime and `voidPlugin()` migrations share Wrangler's local state at `.wrangler/state/v3`, so no extra persistence configuration is required.

### 4. Create `wrangler.jsonc`

`voidPlugin()` auto-syncs inferred bindings into this file on dev startup:

```jsonc
{
  "name": "my-app",
  "compatibility_date": "2026-02-24",
  "compatibility_flags": ["nodejs_als"],
}
```

`nodejs_als` is required for `void/*` runtime helpers (for example `void/db`, `void/kv`) in Astro.

### 5. Deploy

```bash
void auth login
void deploy
```

## Using Void Platform Features

Most [Void platform features](../../guide/app-types.md#void-apps) work with Astro in both local dev and production when using Astro 6+ with `nodejs_als`.

Void-managed auth is not supported in framework mode yet. Use Better Auth's official Astro integration directly for now.

Pages that access runtime bindings must opt out of prerendering:

```astro
---
export const prerender = false;
// now Astro.locals.runtime is available
---
```

### Database

Use `void/db` in API routes and server-side code:

```ts
import type { APIRoute } from "astro";
import { db } from "void/db";
import { users } from "@schema";

export const GET: APIRoute = async () => {
  const rows = await db.select().from(users);
  return Response.json(rows);
};
```

### KV Storage

Use `void/kv` in both dev and production:

```ts
import type { APIRoute } from "astro";
import { kv } from "void/kv";

export const GET: APIRoute = async () => {
  const settings = await kv.get("app:settings");
  return Response.json(settings);
};
```

### Blob Storage

```ts
import type { APIRoute } from "astro";
import { storage } from "void/storage";

export const GET: APIRoute = async () => {
  const avatar = await storage.get("avatars/user-1.png");
  return new Response(avatar);
};
```

### AI

```ts
import type { APIRoute } from "astro";
import { ai } from "void/ai";

export const POST: APIRoute = async () => {
  const result = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt: "Summarize the latest news",
  });
  return Response.json(result);
};
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

Astro-specific note: the client prefix is `PUBLIC_*` (Astro's default `envPrefix`), not `VITE_*` — name client-exposed keys accordingly and the leak guard + constant folding honour the prefix automatically.

`void/env` replaces [`astro:env`](https://docs.astro.build/en/guides/environment-variables/) and `Astro.locals.runtime.env` for env-var access. Keep `Astro.locals.runtime.env` around when you need raw binding access (D1, KV, R2, etc.).

## Accessing Bindings Directly

Access bindings via `Astro.locals.runtime.env` (works in both dev and production):

```ts
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  const { DB } = locals.runtime.env;
  const { results } = await DB.prepare("SELECT * FROM users").all();
  return Response.json(results);
};
```

In `.astro` pages (remember to set `prerender = false`):

```astro
---
export const prerender = false;
const { DB } = Astro.locals.runtime.env;
const { results } = await DB.prepare("SELECT * FROM users").all();
---
```

::: tip Direct Binding Access
`Astro.locals.runtime.env` is still useful when you need direct access to raw Cloudflare bindings.
:::
