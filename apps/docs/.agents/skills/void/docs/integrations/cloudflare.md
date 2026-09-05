---
outline: deep
---

# Cloudflare

Void runs on Cloudflare Workers. This page covers how bindings work, how the plugin merges your wrangler config, and how to deploy directly to your own Cloudflare account.

## Bindings

Void automatically infers and provisions Cloudflare bindings (D1, KV, R2, AI, Queues) by scanning your source files. There are two ways to access them at runtime depending on your setup.

### Via Hono context (`c.env`)

In Void's default routing mode, route handlers and middleware receive a Hono `Context` object with bindings on `c.env`:

```ts
// routes/api/users.ts
import { defineHandler } from "void";

export const GET = defineHandler(async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM users").all();
  return c.json(results);
});
```

```ts
// routes/api/cache.ts
import { defineHandler } from "void";

export const GET = defineHandler(async (c) => {
  const value = await c.env.KV.get("key");
  return c.json({ value });
});
```

`c.env` is fully typed via `CloudContext` -- no manual type declarations needed.

### Via `cloudflare:workers` import

When using framework mode (TanStack Start or React Router), the framework owns routing and you access bindings through the `cloudflare:workers` module instead:

::: warning ⚠️ Cloudflare env access in meta frameworks
Some frameworks, like Nuxt and SvelteKit, do not run in workerd during dev and therefore do not support directly importing from `cloudflare:workers`.
:::

```ts
import { env } from "cloudflare:workers";

const result = await env.DB.prepare("SELECT * FROM users").all();
```

This also works in server functions:

```tsx
// src/routes/users.tsx (TanStack Start)
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

const getUsers = createServerFn().handler(async () => {
  const { results } = await env.DB.prepare("SELECT * FROM users").all();
  return results;
});

export const Route = createFileRoute("/users")({
  loader: () => getUsers(),
  component: UsersPage,
});
```

### TypeScript setup

Add `"void/env"` to your tsconfig `types` to get typed bindings on `env`:

```json
{
  "compilerOptions": {
    "types": ["void/env"]
  }
}
```

This augments the `Cloudflare.Env` interface with `DB`, `KV`, `STORAGE`, `AI`, and `QUEUE_*` and also pulls in `@cloudflare/workers-types`, so you don't need to add that separately.

### Available bindings

| Binding   | Type          | Trigger                                                         |
| --------- | ------------- | --------------------------------------------------------------- |
| `DB`      | `D1Database`  | `env.DB` / `c.env.DB` or `import from "void/db"`                |
| `KV`      | `KVNamespace` | `env.KV` / `c.env.KV` or `import from "void/kv"`                |
| `STORAGE` | `R2Bucket`    | `env.STORAGE` / `c.env.STORAGE` or `import from "void/storage"` |
| `AI`      | `Ai`          | `env.AI` / `c.env.AI` or `import from "void/ai"`                |
| `QUEUE_*` | `Queue<T>`    | `defineQueue()` or `import { queues } from "void/queues"`       |

Bindings are [inferred automatically](../reference/resource-inference.md) by scanning your source files for import and access patterns. You can also set them explicitly in `void.json`:

```json
{
  "inference": {
    "bindings": { "db": true, "kv": true, "storage": false, "ai": true }
  }
}
```

`db`, `kv`, and `storage` accept a string to customize the binding name (e.g. `"db": "MY_DB"`). `ai` only accepts a boolean.

See [Configuration](../reference/config.md) for details.

### Wrangler passthrough

You can set non-binding wrangler fields like `compatibility_date` and `compatibility_flags` in `void.json`:

```json
{
  "worker": {
    "compatibility_date": "2026-02-24",
    "compatibility_flags": ["nodejs_compat"]
  }
}
```

For environment variables, use `.env` files for local values and secrets. Void automatically loads `.env` files through Vite's `loadEnv` and merges them into the worker's `vars` bindings:

```bash
# .env
API_URL=https://api.example.com
```

