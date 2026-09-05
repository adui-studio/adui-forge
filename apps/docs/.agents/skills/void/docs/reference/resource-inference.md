---
outline: deep
---

# Resource Inference

Void automatically detects which Cloudflare resources your project uses by scanning source files at startup. In most cases, there is no manual configuration. Use a resource in code, and Void provisions the matching binding for local development.

## How It Works

When `voidPlugin()` initializes, it synchronously scans your source files using a three-tier approach optimized for speed:

1. **Import detection:** uses `es-module-lexer` to check for `void/*` imports. This is the fastest pass and does not require AST parsing.
2. **Regex pre-check:** tests for patterns such as `env.DB` and `env.KV` so files without bindings can be skipped early.
3. **AST confirmation:** when the regex matches, parses the full AST to confirm `c.env.DB` or `env.DB` member expressions.

This runs once before plugins initialize, so the results are available to configure the Cloudflare Vite plugin.

## Detected Bindings

| Binding   | Type                              | Detected by import                                                                                                                                               | Detected by env access           |
| --------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `DB`      | `D1Database`                      | `import { db } from "void/db"`                                                                                                                                   | `env.DB` or `c.env.DB`           |
| `KV`      | `KVNamespace`                     | `import { kv } from "void/kv"`                                                                                                                                   | `env.KV` or `c.env.KV`           |
| `STORAGE` | `R2Bucket`                        | `import { storage } from "void/storage"`                                                                                                                         | `env.STORAGE` or `c.env.STORAGE` |
| `AI`      | `Ai`                              | `import { ai } from "void/ai"`                                                                                                                                   | `env.AI` or `c.env.AI`           |
| `SANDBOX` | `DurableObjectNamespace<Sandbox>` | `import { getSandbox } from "void/sandbox"`                                                                                                                      | `env.SANDBOX` or `c.env.SANDBOX` |
| Auth      | none                              | `import { ... } from "void/auth"` or `import { auth } from "void/client"` / `void/client/react` / `void/client/vue` / `void/client/svelte` / `void/client/solid` | none                             |
| `QUEUE_*` | `Queue`                           | `import { queues } from "void/queues"`                                                                                                                           | `env.QUEUE_*`                    |

Auth detection also triggers when importing the `auth` specifier from `void/client` or a framework-specific client subpath such as `void/client/react` (but not when importing only `fetch`).

## Scanned Directories

### Standard mode

When using Void's built-in routing (no meta-framework), these directories are scanned:

| Directory     | Contains                                    |
| ------------- | ------------------------------------------- |
| `routes/`     | API route handlers                          |
| `middleware/` | Hono middleware                             |
| `queues/`     | Queue consumers                             |
| `pages/`      | Page components and `.server.ts` companions |
| `crons/`      | Scheduled job handlers                      |

### Framework mode

When a meta-framework is detected (TanStack Start, React Router, SvelteKit, Nuxt, or Astro), a broader set of directories is scanned instead:

| Directory | Contains                |
| --------- | ----------------------- |
| `src/`    | Application source      |
| `app/`    | Framework app directory |
| `routes/` | Framework routes        |
| `server/` | Server-side code        |

Framework detection checks `package.json` for `@tanstack/react-start`, `@react-router/dev`, `@sveltejs/kit`, `nuxt`, or `astro` in dependencies.

For SvelteKit, Nuxt, and Astro, add `voidPlugin()` to the framework's Vite config to enable inference during dev. See [Frameworks Integration](../integrations/frameworks/overview.md) for setup details.

### Always scanned

Regardless of mode, these are always checked:

- **SSR entry** such as `src/main.ssr.ts`, for SSR apps that access bindings during rendering
- **`src/`**, which is always scanned for auth imports unless it is already in the scan list for framework mode

## Custom Scan Directories

If your project organizes code in non-standard directories, you can override which directories are scanned:

```json
{
  "inference": {
    "scanDirs": ["src", "lib", "workers"]
  }
}
```

Paths are relative to the project root. When `inference.scanDirs` is set, it replaces the default directories entirely. Defaults for the current mode are not merged in. The SSR entry and `src/` auth scan still apply either way.

## Explicit Binding Overrides

If inference doesn't match your setup, you can skip it entirely and declare bindings explicitly:

```json
{
  "inference": {
    "bindings": {
      "db": true,
      "kv": true,
      "storage": false,
      "ai": false
    }
  }
}
```

When `inference.bindings` is set, explicit values take full precedence and inference is skipped entirely.

## File Types

Inference scans files matching `**/*.{ts,tsx,mts,js,jsx,mjs}` within each directory. Non-JS files (CSS, HTML, images) are ignored.

## Common Patterns

### Pages mode with D1

A page companion file in `pages/` triggers D1 inference:

```ts
// pages/users.server.ts
import { db } from "void/db";

export function loader() {
  return db.select().from(users);
}
```

### Cron job with KV

A scheduled handler in `crons/` triggers KV inference:

```ts
// crons/cleanup.ts
import { defineScheduled } from "void";
import { kv } from "void/kv";

export default defineScheduled(async () => {
  await kv.delete("temp-cache");
});
```

### Route handler with R2

A route handler in `routes/` triggers R2 inference:

```ts
// routes/api/upload.ts
import { defineHandler } from "void";
import { storage } from "void/storage";

export const POST = defineHandler(async (c) => {
  const file = await c.req.blob();
  await storage.put("uploads/file.bin", file);
  return c.json({ ok: true });
});
```
