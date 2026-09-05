---
outline: deep
---

# API Reference

This page is the source of truth for user-facing `void` exports. Use it when you already know what feature you want and need the exact import, signature, or return type. Some exported subpaths are implementation support for adapters, generated workers, or internal runtime wiring and are intentionally not listed as app APIs.

## Plugin

### `voidPlugin(options?)`

Named export from `"void"`. Returns an array of Vite plugins that set up file-based routing, migration support, and the Cloudflare Workers runtime. Application-level configuration is read from [`void.json`](./config.md); the optional `options` object controls Vite/Cloudflare plugin behavior.

```ts
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin()],
});
```

| Option             | Type                      | Description                                                                                                                                                                                                                       |
| ------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `persistTo`        | `string`                  | Directory path for persisting local dev state (D1, KV, R2). Defaults to `.void/` in the project root.                                                                                                                             |
| `auxiliaryWorkers` | `AuxiliaryWorkerConfig[]` | Additional workers to run inside the same Miniflare instance during dev. Passed through to `@cloudflare/vite-plugin`. Useful for running multiple workers that share bindings (e.g. a separate API worker alongside a dashboard). |

## Handlers

Imported from `"void"` or `"void/handler"`.

### `defineHandler(handler)`

Wraps a route handler function. The handler receives a [`CloudContext`](#cloudcontext) and can return a plain value (auto-converted to a Response) or use the Hono `c.json()` / `c.text()` APIs directly.

```ts
import { defineHandler } from "void";

export const GET = defineHandler((c) => {
  return { message: "hello" };
});
```

**Signature:**

```ts
function defineHandler<R>(handler: (c: CloudContext) => R): TypedHandler<{}, R>;
```

### `defineHandler(middleware..., handler)`

Composes up to 5 per-route middleware with a final handler. Middleware runs in order before the handler.

```ts
export const GET = defineHandler(authMiddleware, rateLimiter, (c) => {
  return { ok: true };
});
```

### `defineHandler.withValidator(validators)`

Creates a handler with input validation using any [Standard Schema](https://github.com/standard-schema/standard-schema) compatible library (zod, valibot, arktype, etc.). Returns a curried function that accepts the handler.

Validated input is passed as the second argument to the handler.

```ts
import { defineHandler } from "void";
import * as v from "valibot";

export const POST = defineHandler.withValidator({
  body: v.object({
    name: v.pipe(v.string(), v.minLength(1)),
    email: v.pipe(v.string(), v.email()),
  }),
})((c, { body }) => {
  return { received: body.name };
});
```

**Signature:**

```ts
function withValidator<V extends ValidatorSlots>(
  validators: V,
): <R>(handler: (c: CloudContext, input: HandlerInput<V>) => R) => TypedHandler<V, R>;
```

**Type: `ValidatorSlots`**

```ts
interface ValidatorSlots {
  body?: StandardSchemaV1;
  query?: StandardSchemaV1;
  params?: StandardSchemaV1;
}
```

**Type: `HandlerInput<V>`**

The inferred output types of each validator slot. For a `ValidatorSlots` with `body` and `query`, the input object has `{ body: ..., query: ... }` with types inferred from the schema output.

### `defineMiddleware(handler)`

Type-safe wrapper for Hono middleware. At runtime, returns the function unchanged.

```ts
import { defineMiddleware } from "void";

export default defineMiddleware(async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`);
  await next();
});
```

**Signature:**

```ts
function defineMiddleware(handler: MiddlewareHandler<CloudEnv>): MiddlewareHandler<CloudEnv>;
```

### `basicAuth(options)`

Built-in Basic authentication middleware for temporary site gates and pre-launch protection. Use it from `middleware/` with credentials from `void/env` to protect the whole app, or pass it to `defineHandler()` for a single route.

Void internal endpoints under `/__void` are always excluded so deploy-time migrations, prerendering, cron/queue dispatch, and remote binding helpers still reach Void's own internal-token checks.

When credentials come from `void/env`, wrap the reads in functions so they are resolved per request after Void has bound the runtime env.

For app-specific bypasses such as health checks or public webhooks, compose that logic in your own middleware before calling `basicAuth()`.

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

**Signature:**

```ts
function basicAuth(options: {
  username: string | (() => string);
  password: string | (() => string);
  realm?: string | (() => string);
  message?: string | (() => string);
}): MiddlewareHandler<CloudEnv>;
```

### `defineScheduled(handler)`

Wraps a Cloudflare [Scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/) with type inference.

```ts
import { defineScheduled } from "void";

export default defineScheduled(async (controller, env, ctx) => {
  const { results } = await env.DB.prepare("SELECT * FROM stale").all();
  // ...
});
```

**Signature:**

```ts
function defineScheduled(
  handler: (
    controller: ScheduledController,
    env: CloudEnv["Bindings"],
    ctx: ExecutionContext,
  ) => unknown | Promise<unknown>,
): ScheduledFn;
```

### `defineQueue<T>(handler)`

Wraps a [queue](../guide/queues.md) consumer handler with typed message bodies. The generic `<T>` defines the message body type, which flows through to the typed `queues` proxy for `send()` calls.

```ts
import { defineQueue } from "void";

export default defineQueue<{ to: string; subject: string }>(async (batch, env) => {
  for (const msg of batch.messages) {
    console.log(`Send to ${msg.body.to}: ${msg.body.subject}`);
  }
});
```

**Signature:**

```ts
function defineQueue<T>(
  handler: (batch: QueueBatch<T>, env: CloudEnv["Bindings"]) => void | Promise<void>,
): QueueFn;
```

### `defineRender(handler)`

Wraps an SSR render entry. The second argument provides pre-built `<head>` and `<body>` asset tags for injecting client scripts and styles.

```ts
import { defineRender } from "void";
import { renderToString } from "react-dom/server";

