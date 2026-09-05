---
outline: deep
---

# TanStack Start

[TanStack Start](https://tanstack.com/start/latest) is a Vite-based full-stack React framework. `voidPlugin()` composes directly with the TanStack Start plugin in the Vite pipeline, so there is no separate adapter to install.

## Setup

### 1. Create a new project

```bash
npm create @tanstack/start@latest my-app
cd my-app
```

### 2. Install dependencies

```bash
npm install -D void
```

### 3. Configure `vite.config.ts`

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin";
import react from "@vitejs/plugin-react";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [
    voidPlugin(), // must come before the framework plugin
    tanstackStart(),
    react(),
  ],
});
```

### 4. Deploy

```bash
void auth login
void deploy
```

## Using Void Platform Features

Most [Void platform features](../../guide/app-types.md#void-apps) work with TanStack Start. Use them in server functions:

Void-managed auth is not supported in framework mode yet. Use Better Auth's official TanStack Start integration directly for now.

### Database

```tsx
import { createServerFn } from "@tanstack/react-start";
import { db } from "void/db";
import { users } from "@schema";

const getUsers = createServerFn().handler(async () => {
  return db.select().from(users);
});
```

### KV Storage

```tsx
import { createServerFn } from "@tanstack/react-start";
import { kv } from "void/kv";

const getSettings = createServerFn().handler(async () => {
  return kv.get("app:settings");
});
```

### Blob Storage

```tsx
import { createServerFn } from "@tanstack/react-start";
import { storage } from "void/storage";

const getAvatar = createServerFn().handler(async () => {
  return storage.get("avatars/user-1.png");
});
```

### AI

```tsx
import { createServerFn } from "@tanstack/react-start";
import { ai } from "void/ai";

const summarize = createServerFn().handler(async () => {
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

## Accessing Bindings Directly

You can also access Cloudflare bindings via the `cloudflare:workers` module:

```tsx
import { env } from "cloudflare:workers";

const { results } = await env.DB.prepare("SELECT * FROM users").all();
```
