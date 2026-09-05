---
outline: deep
---

# Server Routing

Full-stack Void apps uses file-based routing powered by [Hono](https://hono.dev). Drop files in `routes/` and they become endpoints. Add global middleware in `middleware/`.

## Route Files

Create route handlers in `routes/**/*.ts`. Each file maps to a URL path based on its location in the filesystem:

<RoutesFileTree />

Dynamic segments use brackets: `[id]` becomes a route parameter and `[...slug]` becomes a catch-all. Files or directories starting with `_` are ignored. Directories wrapped in parentheses like `(admin)` are route groups. They help organize files without changing the URL.

You can add a `.dev` or `.prod` suffix before the extension (e.g. `debug.dev.ts`) to include a route only in that environment.

Each file exports named HTTP method constants to handle specific methods:

```ts
// routes/api/hello.ts  →  GET /api/hello
import { defineHandler } from "void";

export const GET = defineHandler((c) => {
  return { message: "Hello!", timestamp: Date.now() };
});
```

A file can export multiple methods:

```ts
// routes/api/users/index.ts  →  GET + POST /api/users
import { defineHandler } from "void";
import { db } from "void/db";
import { users } from "@schema";

export const GET = defineHandler(async () => {
  return await db.select().from(users);
});

export const POST = defineHandler(async (c) => {
  const body = await c.req.json();
  await db.insert(users).values({ name: body.name });
  return { created: true };
});
```

The `db` helper provides a typed query API over D1. See [Database](./database.md) for the full API.

## `defineHandler`

`defineHandler` wraps a route handler function:

```ts
import { defineHandler } from "void";

export const GET = defineHandler((c) => {
  return { data: "hello" };
});
```

The handler receives a Hono `Context` with typed Cloudflare bindings on `c.env` (see [Cloudflare](../integrations/cloudflare.md)). You can use the full Hono API (`c.json()`, `c.text()`, `c.header()`, etc.).

Return values are automatically converted:

- **object/array/number/boolean** → JSON response
- **`string`** → `text/html; charset=utf-8`
- **`null`/`undefined`** → `204 No Content`
- **`Response`** → returned as-is

## Validation

`defineHandler.withValidator()` adds input validation for `body`, `query`, and `params`. The recommended approach is to derive validators from your [Drizzle schema](./database.md#schema-derived-validators), which keeps validation in sync with the database.

```ts
// routes/api/users/index.ts
import { defineHandler } from "void";
import { db } from "void/db";
import { users, insertUserSchema } from "@schema";

export const POST = defineHandler.withValidator({
  body: insertUserSchema,
})(async (c, { body }) => {
  const [created] = await db.insert(users).values(body).returning();
  return created;
});
```

See [Database: Schema-Derived Validators](./database.md#schema-derived-validators) for how to set up `createInsertSchema` with column refinements.

You can validate multiple slots at once:

```ts
// routes/api/users/[id].ts
import { defineHandler } from "void";
import { db, eq } from "void/db";
import { users, updateUserSchema } from "@schema";

export const PUT = defineHandler.withValidator({
  body: updateUserSchema,
})(async (c, { body }) => {
  const id = Number(c.req.param("id"));
  const [updated] = await db.update(users).set(body).where(eq(users.id, id)).returning();
  return updated;
});
```

### Manual validators

For endpoints that don't map to a database table, you can write validators by hand using any [Standard Schema](https://standardschema.dev/)-compatible library (Valibot, Zod, ArkType, etc.):

```ts
import * as v from "valibot";
import { defineHandler } from "void";

export const POST = defineHandler.withValidator({
  body: v.object({
    query: v.pipe(v.string(), v.minLength(1)),
    limit: v.optional(v.pipe(v.number(), v.maxValue(100)), 10),
  }),
})(async (c, { body }) => {
  // body is typed as { query: string; limit: number }
  return search(body.query, body.limit);
});
```

### Validation errors

When validation fails, a `400` response is returned with structured error details:

```json
{
  "error": "Validation failed",
  "issues": [
    {
      "slot": "body",
      "issues": [{ "message": "Invalid email", "path": "email" }]
    }
  ]
}
```

No extra dependencies are required. Void inlines the Standard Schema types, so you only need your chosen schema library.

Validator schemas also power the [typed fetch client](./typed-fetch.md), so `body`, `query`, and `params` types are enforced at the call site.

## Middleware

Void middlewares are just Hono middlewares. `defineMiddleware()` is a thin typing helper around the standard Hono `(c, next)` shape, and `defineHandler()` also accepts raw Hono middleware directly.

```ts
import { defineMiddleware } from "void";

export const addServerTiming = defineMiddleware(async (c, next) => {
  const start = performance.now();
  await next();
  c.header("Server-Timing", `app;dur=${Math.round(performance.now() - start)}`);
});
```

Any `hono/*` built-in middleware, response helpers, or third-party Hono ecosystem packages can be used in Void apps. If you want to import from `hono/*` in your app, make sure to install `hono` in your app first:

```bash
npm install hono
```

```ts
import { cors } from "hono/cors";

const allowDashboard = cors({ origin: "https://app.example.com" });
```

You can apply middleware globally or per-route.

### Global middleware

Global middleware runs on every request. Place files in `middleware/` and use numeric prefixes for ordering:

- `middleware/01.logger.ts`
- `middleware/02.auth.ts`

```ts
import { defineMiddleware } from "void";

export default defineMiddleware(async (c, next) => {
  console.log(c.req.method, c.req.path);
  await next();
});
```

`defineMiddleware` uses Hono middleware semantics: `(c, next) => Promise<void> | void`.

For a temporary full-site gate, use the built-in `basicAuth()` middleware with credentials from `void/env`. Void internal endpoints under `/__void` are excluded automatically so deploy migrations and dev tooling continue to work. Wrap `void/env` reads in functions so they are resolved per request after Void has bound the runtime env.

```ts
// env.ts
import { defineEnv, string } from "void/env";

export default defineEnv({
  BASIC_AUTH_USERNAME: string(),
  BASIC_AUTH_PASSWORD: string(),
});
```

```ts
// middleware/01.basic-auth.ts
import { basicAuth } from "void";
import { env } from "void/env";

export default basicAuth({
  username: () => env.BASIC_AUTH_USERNAME,
  password: () => env.BASIC_AUTH_PASSWORD,
  realm: "Preview",
});
```

Set `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` as local environment variables for development and production secrets before deploy.

For app-specific bypasses such as health checks or public webhooks, compose that logic in your own middleware before calling `basicAuth()`.

Middleware can set typed context variables using `c.set()`. Augment the `CloudContextVariables` interface so downstream handlers get full type safety:

```ts
// middleware/01.request-id.ts
import { defineMiddleware } from "void";

declare module "void" {
  interface CloudContextVariables {
    requestId: string;
  }
}

export default defineMiddleware(async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});
```

Now every route handler can call `c.get("requestId")` and get `string` back, with no type assertion needed. See [Type Safety](./type-safety.md#context-variables) for more details.

### Per-route middleware

Pass one or more middleware to `defineHandler` before the final handler:

```ts
defineHandler(middleware1, middleware2, handler);
```

Middleware runs in order. Each can short-circuit (return a response without calling `next()`) or post-process (modify the response after `await next()`). Both `defineMiddleware`-wrapped functions and raw Hono `MiddlewareHandler` functions are accepted.

```ts
// routes/api/stats.ts
import { defineHandler } from "void";
import { cors } from "hono/cors";

const addServerTiming = async (c, next) => {
  const start = performance.now();
  await next();
  c.header("Server-Timing", `app;dur=${Math.round(performance.now() - start)}`);
};

export const GET = defineHandler(
  cors({ origin: "https://app.example.com" }),
  addServerTiming,
  (c) => {
    return { stats: "..." };
  },
);
```

Up to 5 middleware can be passed before the handler, with full type inference for each position.

See the [Hono integration guide](../integrations/hono.md) for more examples.