export default defineRender((c, assetTags) => {
  const html = renderToString(<App />);
  return c.html(`<!DOCTYPE html>
    <html><head>${assetTags.css}${assetTags.preloads}</head>
    <body><div id="root">${html}</div>${assetTags.body}</body></html>`);
});
```

**Signature:**

```ts
function defineRender(
  handler: (c: CloudContext, assetTags: RenderAssetTags) => Response | Promise<Response>,
): RenderFn;
```

**Type: `RenderAssetTags`**

```ts
interface RenderAssetTags {
  css: string; // Stylesheet links for <head>
  preloads: string; // Modulepreload and dev client tags for <head>
  body: string; // Script tags for before </body>
}
```

### `defineHead<P>(handler)`

Type-safe wrapper for the page `head()` export in `.server.ts` files. Provides [`CloudContext`](#cloudcontext) typing for the first argument and generic props typing for the second.

```ts
import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const post = await getPost(c.req.param("slug"));
  return { post };
});

export const head = defineHead<Props>((c, props) => {
  return {
    title: props.post.title,
    meta: [
      { name: "description", content: props.post.excerpt },
      { property: "og:title", content: props.post.title },
    ],
  };
});
```

**Signature:**

```ts
function defineHead<P = Record<string, unknown>>(
  handler: (c: CloudContext, props: P) => HeadDescriptor | undefined,
): (c: CloudContext, props: P) => HeadDescriptor | undefined;
```

## Rewrites

URL rewrites re-dispatch a request at a different internal path without changing the browser's URL. `c.rewrite()`, `c.originalUrl()`, and `c.isRewritten()` are available on every Hono `Context` the Void runtime hands you. See the [Rewrites guide](../guide/edge/rewrites.md) for the full overview, including static `routing.rewrites` / `routing.fallbacks` in [`void.json`](./config.md#routing).

### `c.rewrite(destination)`

Re-dispatches the current request at `destination` and returns the resulting `Response`. The browser URL does not change — this is a server-side hop. If `destination` has no query string, the original request query is preserved. If `destination` includes a query string, it replaces the original query. `destination` must start with `/`; known generated routes autocomplete via [`RewriteDestination`](#rewritedestination), while arbitrary strings remain accepted for dynamic paths.

`c.redirect()` also preserves request query params for internal destinations, but it merges rather than replaces: destination params win on collision, and request-only params are appended.

```ts
import { defineHandler } from "void";