Binding arrays such as `d1_databases`, `kv_namespaces`, and `r2_buckets` are not allowed in the `worker` field because Void manages bindings for you. If you need custom bindings with real resource IDs, add a `wrangler.jsonc` to the project root instead. See [Wrangler config merging](#wrangler-config-merging) for details.

For non-secret plain-text defaults, you can also set `worker.vars` in `void.json`. Values from `.env` files override `worker.vars`.

## Wrangler config merging

By default, Void configures the Cloudflare plugin programmatically, so you don't need a `wrangler.jsonc` for bindings. Void pins a Workers compatibility date in `void.json` `worker.compatibility_date`; if no date is already configured in `void.json` or `wrangler.jsonc`/`wrangler.json`, Void writes the latest known-good date to `void.json`. Bindings are inferred from your source code and provisioned with local placeholder IDs for development.

If you add a `wrangler.jsonc` (or `wrangler.json`) to your project root, Void respects it -- but **how** depends on whether Void owns the Cloudflare integration or a meta-framework does.

### Void-only mode and Vite-based frameworks

In Void's default mode and when using frameworks where Void controls the Cloudflare integration (TanStack Start, React Router), Void manages the `@cloudflare/vite-plugin` directly. It passes a `config` callback that merges inferred bindings into whatever the plugin resolves from your `wrangler.jsonc`:

1. The plugin reads your `wrangler.jsonc` and resolves it into a config object with `d1_databases`, `kv_namespaces`, `r2_buckets`, etc.
2. Void checks each inferred binding **by name** (e.g. `"DB"`, `"KV"`, `"STORAGE"`). If a binding with that name already exists in your config, it is left untouched.
3. Only bindings that are **missing** from your config are added with local placeholder IDs (e.g. `database_id: "local"`).
4. The merged config is used for both `vite dev` (Miniflare) and `vite build` (output `wrangler.json` in `dist/`).

All other fields in your `wrangler.jsonc` -- `name`, `routes`, `services`, `vars`, `env`, `compatibility_date`, etc. -- are preserved in the resolved config and flow through to the build output.

Fields that Void always sets (`main`, `triggers`, `assets`) don't need to be in your wrangler config -- they're added programmatically based on your project structure.

In this mode, Void does **not** modify your `wrangler.jsonc` file on disk. The merge is purely in-memory.

### Adapter-based frameworks (SvelteKit, Nuxt, Astro)

When using SvelteKit, Nuxt, or Astro, the framework's own Cloudflare adapter owns the worker build and dev server. Void does **not** provide `@cloudflare/vite-plugin` in that setup. It only contributes DB type codegen, migration management, and binding sync.

Because Void doesn't control the CF plugin in this mode, it can't merge bindings via a config callback. Instead, on dev startup Void syncs inferred bindings directly to your `wrangler.jsonc` file on disk:

- Only adds bindings that are **missing** by name -- existing bindings are never modified or removed.
- If `worker.compatibility_date` is set in `void.json`, syncs that date into wrangler config so the framework adapter reads the same value.
- Also ensures the `nodejs_als` compatibility flag is present.
- The framework adapter then reads this `wrangler.jsonc` normally.

This means your `wrangler.jsonc` is the single source of truth for bindings in this mode. Void keeps it up to date as you add new resource imports to your code, but you're responsible for replacing placeholder IDs with real ones before deploying.

### Merge precedence

| Source                     | Priority             | What it controls                                                    |
| -------------------------- | -------------------- | ------------------------------------------------------------------- |
| Your `wrangler.jsonc`      | Highest for bindings | Real resource IDs, service bindings, routes, vars, environments     |
| `void.json` `worker` field | Highest for compat   | `compatibility_date`, `compatibility_flags`, `vars`                 |
| Void inference             | Fills gaps only      | Adds placeholder bindings for inferred resources not in your config |

If no date is found in `void.json`, project wrangler config, or the supported generated build wrangler fallback during deploy, Void pins the latest known-good date to `void.json` and uses it for that run.

### Example

If your code uses `c.env.DB` and `c.env.KV`, and your `wrangler.jsonc` only defines D1:

```jsonc
{
  "name": "my-app",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-app-db",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
  ],
  // Service bindings, routes, etc. are also preserved
  "services": [{ "binding": "API", "service": "my-api-worker" }],
}
```

Void sees that `DB` is already configured and leaves it alone (including your real `database_id`), but adds a local placeholder for `KV` since it's missing. The `services` array passes through unchanged.

This means `pnpm dev` works out of the box (Miniflare creates local instances of all bindings), while `wrangler deploy` uses your real D1 database ID and service bindings.

### What ends up in the build output

After `vite build`, the Cloudflare Vite plugin writes a merged `wrangler.json` to the `dist/` directory. This file contains:

- All fields from your `wrangler.jsonc` (bindings with real IDs, routes, services, vars, environments)
- Any inferred bindings Void added (with placeholder IDs -- replace these before deploying)
- Fields set by Void (`main`, `assets`, `triggers`)

When you run `wrangler deploy`, it picks up this generated `wrangler.json` and deploys everything.

::: tip
When deploying via `void deploy` (to the Void platform), the `wrangler.json` in the build output is **skipped** -- the platform manages worker configuration via its own deploy manifest. The merge behavior described here only applies to direct `wrangler deploy`.
:::

## Deploy to your own Cloudflare account

Void's default deployment path is `void deploy`, which uploads to the Void platform. But the generated worker is a standard Cloudflare Worker -- you can deploy it directly to your own account. Two paths get you there:

- **[`void deploy --backend cloudflare`](#one-command-void-deploy-backend-cloudflare)** -- a first-class flow that provisions bindings, applies remote migrations, checks secrets, builds, and runs `wrangler deploy` for you.
- **[Manual `vite build && wrangler deploy`](#manual-build-and-deploy-with-wrangler)** -- create resources and edit `wrangler.jsonc` yourself, then build and deploy with wrangler directly.

Either way, the [Local development](#local-development), [AI](#ai-self-host), and [ISR](#isr-self-host) notes below apply.

### One command: `void deploy --backend cloudflare`

`void deploy --backend cloudflare` deploys the built worker to **your own** Cloudflare account. It uses your local wrangler auth and your root `wrangler.jsonc` -- there is no Void login or linked project.

```bash
# Deploy using the resources already declared in wrangler.jsonc
void deploy --backend cloudflare

# Create any missing resources first, then deploy
void deploy --backend cloudflare --provision
```

**Prerequisites**

- **Pin an account.** Set `account_id` in your root `wrangler.jsonc`, or export `CLOUDFLARE_ACCOUNT_ID`. A multi-account token otherwise makes wrangler prompt (or error in CI), which Void cannot intercept -- so the account must be pinned first.
- **Authenticate wrangler.** Run `wrangler login`, or set `CLOUDFLARE_API_TOKEN`. Deploy needs a token with `Workers Scripts:Edit` plus read on the resources you bind. `--provision` additionally needs per-product `*:Edit` (D1, KV, R2, Queues, Hyperdrive).
- **`CLOUDFLARE_API_TOKEN` is required to provision a Hyperdrive config for the first time.** `wrangler login` covers every other resource, but wrangler exposes no machine-readable Hyperdrive list, so Void checks whether the config already exists over the Cloudflare REST API -- which an OAuth session cannot authenticate. Without a token `--provision` stops **before** touching your account rather than risk minting a duplicate config. Either export `CLOUDFLARE_API_TOKEN` (with Hyperdrive edit permission), or create the Hyperdrive config yourself and add its id to the `hyperdrive` binding in `wrangler.jsonc` -- deploying an **already-provisioned** Hyperdrive app needs no token and works under `wrangler login` alone.
- **Docker**, if your app uses the sandbox -- the build needs it locally.

**What it does** (in order): settles the app class (a full Void app on the Cloudflare Workers target -- see [scope](#scope-and-limitations)) before any account operation; pins the account and confirms wrangler auth; provisions or drift-checks resources; **builds**; then, against the artifact the build actually emitted, warns on plaintext vars, gates on missing required secrets, checks the auth schema, and validates migrations; then applies remote D1 migrations for SQLite apps (and verifies none remain pending); then runs `wrangler deploy` on exactly the artifact it verified.

Note that **the build runs before the secret, auth-schema, and migration gates** -- those gates read the real emitted worker, so there has to be one to read. A missing production secret or a bad migration is therefore reported _after_ the build has run, which is worth knowing if your build hooks are slow or have side effects. In exchange, nothing remote is touched until every ground-truth gate has passed: remote D1 migrations are applied only afterwards, so a failed gate leaves your account, your database, and your live worker exactly as they were.

**Trust boundary: the build runs your project's code.** Exactly like the manual `vite build && wrangler deploy` below, this backend runs your project's build -- your config, every Vite plugin, and every build dependency -- with filesystem access before the credentialed deploy. Deploy narrows what that build can quietly change: it runs the build with your Cloudflare credentials scrubbed, verifies the emitted `wrangler.json` against a pre-build snapshot of your account, name, and binding identities, and checks that the wrangler CLI it is about to run with your token was not modified during the build. Those checks catch a build that tampers with the deploy target or the uploader. They do not sandbox the build itself, so a fully-compromised build dependency remains a trust boundary -- the same one you accept running `vite build` by hand. Vet your dependencies as you would for any deploy; stronger build isolation is future work.

Without `--provision`, deploy is a **drift check**: if a binding your source needs is not yet in `wrangler.jsonc` with a real id, deploy stops and names each missing resource, telling you to run `--provision` once. Queues carry no id in the config, so deploy instead checks each one against your account (`wrangler queues info`) at the same point -- a queue that does not exist stops the deploy before anything is built or migrated.

**`--provision`** creates any D1 database, KV namespace, R2 bucket, Queues, Hyperdrive config, and the ISR cache namespace your source needs, then lets wrangler write the real ids into your root `wrangler.jsonc`. It is **idempotent** -- it reads existing ids first, so re-running creates nothing that already exists.

#### Scope and limitations

- **Supported apps (v1): full Void apps on the Cloudflare Workers target only** -- worker-bearing apps that run Void's routing (`routes/` and/or `pages/`), with D1 (SQLite) and/or KV, R2, Queues, and Hyperdrive, plus auth on D1/SQLite and ISR. Everything else fails closed **before** any account operation, with guidance:
  - **Framework SSR is not supported here (yet).** The whole framework path -- TanStack Start, React Router, vinext (and SvelteKit, Nuxt, Analog, Astro) -- is deferred in v1. Deploy them with `void deploy` (the managed platform) or the framework's own Cloudflare adapter. Framework SSR support for this backend is a follow-up.
  - **Static-only / SPA / SSG apps are not supported here** -- including unconfigured ones, `output: "static"` in `void.json`, and `--dir` / `--spa` deploys. Deploy those with `void deploy` (the managed platform) or host the built assets on Cloudflare Pages / any static host.
  - **WebSocket / Durable Object routes (`*.ws.ts`) are not supported here (yet).** A WebSocket route makes the build emit a key-value-backed Durable Object namespace (a `new_classes` migration), which a fresh Cloudflare account -- and every Workers Free account -- refuses to create. Deploy those with `void deploy`. SQLite-backed WebSocket support for this backend is a follow-up.
  - **Custom `migrations_pattern` is not supported here.** v1 deploys only Void's default migration convention -- `db/migrations/*.sql` with wrangler's default pattern (leave `migrations_pattern` unset). Remove a custom `migrations_pattern` from the D1 binding, or deploy with `void deploy`. Supporting custom patterns is a follow-up.
  - **Non-Cloudflare targets (`node` / `bun` / `deno`) are not supported here** -- this backend deploys Cloudflare Workers only.
  - **`--skip-build` is not supported here.** Every check on this path validates the artifact the build emits -- the worker `vars` in `dist/ssr/wrangler.json` and the generated auth schema -- so skipping the build would leave them reading a stale or missing artifact instead of the worker being uploaded. Drop `--skip-build`, or use `void deploy` (the managed platform), which supports it.
  - **PostgreSQL apps with auth enabled are not supported here.** This backend verifies + applies auth tables through remote D1 (SQLite) migrations only, so it cannot provision or verify the Better Auth schema on Postgres/Hyperdrive. Deploy with `void deploy`, or use D1 for the auth app.
  - **PostgreSQL apps with checked-in migrations are not supported here.** This backend applies only remote D1 (SQLite) migrations. A PostgreSQL app's `db/migrations/*.sql` are applied over Hyperdrive by the managed platform (`void deploy`) at deploy time; this self-host backend never runs them, so it would deploy against an unmigrated database. Deploy with `void deploy`, or apply the migrations yourself against your Postgres and remove them from `db/migrations/`. (A pg app _without_ auth **and** with an externally-managed schema — no checked-in migrations — still deploys.)
- **Auth requires checked-in migrations that produce the Better Auth schema.** The managed platform creates the Better Auth tables at runtime after deploy; this self-host backend never runs that step. Deploy reads the required Better Auth schema from the one the build itself generated (`.void/better-auth-schema.ts`, so configured renames and plugin tables are already reflected), then verifies the checked-in `db/migrations/*.sql` produce it by applying them to an in-memory SQLite database. Names alone are not enough: it also checks the constraints that carry correctness -- every auth table's `id` must be uniquely constrained (a `PRIMARY KEY` or a `UNIQUE` constraint/index; SQLite refuses a foreign key whose parent key is not unique, failing at runtime with `foreign key mismatch`), every field the schema marks `unique` must be covered by a unique constraint (a column-level `UNIQUE` or a single-column unique index both count, under any index name), and every field with a `references` target must have a matching foreign key. Column types, non-unique indexes and the exact `ON DELETE` action are deliberately not asserted. If a check fails, deploy fails closed naming the offending `table.column` -- fix the schema in `db/schema.ts` (Drizzle's `.primaryKey()`, `.unique()` and `.references()` are opt-in), run `void db generate`, commit the migration, or deploy with `void deploy`.
- **Migrations must apply in the same order Void validated.** Deploy checks that the files wrangler will apply to remote D1 (and the order it applies them, by numeric prefix) exactly match Void's `db/migrations/*.sql` set -- no stray files (e.g. `seed.sql`), same content, same order. Zero-pad your migration prefixes (`0001_`, `0002_`, ...) so numeric and lexicographic order agree; deploy fails closed on a mismatch.
- **Provision is a single-operator, dev-machine action.** The lock guarding it is per local config path only; it does not coordinate across machines or CI hosts. Two people provisioning the same account at once could create duplicate resources.
- **Provision fails closed in CI.** In non-interactive shells, `--provision` is disabled unless your committed `wrangler.jsonc` already covers every resource (a provable no-op). The workflow is: provision **locally**, commit the updated `wrangler.jsonc`, then let CI run `void deploy --backend cloudflare` (deploy itself is CI-safe).
- **Your `wrangler.jsonc` is rewritten on provision.** Wrangler preserves your comments but normalizes the whole file's indentation when it writes the new ids -- expect that in the diff.
- **Your `.env*` values ship as plaintext.** The build bakes them into the worker's `vars`. This backend runs Vite's production env loading, so **all four** of `.env`, `.env.local`, `.env.production` and `.env.production.local` are loaded and shipped -- including the `.local` files, which are gitignored but **not** deploy-excluded here (unlike managed `void deploy`, which reads only `.env` and `.env.production`). The one exception: a value that is also present in the shell environment with the same value is stripped back out, so a var you `export` in CI does not get baked in. Move real secrets to `wrangler secret put <NAME>` so they are never written into `wrangler.json`. Deploy warns on likely-plaintext secrets -- by key name, and by value shape for credential-bearing connection URLs such as `DATABASE_URL` -- and hard-blocks on missing required secrets.
- **First deploy of a new worker.** A worker that has never been deployed has no remote secrets to list yet, so the secret gate prints the still-unset required key names and the `wrangler secret put <NAME>` commands that bootstrap them on the draft worker (or add a value to `.env` / `.env.production` and rerun).

The manual steps below are the by-hand equivalent -- reach for them when you want to manage resources and `wrangler.jsonc` yourself.

### Manual: build and deploy with wrangler

Prefer to manage everything by hand? Create the resources, write `wrangler.jsonc`, and run `wrangler deploy` yourself.

#### 1. Create your resources

Create whatever bindings your app uses:

```bash
# D1 database
wrangler d1 create my-app-db

# KV namespace
wrangler kv namespace create KV

# R2 bucket
wrangler r2 bucket create my-app-storage
```

#### 2. Add a `wrangler.jsonc`

Create `wrangler.jsonc` in your project root with the resource IDs from step 1:

```jsonc
{
  "name": "my-app",
  "compatibility_date": "2026-02-24",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-app-db",
      "database_id": "<your-database-id>",
      "migrations_dir": "./db/migrations",
    },
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "<your-namespace-id>",
    },
  ],
  "r2_buckets": [
    {
      "binding": "STORAGE",
      "bucket_name": "my-app-storage",
    },
  ],
}
```

Only include the bindings your app actually uses. You can also add service bindings, custom routes, environment overrides, and any other standard wrangler fields -- they all flow through to the build output. You don't need `main` or `assets` -- those are set by the plugin.

#### 3. Run migrations

If your app uses D1, apply migrations before deploying:

```bash
wrangler d1 migrations apply my-app-db --remote
```

This uses the same `db/migrations/` directory that Void uses locally. `my-app-db` is the database name from your `wrangler.jsonc`; using the database name avoids accidentally applying migrations to the wrong binding.

#### 4. Build and deploy

```bash
vite build && wrangler deploy
```

That's it. The Cloudflare Vite plugin produces a complete build output with a merged `wrangler.json` in the dist directory (containing your real resource IDs and any inferred bindings), and `wrangler deploy` picks it up.

### Local development

`pnpm dev` continues to work as before -- Miniflare creates local instances of all bindings regardless of the IDs in your `wrangler.jsonc`. Your real resource IDs are only used when you run `wrangler deploy`.

### AI (self-host)

`void/ai` works on your own Cloudflare account, along two paths:

- **Workers AI** (`ai.run`, `ai.stream`, `ai.image`) works out of the box. When your app imports `void/ai`, `vite build` infers that you need AI and adds a Workers AI binding (`env.AI`) to the generated `wrangler.json` automatically -- you do **not** add it to `wrangler.jsonc`.
- **Provider models** (`ai.provider("openai").fetch(...)`) route through _your own_ Cloudflare AI Gateway. Set its id in `void.json` and add the provider's API key as a Worker secret.

```jsonc
// void.json
{
  "ai": {
    "gateway": "my-gateway", // an AI Gateway in YOUR Cloudflare account
  },
}
```

```bash
# provider API key, stored as a Worker secret (never committed)
wrangler secret put OPENAI_API_KEY
```

```ts
// routes/chat.ts
import { defineHandler } from "void";
import { ai } from "void/ai";

export const POST = defineHandler(async (c) => {
  // Workers AI -- uses env.AI directly
  const summary = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt: "Summarize the changelog.",
  });

  // Provider model -- routes through your "my-gateway" AI Gateway,
  // authed with the OPENAI_API_KEY secret above
  const res = await ai.provider("openai").fetch("chat/completions", {
    method: "POST",
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [] }),
  });

  return c.json({ summary, provider: await res.json() });
});
```

`ai.gateway` is required for `ai.provider().fetch()` -- without it, that call returns a `501`. No AI traffic or provider secret passes through Void's shared proxy: requests go directly to _your own_ Cloudflare AI Gateway, authenticated with provider secrets from _your_ Worker's environment. (The request and that secret are of course still sent onward to the AI Gateway and the upstream provider you call.)

Notes:

- **No cross-tenant usage metering.** On the Void platform, AI calls are metered and billed through a shared proxy. Self-hosted, there is no metering -- you get your own [Cloudflare AI Gateway analytics](https://developers.cloudflare.com/ai-gateway/) instead.
- **The runtime reads the `env.AI` binding by name** -- a custom-named root AI binding is not supported.
- **`void dev` has no local Workers AI emulation.** In development, AI still routes through Void, so `void dev` AI requires `void auth login` even when you deploy self-hosted.

### ISR (self-host)

[Revalidation (ISR)](../guide/edge/revalidation.md) works self-hosted, but the cache KV is **not** auto-injected (a KV binding needs a real namespace id). Create a namespace and bind it as `ISR_CACHE`:

```bash
wrangler kv namespace create ISR_CACHE
```

```jsonc
// wrangler.jsonc
{
  "kv_namespaces": [
    {
      "binding": "ISR_CACHE",
      "id": "<your-namespace-id>",
    },
  ],
}
```

Configure revalidation exactly as on the platform -- globally or per-path in `void.json`:

```jsonc
// void.json
{
  "routing": {
    "revalidate": { "/blog/*": 3600, "*": 60 },
  },
}
```

...or per page with an exported `revalidate` literal in a `.server.ts` companion (Pages mode):

```ts
// pages/blog/[slug].server.ts
export const revalidate = 3600; // seconds
```

On-demand purges work through `revalidate()`:

```ts
import { revalidate } from "void/isr";

await revalidate({ paths: ["/blog/hello"] });
// or purge every ISR page:
await revalidate({ all: true });
```

Self-hosted, `revalidate()` purges this worker's own KV entries (global, authoritative) plus the current colo's edge cache.

Limits (the single-worker cache ladder can't do everything the platform's dispatch layer does):

- **No fleet-wide / cross-colo edge purge.** `revalidate()` clears KV globally and the _local_ colo's edge cache; other colos keep serving their edge copy until it expires (bounded by the response's `s-maxage`), then re-render on the next edge miss.
- **The pages-protocol JSON variant is not served from a cold colo's KV.** A colo that hasn't rendered the HTML yet re-renders the JSON live; the JSON edge cache is warmed only as a side effect of the HTML render path.
- **The warm cache is dropped on every redeploy.** Each `vite build` bakes a fresh deployment id into the cache keys, so cached HTML never outlives the hashed assets it references -- the first request after a deploy is a cold render.
