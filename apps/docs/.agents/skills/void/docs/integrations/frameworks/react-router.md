---
outline: deep
---

# React Router v7

[React Router v7](https://reactrouter.com/) is a Vite-based full-stack React framework. `voidPlugin()` composes directly with the React Router plugin in the Vite pipeline, so there is no separate adapter to install.

## Setup

### 1. Create a new project

```bash
npm create react-router@latest my-app
cd my-app
```

### 2. Install dependencies

```bash
npm install -D void
```

### 3. Configure `vite.config.ts`

```ts
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [
    voidPlugin(), // must come before the framework plugin
    reactRouter(),
  ],
});
```

### 4. Deploy

```bash
void auth login
void deploy
```

## Using Void Platform Features

Most [Void platform features](../../guide/app-types.md#void-apps) work with React Router. Use them in loaders and actions:

Void-managed auth is not supported in framework mode yet. Use Better Auth's official React Router integration directly for now.

### Database

```tsx
import type { Route } from "./+types/users";
import { db } from "void/db";
import { users } from "@schema";

export async function loader({}: Route.LoaderArgs) {
  return { users: await db.select().from(users) };
}
```

### KV Storage

```tsx
import { kv } from "void/kv";

export async function loader() {
  return { settings: await kv.get("app:settings") };
}
```

### Blob Storage

```tsx
import { storage } from "void/storage";

export async function loader() {
  return { avatar: await storage.get("avatars/user-1.png") };
}
```

### AI

```tsx
import { ai } from "void/ai";

export async function action() {
  return ai.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt: "Summarize the latest news",
  });
}
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

React Router-specific caveat: because `loader()` and the component live in the same route file, the leak guard treats the module as client-reachable. Reading `env.SERVER_ONLY_KEY` inside `loader()` is safe at runtime (RR strips loaders from the client bundle), but the guard flags it as a potential leak. Move server-only secrets into a `.server.ts` companion file to silence the guard cleanly.

## Accessing Bindings Directly

You can also access Cloudflare bindings via the `cloudflare:workers` module:

```tsx
import { env } from "cloudflare:workers";

const { results } = await env.DB.prepare("SELECT * FROM users").all();
```