export const GET = defineHandler((c) => {
  const locale = c.req.header("accept-language")?.startsWith("de") ? "de" : "en";
  return c.rewrite(`/${locale}${new URL(c.req.url).pathname}`);
});
```

**Signature:**

```ts
interface CloudContext {
  rewrite(destination: RewriteDestination): Promise<Response>;
}
```

**Caveats:**

- `destination` must start with a single `/` and point at an internal path. External URLs, protocol-relative destinations (`//host/...`), and anything non-path-absolute throw immediately — use `fetch()` for cross-origin calls.
- Destinations whose final path segment ends in a known static-asset extension (e.g. `/hero.png`, `/app.css`, `/data.json`) throw `VoidAssetRewriteError` (exported from `"void"`) before the re-dispatch. Runtime rewrites cannot reach assets — use a static `routing.rewrites` rule or a `_redirects` `200!` entry. `.html` is deliberately excluded from this guard because `.html` paths may be legitimate route handlers. See the [guide](../guide/edge/rewrites.md#runtime-rewrites-cannot-reach-static-assets) for the full extension list and rationale.
- Middleware re-runs on every rewrite hop. Guard side-effects with [`c.isRewritten()`](#c-originalurl-c-isrewritten).
- Client-side SPA navigation via `Link` does not trigger server rewrites; only full HTTP requests do.
- [ISR](../guide/edge/revalidation.md) cache keys follow the rewritten path, not the original URL.

### `c.originalUrl()` / `c.isRewritten()`

Context methods for inspecting rewrite state. `c.originalUrl()` returns the pre-rewrite URL as a `URL` object, or `null` on the first, non-rewritten hop. `c.isRewritten()` returns `true` on any re-dispatched context and `false` on the original. Both helpers read from an in-worker `WeakMap<Request, URL>` keyed on `c.req.raw`; the `X-Void-Original-URL` header is only how edge dispatch forwards the pre-rewrite URL to the worker, and entry middleware migrates it into the map once per request.

```ts
import { defineMiddleware } from "void";

export default defineMiddleware(async (c, next) => {
  if (!c.isRewritten()) {
    // Only log the user-visible request, not internal rewrite hops.
    console.log(`${c.req.method} ${c.req.path}`);
  }
  await next();
});
```

**Signature:**

```ts
interface CloudContext {
  originalUrl(): URL | null;
  isRewritten(): boolean;
}
```

### `RewriteDestination`

```ts
import type { RewriteDestination } from "void/routes";
```

Union of the exact route patterns from your generated `RouteMap` plus a `string` fallback (`RouteName | (string & {})`). Known route patterns (e.g. `/posts/[id]`) are offered as autocomplete entries in your editor, while the `string` branch keeps the type assignable from concrete runtime paths like `` `/posts/${id}` `` — there is no `:id` template-literal resolution at the type level. Used as:

- The parameter type of [`c.rewrite()`](#c-rewrite-destination).
- The type of `destination` entries in `routing.rewrites` and `routing.fallbacks` in [`void.json`](./config.md#routing).

Like [`RouteMap`](#routemap), `RewriteDestination` lives in the virtual `void/routes` module and is refreshed whenever routes change.

## Auth

Imported from `"void"` or `"void/auth"`. Client-side helpers imported from `"void/client"`.

### `defineAuth(config)`

Advanced escape hatch for customizing Void's Better Auth config.

```ts
import { defineAuth } from "void/auth";

export default defineAuth(({ defaults }) => ({
  ...defaults,
  trustedOrigins: ["https://example.com"],
}));
```

**Signature:**

```ts
function defineAuth(config: VoidAuthConfig): VoidAuthConfig;
```

### `getUser()`

Returns the current authenticated user from AsyncLocalStorage, or `null` when no user is present.

```ts
import { getUser } from "void/auth";

const user = getUser();
```

**Signature:**

```ts
function getUser(): AuthUser | null;
```

### `getSession()`

Returns the current Better Auth request state, or `null`.

```ts
import { getSession } from "void/auth";

const state = getSession();
```

**Signature:**

```ts
function getSession(): AuthState | null;
```

### `requireAuth(c)`

Extracts the authenticated user from the request context. Throws a 401 `HTTPException` if no session is present.

```ts
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler((c) => {
  const user = requireAuth(c);
  return { email: user.email };
});
```

**Signature:**

```ts
function requireAuth(c: CloudContext): AuthUser;
```

### `AuthUser`

Better Auth user shape re-exported by Void.

```ts
interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `AuthSession`

Better Auth session shape re-exported by Void.

```ts
interface AuthSession {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}
```

### `AuthState`

Combined authenticated request state:

```ts
interface AuthState {
  user: AuthUser;
  session: AuthSession;
}
```

### `auth`

Imported from `"void/client"`. This is a ready-to-use Better Auth client instance preconfigured with `basePath: "/api/auth"`.

```ts
import { auth } from "void/client";

await auth.signIn.email({ email, password });
await auth.signOut();
```

The exact client methods come from Better Auth. In pages apps, Void automatically chooses the framework-specific Better Auth client package when available.

For regular SPA apps that use Void for API/file routes without Void Pages mode, import the framework-specific client explicitly:

```ts
import { auth } from "void/client/react";
// or: 'void/client/vue'
// or: 'void/client/svelte'
// or: 'void/client/solid'
```

Those subpaths keep the same `fetch`, `fetchStream`, and auth exports as `void/client`, but bind `auth` and `createAuthClient` to Better Auth's framework package.

### `createAuthClient`

Imported from `"void/client"`. Re-export of Better Auth's `createAuthClient` for advanced usage.

```ts
import { createAuthClient } from "void/client";

const auth = createAuthClient({ basePath: "/api/auth" });
```

## Fetch Client

Imported from `"void/client"`.

### `fetch(path, options?)`

Type-safe fetch client for calling your API routes from client code, built on top of [ofetch](https://github.com/unjs/ofetch). Route paths and return types are inferred from the generated `RouteMap`.

```ts
import { fetch } from "void/client";

// Types are fully inferred from your route handlers
const users = await fetch("/api/users");
const user = await fetch("/api/users/:id", {
  params: { id: "1" },
});
```

**Signature:**

```ts
function fetch<P extends keyof RouteMap, M extends MethodsOf<P>>(
  path: P,
  options?: FetchOptions<P, M>,
): Promise<OutputOf<P, M>>;
```

**Options:**

| Option    | Type                     | Description                                                |
| --------- | ------------------------ | ---------------------------------------------------------- |
| `method`  | `string`                 | HTTP method. Defaults to `"GET"`.                          |
| `body`    | `unknown`                | Request body (auto-serialized as JSON).                    |
| `query`   | `Record<string, string>` | Query string parameters.                                   |
| `params`  | `Record<string, string>` | URL path parameters (`:id` segments).                      |
| `headers` | `HeadersInit`            | Additional request headers.                                |
| `signal`  | `AbortSignal`            | Abort signal.                                              |
| `baseURL` | `string`                 | Base URL prepended to the path. Useful for external calls. |
| `retry`   | `number`                 | Number of retry attempts (ofetch default: 1 for GET).      |
| `timeout` | `number`                 | Request timeout in milliseconds.                           |

Returns the parsed JSON response body, or `undefined` for 204 responses. Throws `FetchError` on non-2xx responses.

### `FetchError`

Error class thrown by `fetch` on non-2xx responses.

```ts
import { fetch, FetchError } from "void/client";

try {
  await fetch("/api/users/:id", { params: { id: "999" } });
} catch (e) {
  if (e instanceof FetchError) {
    console.log(e.status); // 404
    console.log(e.response); // raw Response
  }
}
```

**Properties:**

| Property   | Type       | Description                          |
| ---------- | ---------- | ------------------------------------ |
| `status`   | `number`   | HTTP status code.                    |
| `response` | `Response` | The raw `Response` object.           |
| `data`     | `unknown`  | Parsed response body (if available). |

### Differences from Native `fetch`

The typed client is built on [ofetch](https://github.com/unjs/ofetch) with a typed route layer on top. Key differences from native `fetch`:

| Behavior               | Native `fetch`                                       | `void/client` `fetch`                                                                                                  |
| ---------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Return type**        | `Promise<Response>`, so you call `.json()` yourself  | `Promise<T>`, which auto-parses JSON and returns the typed result directly (`undefined` for `204`)                     |
| **Error handling**     | Resolves on any HTTP status; you check `response.ok` | Throws `FetchError` on non-2xx responses                                                                               |
| **URL construction**   | Raw URL string                                       | Route path with `:param` interpolation from `options.params` + query string from `options.query`                       |
| **Body serialization** | Manual `JSON.stringify()` + `Content-Type` header    | Auto-serializes `options.body` as JSON and sets `Content-Type: application/json`                                       |
| **Type safety**        | Accepts any URL or method                            | Constrains paths to `RouteMap` keys and methods to those defined per route. Invalid combinations fail at compile time. |
| **Retry**              | None                                                 | Auto-retries on 408, 429, and 5xx (configurable via `retry` option)                                                    |
| **Timeout**            | None                                                 | Configurable via `timeout` option                                                                                      |

`headers` and `signal` are passed through to the underlying fetch unchanged.

## Database

Imported from `"void/db"`. The `db` export is a [Drizzle ORM](https://orm.drizzle.team) instance for the configured database dialect: [Cloudflare D1](https://developers.cloudflare.com/d1/) by default, or PostgreSQL when `void.json` sets `"database": "pg"` / `"postgresql"`. See the [Database guide](../guide/database.md) for usage and the [Drizzle docs](https://orm.drizzle.team/docs/select) for the full query API.

### `db`

Default Drizzle instance, pre-wired with your schema from `db/schema.ts`.

```ts
import { db } from "void/db";
import { users } from "@schema";

const allUsers = await db.select().from(users).all();
```

When the Void plugin is active, `void/db` is served as a virtual module that auto-wires the active database with your schema.

- D1 projects resolve the `DB` binding and expose `DrizzleD1Database<Schema>`.
- PostgreSQL projects use `DATABASE_URL` during local development and Hyperdrive's `connectionString` in production, exposing `NodePgDatabase<Schema>`.

The published npm fallback uses a lazy D1 proxy that resolves the `DB` binding at first access.

### `createDb(database)`

Creates a Drizzle instance for the active dialect.

For D1 projects, pass a specific D1 binding. Use this when you have multiple D1 databases or need a non-default binding.

```ts
import { createDb } from "void/db";
import { env } from "cloudflare:workers";

const db = createDb(env.MY_OTHER_DB);
```

For PostgreSQL projects, pass a connection string.

```ts
import { createDb } from "void/db";

const db = createDb("postgres://user:password@host:5432/app");
```

**Signature:**

```ts
// D1
function createDb(d1: D1Database): DrizzleD1Database<Schema>;

// PostgreSQL
function createDb(connectionString: string): NodePgDatabase<Schema>;
```

### Query Operators

`void/db` re-exports commonly used [Drizzle operators](https://orm.drizzle.team/docs/operators) so you never need to depend on `drizzle-orm` directly:

```ts
import { db, eq, and, or, desc, like, inArray, sql } from "void/db";
```

**Full list:** `sql`, `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `and`, `or`, `not`, `desc`, `asc`, `like`, `ilike`, `notLike`, `inArray`, `notInArray`, `isNull`, `isNotNull`, `between`, `notBetween`, `exists`, `notExists`, `count`, `sum`, `avg`, `min`, `max`.

## Seeding

Imported from `"void/seed"`.

### `defineSeed(fn)`

Identity helper for programmatic seed modules used by `void db seed`.

```ts
import { defineSeed } from "void/seed";

export default defineSeed<typeof import("./schema")>(async ({ db, schema }) => {
  await db.insert(schema.users).values([
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" },
  ]);
});
```

The callback receives:

- `dialect`: `"sqlite"` or `"postgresql"`
- `db`: a local Drizzle instance for the active dialect
- `schema`: the exports from `db/schema.ts` or `db/schema/`

Seed modules can export either `default` or a named `seed` function.

## KV

Imported from `"void/kv"`.

### `kv`

Typed JSON-aware client for the inferred `KV` binding.

```ts
import { kv } from "void/kv";

await kv.put("settings", { theme: "dark" });
const settings = await kv.get<{ theme: string }>("settings");
```

**Key exports:** `kv`, `createKV(namespace)`, `KVClient`, `KVMap`, `PutOptions`, `ListOptions`.

`kv.map(prefix)` creates a typed namespaced view where every key is stored under `prefix:`.

## Storage

Imported from `"void/storage"`.

### `storage`

Default [R2 bucket](https://developers.cloudflare.com/r2/) proxy for the inferred `STORAGE` binding.

```ts
import { storage } from "void/storage";

await storage.put("avatars/alice.png", file);
const object = await storage.get("avatars/alice.png");
```

**Key exports:** `storage`, `createStorage(bucket)`.

## AI

Imported from `"void/ai"`.

### `ai`

Typed AI client for Cloudflare AI models and provider-native AI Gateway requests.

```ts
import { ai } from "void/ai";

const result = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
  messages: [{ role: "user", content: "Summarize this release note." }],
});

const response = await ai.provider("openai").fetch("/chat/completions", {
  body: {
    model: "gpt-4o",
    messages: [{ role: "user", content: "Summarize this release note." }],
  },
});
```

**Key exports:** `ai`, `VoidAi`, provider request types. See [AI](../guide/ai.md) for provider setup and streaming examples.

## ISR

Imported from `"void/isr"`.

### `revalidate(options)`

Revalidate ISR-cached pages on demand. In local development this is a no-op because there is no edge ISR cache.

```ts
import { revalidate } from "void/isr";

await revalidate({ paths: ["/", "/blog/hello"] });
await revalidate({ all: true });
```

**Signature:**

```ts
function revalidate(options: { paths?: string[]; all?: boolean }): Promise<void>;
```

## Logging

Imported from `"void/log"`.

### `logger`

Structured logger that emits one JSON line per call so deployed logs can be filtered by message and fields.

```ts
import { logger } from "void/log";

logger.info("checkout completed", { orderId, userId });
logger.error("webhook failed", { provider: "stripe", attempt: 3 });
```

**Methods:** `logger.error(message, fields?)`, `logger.warn(message, fields?)`, `logger.info(message, fields?)`.

## Types

### `CloudContext`

Hono `Context` pre-typed with [`CloudEnv`](#cloudenv). This is the type of the `c` parameter in all route handlers and middleware.

```ts
import type { CloudContext } from "void";
```

### `CloudEnv`

Hono environment type for Void workers. Extends Hono's `Env` with Cloudflare bindings and context variables.

```ts
interface CloudEnv extends Env {
  Bindings: {
    DB: D1Database;
    KV: KVNamespace;
    STORAGE: R2Bucket;
    AI: Ai;
    SANDBOX: DurableObjectNamespace<import("@cloudflare/sandbox").Sandbox>;
    [key: string]: unknown;
  };
  Variables: CloudContextVariables;
}
```

### `CloudContextVariables`

The context variables type used by `c.set()` / `c.get()`. Augment this interface to add typed variables that flow through all middleware and handlers:

```ts
interface CloudContextVariables {
  user: AuthUser | null;
  session: AuthSession | null;
  [key: string]: unknown;
}
```

**Augmentation example:**

```ts
declare module "void" {
  interface CloudContextVariables {
    requestId: string;
  }
}

// c.get("requestId") → string
```

See [Type Safety](../guide/type-safety.md#context-variables) for details.

### `TypedHandler<V, R>`

The return type of `defineHandler`. Carries phantom types for validators (`V`) and return type (`R`) used by the codegen to produce typed routes.

```ts
interface TypedHandler<V extends ValidatorSlots = {}, R = unknown> {
  (c: CloudContext): Promise<Response> | Response | unknown;
  readonly __validators: V; // type-level only
  readonly __output: R; // type-level only
}
```

### `HeadDescriptor`

Shape of page head metadata returned by `defineHead`. All fields are optional.

```ts
interface HeadDescriptor {
  title?: string;
  meta?: Array<{ name?: string; property?: string; content?: string; charset?: string }>;
  link?: Array<{ rel: string; href: string; [key: string]: string | undefined }>;
  script?: Array<{ src?: string; innerHTML?: string; [key: string]: string | undefined }>;
  htmlAttrs?: Record<string, string>;
  bodyAttrs?: Record<string, string>;
}
```

### `RouteMap`

Empty stub interface augmented at build time by the generated `.void/routes.d.ts`. It contains the full type information for routes, methods, inputs, and outputs, and the typed `fetch` client reads from it.

```ts
import type { RouteMap } from "void/routes";
```

## Environment

Imported from `"void/env"`.

### `defineEnv(schema)`

Register an env schema and return the typed [`env`](#env) proxy. Void auto-discovers `env.ts`, imports it during dev/build/deploy, generates `.void/env.d.ts`, validates production secrets before deploy, and validates values at worker boot.

```ts
import { defineEnv, string, number, oneOf, url } from "void/env";

export default defineEnv({
  STRIPE_KEY: string().secret(),
  PORT: number().default(3000),
  NODE_ENV: oneOf(["development", "production"]),
  VITE_PUBLIC_URL: url().public(),
});
```

### `env`

Typed runtime proxy for declared env keys. Unknown keys and bindings pass through as `unknown`.

```ts
import { env } from "void/env";

const port = env.PORT;
```

### Schema helpers

`void/env` includes Standard Schema-compatible helpers: `string()`, `number()`, `boolean()`, `url()`, `email()`, `oneOf([...])`, and `json<T>()`. Each helper supports `.optional()`, `.default(value)`, `.secret()`, and `.public()`.

### Types

`void/env` also provides global Cloudflare environment types:

```ts
/// <reference types="void/env" />
```

Declares the `Cloudflare.Env` namespace with `DB`, `KV`, `STORAGE`, `AI`, and `SANDBOX` binding types.

For handler context variables such as `c.set()` and `c.get()`, augment [`CloudContextVariables`](#cloudcontextvariables). This is separate from `Cloudflare.Env`, which types worker bindings. Framework adapters such as `@void/vue`, `@void/react`, and `@void/svelte` also augment `CloudContextVariables` to add the `shared` key used by `useShared()`.

## Framework Adaptors

Framework adaptors for [Pages Routing](../guide/pages-routing/overview). Each adaptor provides a Vite plugin and client-side runtime.

### `@void/vue`

#### `voidVue(options?)`

Imported from `"@void/vue/plugin"`. Returns an array of Vite plugins that handle Vue SFC compilation and SSR or hydration entry generation. It already includes `@vitejs/plugin-vue`, so you do not need to install or configure that separately.

```ts
import { voidVue } from "@void/vue/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidVue()],
});
```

**Signature:**

```ts
function voidVue(options?: VoidVueOptions): Plugin[];
```

**Options:**

```ts
interface VoidVueOptions {
  vue?: VuePluginOptions; // passed through to @vitejs/plugin-vue
  viewTransitions?: boolean; // enable View Transitions API for navigations
}
```

#### Vue Runtime

Imported from `"@void/vue"`.

| Export                             | Description                                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Link`                             | Vue component for SPA navigation. Renders `<a>` for GET, `<button>` for non-GET methods. Props: `href`, `method`, `data`, `prefetch`, `cacheFor`, `preserveScroll`, `preserveState`, `replace`, `reloadDocument`, `viewTransition`, `onNavigate`. |
| `useRouter()`                      | Returns the Void Router with current route state (`url`, `path`, `query`, `params`) and navigation methods: `visit`, `refresh`, awaitable `prefetch`, `flush`, `flushAll`.                                                                        |
| `useParams()`                      | Returns dynamic route params for the page currently being rendered.                                                                                                                                                                               |
| `useNavigation()`                  | Returns pending navigation state: `{ state, location, method }`, where `state` is `"idle"`, `"loading"`, or `"submitting"` and `location` is the pending destination.                                                                             |
| `useForm(url, defaults, options?)` | Typed reactive form helper bound to a page action URL. Returns `{ data, post, put, patch, delete, pending, errors, error, hasChanges, wasSuccessful, recentlySuccessful, reset, clearErrors, clearError }`.                                       |
| `useIslandForm(defaults)`          | Form helper for island components where the action URL is inferred from the current island request. Returns the same form state and submit helpers as `useForm()`.                                                                                |
| `action(url, options?)`            | Awaitable one-shot page action helper. Uses `POST` by default and accepts `{ data, method, params }`, where `method` can be `"PUT"`, `"PATCH"`, or `"DELETE"`. Returns an `ActionResult`.                                                         |
| `useShared()`                      | Returns shared data injected by middleware via `c.set("shared", {...})`.                                                                                                                                                                          |

Vue `Link` GET `data` is merged into the rendered `href` query string. Primitive values are serialized with `String(value)`, arrays become repeated keys, `null` and `undefined` are omitted, and nested objects throw. `prefetch` and `reloadDocument` are GET-only and throw for mutation links.

### `@void/react`

#### `voidReact(options?)`

Imported from `"@void/react/plugin"`. Returns an array of Vite plugins that handle SSR and hydration entry generation. It already includes `@vitejs/plugin-react`, so you do not need to install or configure that separately.

```ts
import { voidReact } from "@void/react/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidReact()],
});
```

**Signature:**

```ts
function voidReact(options?: VoidReactOptions): Plugin[];
```

**Options:**

```ts
interface VoidReactOptions {
  react?: ReactPluginOptions; // passed through to @vitejs/plugin-react
  viewTransitions?: boolean; // enable View Transitions API for navigations
  prefetch?: {
    hoverDelay?: number;
    cacheFor?: number | string | [string, string];
  };
}
```

#### React Runtime

Imported from `"@void/react"`.

| Export                             | Description                                                                                                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Link`                             | React component for SPA navigation. Renders `<a>` for GET, `<button>` for non-GET methods. Props: `href`, `method`, `data`, `prefetch`, `cacheFor`, `preserveScroll`, `preserveState`, `replace`, `reloadDocument`, `viewTransition`, `onNavigate`. |
| `useRouter()`                      | Returns the Void Router with current route state (`url`, `path`, `query`, `params`) and navigation methods: `visit`, `refresh`, awaitable `prefetch`, `flush`, `flushAll`. React navigations are scheduled as transitions.                          |
| `useParams()`                      | Returns dynamic route params for the page currently being rendered.                                                                                                                                                                                 |
| `useNavigation()`                  | Returns pending navigation state: `{ state, location, method }`, where `state` is `"idle"`, `"loading"`, or `"submitting"` and `location` is the pending destination.                                                                               |
| `useForm(url, defaults, options?)` | Form helper hook. Returns `{ data, setData, post, put, patch, delete, pending, errors, error, hasChanges, wasSuccessful, recentlySuccessful, reset, clearErrors, clearError }`.                                                                     |
| `useIslandForm(defaults)`          | Form helper hook for island components where the action URL is inferred from the current island request. Returns the same form state and submit helpers as `useForm()`.                                                                             |
| `action(url, options?)`            | Awaitable one-shot page action helper. Uses `POST` by default and accepts `{ data, method, params }`, where `method` can be `"PUT"`, `"PATCH"`, or `"DELETE"`. Returns an `ActionResult`.                                                           |
| `useShared()`                      | Returns shared data injected by middleware via `c.set("shared", {...})`.                                                                                                                                                                            |
| `Deferred<T>`                      | React-only prop type for `defer()` results. It is `Promise<T>` and is consumed with React `use()`.                                                                                                                                                  |

React `Link` GET `data` is merged into the rendered `href` query string. Primitive values are serialized with `String(value)`, arrays become repeated keys, `null` and `undefined` are omitted, and nested objects throw. `prefetch` and `reloadDocument` are GET-only and throw for mutation links.

React deferred props returned from `defer()` are Suspense resources. Read them
with React's `use()` inside a `<Suspense>` boundary. React Pages requires React
19 and uses streaming SSR for the initial deferred shell. Rejections throw from
`use()`, so use a normal React error boundary for custom deferred error UI. Vue,
Svelte, and Solid keep the `{ loading, value, error }` deferred state object.
When explicitly annotating props, import `Deferred` from the framework adapter
package (`@void/react`, `@void/vue`, `@void/svelte`, or `@void/solid`) so the
type matches that adapter's client runtime shape.

### `@void/svelte`

#### `voidSvelte(options?)`

Imported from `"@void/svelte/plugin"`. Returns an array of Vite plugins that handle SSR and hydration entry generation for Svelte 5. It already includes `@sveltejs/vite-plugin-svelte`, so you do not need to install or configure that separately.

```ts
import { voidSvelte } from "@void/svelte/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidSvelte()],
});
```

**Signature:**

```ts
function voidSvelte(options?: VoidSvelteOptions): Plugin[];
```

**Options:**

```ts
interface VoidSvelteOptions {
  svelte?: SveltePluginOptions; // passed through to @sveltejs/vite-plugin-svelte
  viewTransitions?: boolean; // enable View Transitions API
  prefetch?: {
    hoverDelay?: number;
    cacheFor?: number | string | [string, string];
  };
}
```

#### Svelte Runtime

Imported from `"@void/svelte"`.

| Export                             | Description                                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Link`                             | Svelte component for SPA navigation. Renders `<a>` for GET, `<button>` for non-GET methods. Props: `href`, `method`, `data`, `prefetch`, `cacheFor`, `preserveScroll`, `preserveState`, `replace`, `reloadDocument`, `viewTransition`, `onNavigate`. |
| `useForm(url, defaults, options?)` | Form helper using Svelte 5 runes. Returns `{ data, post, put, patch, delete, pending, errors, error, hasChanges, wasSuccessful, recentlySuccessful, reset, clearErrors, clearError }`.                                                               |
| `useIslandForm(defaults)`          | Form helper for island components where the action URL is inferred from the current island request. Returns the same form state and submit helpers as `useForm()`.                                                                                   |
| `action(url, options?)`            | Awaitable one-shot page action helper. Uses `POST` by default and accepts `{ data, method, params }`, where `method` can be `"PUT"`, `"PATCH"`, or `"DELETE"`. Returns an `ActionResult`.                                                            |
| `useShared()`                      | Returns shared data injected by middleware via `c.set("shared", {...})`.                                                                                                                                                                             |
| `useRouter()`                      | Returns the Void Router with current route state (`url`, `path`, `query`, `params`) and navigation methods: `visit`, `refresh`, awaitable `prefetch`, `flush`, `flushAll`.                                                                           |
| `useParams()`                      | Returns dynamic route params for the page currently being rendered.                                                                                                                                                                                  |
| `useNavigation()`                  | Returns pending navigation state: `{ state, location, method }`, where `state` is `"idle"`, `"loading"`, or `"submitting"` and `location` is the pending destination.                                                                                |

Svelte `Link` GET `data` is merged into the rendered `href` query string. Primitive values are serialized with `String(value)`, arrays become repeated keys, `null` and `undefined` are omitted, and nested objects throw. `prefetch` and `reloadDocument` are GET-only and throw for mutation links.

### `@void/solid`

#### `voidSolid(options?)`

Imported from `"@void/solid/plugin"`. Returns an array of Vite plugins that handle SSR and hydration entry generation for Solid. It already includes `vite-plugin-solid`, so you do not need to install or configure that separately.

```ts
import { voidSolid } from "@void/solid/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidSolid()],
});
```

**Signature:**

```ts
function voidSolid(options?: VoidSolidOptions): Plugin[];
```

**Options:**

```ts
interface VoidSolidOptions {
  solid?: SolidPluginOptions; // passed through to vite-plugin-solid
  viewTransitions?: boolean; // enable View Transitions API
  prefetch?: {
    hoverDelay?: number;
    cacheFor?: number | string | [string, string];
  };
}
```

#### Solid Runtime

Imported from `"@void/solid"`.

| Export                             | Description                                                                                                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Link`                             | Solid component for SPA navigation. Renders `<a>` for GET, `<button>` for non-GET methods. Props: `href`, `method`, `data`, `prefetch`, `cacheFor`, `preserveScroll`, `preserveState`, `replace`, `reloadDocument`, `viewTransition`, `onNavigate`. |
| `useForm(url, defaults, options?)` | Form helper using Solid stores. Returns `{ data, setData, post, put, patch, delete, pending, errors, error, hasChanges, wasSuccessful, recentlySuccessful, reset, clearErrors, clearError }`.                                                       |
| `useIslandForm(defaults)`          | Form helper for island components where the action URL is inferred from the current island request. Returns the same form state and submit helpers as `useForm()`.                                                                                  |
| `action(url, options?)`            | Awaitable one-shot page action helper. Uses `POST` by default and accepts `{ data, method, params }`, where `method` can be `"PUT"`, `"PATCH"`, or `"DELETE"`. Returns an `ActionResult`.                                                           |
| `useShared()`                      | Returns shared data injected by middleware via `c.set("shared", {...})`.                                                                                                                                                                            |
| `useRouter()`                      | Returns the Void Router with current route state (`url`, `path`, `query`, `params`) and navigation methods: `visit`, `refresh`, awaitable `prefetch`, `flush`, `flushAll`.                                                                          |
| `useParams()`                      | Returns dynamic route params for the page currently being rendered.                                                                                                                                                                                 |
| `useNavigation()`                  | Returns pending navigation state: `{ state, location, method }`, where `state` is `"idle"`, `"loading"`, or `"submitting"` and `location` is the pending destination.                                                                               |

Solid `Link` GET `data` is merged into the rendered `href` query string. Primitive values are serialized with `String(value)`, arrays become repeated keys, `null` and `undefined` are omitted, and nested objects throw. `prefetch` and `reloadDocument` are GET-only and throw for mutation links.

## Markdown Package

The optional `@void/md` package adds Markdown pages to Pages Routing. Install it alongside a Pages adapter and add `voidMarkdown()` to your Vite plugins.

```ts
import { voidMarkdown } from "@void/md/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidReact(), voidMarkdown()],
});
```

| Import path                  | Contents                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `@void/md/plugin`            | `voidMarkdown(options?)`, `MarkdownOptions`, `MdPage`                                    |
| `@void/md`                   | `useFrontmatter()`, `FrontmatterContext`, `setFrontmatter()`, `MdPage`                   |
| `@void/md/pages`             | Generated metadata for Markdown pages, used for navigation, sidebars, and search indexes |
| `@void/md/theme.css`         | Full Markdown theme styles                                                               |
| `@void/md/theme-content.css` | Content-only Markdown styles for apps that provide their own shell/layout                |

See [Markdown Pages](../guide/pages-routing/markdown.md) for setup and framework-specific examples.

## User-Facing Imports

This table lists app-facing imports. Exported implementation subpaths such as `void/pages*`, `void/runtime/*`, and `void/remote*` are used by adapters, generated entries, or internal runtime wiring and are not documented as application APIs.

| Import path               | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `void`                    | `voidPlugin`, handler/type re-exports, `defer`, `Deferred`, `DeferredState`, `InferProps`, `HeadDescriptor`                                                                                                                                                                                                                                                                                                                                                                                                              |
| `void/handler`            | `defineHandler`, `defineMiddleware`, `basicAuth`, `defineScheduled`, `defineQueue`, `defineRender`, `defineHead`, types                                                                                                                                                                                                                                                                                                                                                                                                  |
| `void/auth`               | `defineAuth`, `getUser`, `getSession`, `requireAuth`, `AuthUser`, `AuthSession`, `AuthState`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `void/client`             | `fetch`, `fetchStream`, `FetchError`, `auth`, `createAuthClient`, `AuthUser`, `AuthSession`, `AuthState`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `void/client/{framework}` | Same as `void/client`, with framework-specific Better Auth clients for `react`, `vue`, `svelte`, and `solid`                                                                                                                                                                                                                                                                                                                                                                                                             |
| `void/ws`                 | `defineRoom`, `defineWebSocket`, `connect`, WebSocket context and connection types                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `void/sse`                | `eventStream`, `formatSse`, `formatSseText`, `getLastEventId`, `SseStreamClosedError`, SSE message and stream types                                                                                                                                                                                                                                                                                                                                                                                                      |
| `void/sse/client`         | `connectEventStream`, browser `EventSource` wrapper types                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `void/live`               | `defineLiveStream`, SSE topic fanout runtime types. Server-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `void/live/client`        | `connectLiveStream`, browser helper for one SSE connection plus POST subscribe/unsubscribe control.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `void/response`           | `convertReturnValue`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `void/validator`          | `runValidation`, `ValidatorSlots`, `HandlerInput`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `void/drizzle-zod`        | Re-exports [`drizzle-zod`](https://orm.drizzle.team/docs/zod) for schema-derived Zod validators for Drizzle tables                                                                                                                                                                                                                                                                                                                                                                                                       |
| `void/drizzle-valibot`    | Re-exports [`drizzle-valibot`](https://orm.drizzle.team/docs/typebox) for schema-derived Valibot validators for Drizzle tables                                                                                                                                                                                                                                                                                                                                                                                           |
| `void/drizzle-arktype`    | Re-exports [`drizzle-arktype`](https://orm.drizzle.team/docs/arktype) for schema-derived ArkType validators for Drizzle tables                                                                                                                                                                                                                                                                                                                                                                                           |
| `void/schema-d1`          | Re-exports [`drizzle-orm/sqlite-core`](https://orm.drizzle.team/docs/column-types/sqlite) for D1 table and column builders                                                                                                                                                                                                                                                                                                                                                                                               |
| `void/schema-pg`          | Re-exports [`drizzle-orm/pg-core`](https://orm.drizzle.team/docs/column-types/pg) for PostgreSQL table and column builders                                                                                                                                                                                                                                                                                                                                                                                               |
| `void/db`                 | `db` (Drizzle D1 or PostgreSQL instance for the active dialect), `createDb`, query operators (`eq`, `and`, `or`, `desc`, `like`, `inArray`, etc.)                                                                                                                                                                                                                                                                                                                                                                        |
| `void/seed`               | `defineSeed`, `SeedContext`, `SeedFn` for programmatic `void db seed` modules                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `void/kv`                 | `kv`, `createKV`, typed KV client/map types                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `void/storage`            | `storage`, `createStorage` for the inferred R2 binding or a specific `R2Bucket`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `void/ai`                 | `ai`, `VoidAi`, model input and response types                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `void/isr`                | `revalidate(options)` for on-demand ISR cache invalidation                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `void/log`                | `logger` structured logging helper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `void/routes`             | `RouteMap` and `WebSocketRouteMap` stubs (types only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `void/queues`             | `queues` proxy for sending messages to typed queues                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `void/sandbox`            | `getSandbox`, `sandbox`, `Sandbox`, and sandbox option types from the Cloudflare Sandbox SDK. `getSandbox(id)` resolves to the same Durable Object instance for a given `id` across all deploys and rollbacks. DO-level storage (`ctx.storage`) is durable; the container filesystem, processes, and exposed ports are tied to a single container lifetime and are lost on idle (`sleepAfter`, default `10m`), crash, or platform restart. See [Sandboxes › State persistence](../guide/sandboxes.md#state-persistence). |
| `void/env`                | `defineEnv`, `env`, schema helpers (`string`, `number`, `boolean`, `url`, `email`, `oneOf`, `json`), and global Cloudflare env types                                                                                                                                                                                                                                                                                                                                                                                     |
| `void/sveltekit`          | SvelteKit integration helpers: `withVoidTSConfig()` and `mergeVoidSvelteKitTsconfig()`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
