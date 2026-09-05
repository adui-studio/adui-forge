---
name: migrate-cloudflare-to-void
description: Migrate an existing Vite app using @cloudflare/vite-plugin to Vite + void. Use when a project already runs on Cloudflare Workers but needs Void file-based routes, inferred bindings, and void deploy workflow.
---

# Migrate Vite + Cloudflare Plugin to Void

## When to use

Use this skill when the user has an existing Vite app with `@cloudflare/vite-plugin` and wants to migrate to `void` with minimal breakage.

Do not use this for greenfield apps started via `npm install -D void` + `npx void init`.

## Inputs to gather first

Read these files before editing:

- `package.json`
- `vite.config.*`
- `wrangler.jsonc` (if present)
- Current worker entrypoint (`src/worker.*`, `src/index.*`, etc.)
- Any existing API handlers and migration SQL files

Confirm:

- existing routes/endpoints and HTTP methods
- bindings currently used (`DB`, `KV`, `R2`, etc.)
- whether the app uses framework SSR or only SPA + API

## Migration workflow

1. Update dependencies

- Remove `@cloudflare/vite-plugin` if it is only used for runtime/deploy.
- Add `void`.
- Keep existing framework plugins (React/Vue/Svelte/etc.).

2. Update Vite config

- Replace `cloudflare(...)` plugin usage with `voidPlugin()`.
- Keep plugin order stable unless there is a known conflict.
- Keep unrelated Vite settings unchanged.

Target shape:

```ts
import { defineConfig } from "vite";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin()],
});
```

3. Migrate API surface to file-based routes

- Create `routes/` if missing.
- Convert each existing endpoint into route files:
  - `routes/api/users.get.ts`
  - `routes/api/users.post.ts`
  - `routes/api/users/[id].get.ts`
- Use `defineHandler` from `void`.
- If there is shared logic, move it into regular modules and import from route files.

4. Migrate middleware

- Move request-wide middleware to `middleware/*.ts`.
- Export with `defineMiddleware`.
- Preserve behavior order by filename prefix when needed (`01.auth.ts`, `02.logger.ts`).

5. Preserve bindings with Void conventions

- Keep Cloudflare-style uppercase names on `c.env` (`DB`, `KV`, `STORAGE`, etc.).
- Remove manual binding config from Vite plugin config where Void now infers usage.
- Ensure route code actually references required bindings so inference can detect them.

6. Migrations

- Place SQL files in `migrations/` (sorted by filename).
- Keep destructive operations gated by explicit pragma if needed.
- If old migrations live elsewhere, copy/rename into this directory with stable ordering.

7. Deploy workflow migration

- Replace old deploy instructions with:
  - `void auth login`
  - `void deploy`
- If CI must target a specific project, use:
  - `void deploy --project <slug>`
  - or `VOID_PROJECT=<slug> void deploy`

8. Post-migration cleanup (remove obsolete Wrangler wiring)

- If the app no longer uses direct Wrangler workflows, remove `wrangler.jsonc`.
- Remove direct `wrangler` dependency/devDependency from `package.json` when it is only used for old deploy/dev scripts.
- Remove or rewrite npm scripts that call `wrangler` directly (for example old deploy/publish scripts).
- Keep Wrangler only if the project still has explicit non-Void workflows that require it.

## Routing behavior reference (use during file conversion)

Apply these filename rules exactly when mapping old handlers to `routes/`:

1. Extension and suffix parsing order

- Strip extension (`.ts`, `.js`, `.mts`, `.mjs`).
- Strip env suffix (`.dev`, `.prod`).
- Strip HTTP method suffix (`.get`, `.post`, `.put`, `.delete`, `.patch`).
- Strip trailing `index` segment.
- Remove route group segments `(group-name)` from URL path.

2. Method mapping

- `users.get.ts` matches only `GET /users`.
- `users.post.ts` matches only `POST /users`.
- `users.ts` matches all methods.
- Split multi-method handlers into one file per method when preserving behavior matters.

3. Dynamic and catch-all params

- `[id]` -> `:id`
- `[...slug]` -> catch-all named param
- `[...]` -> catch-all unnamed fallback
- Use folder nesting for multiple params: `routes/api/org/[org]/repo/[repo].get.ts`.

4. Route groups and organization

- Directories like `(internal)` are for code organization only and do not appear in URL.
- Use them when reorganizing large route sets without changing public paths.

5. Ignored files

- Files or directories starting with `_` are ignored by route scanner.
- Do not place active handlers under `_legacy`, `_draft`, etc.

6. Middleware behavior

- Middleware files live in `middleware/` and run in filename order.
- Prefix numerically if order is important (`01.auth.ts`, `02.logger.ts`).

7. Concrete mapping examples

- `src/worker.ts` handling `GET /api/users/:id` -> `routes/api/users/[id].get.ts`
- single handler switching on method for `/api/users` -> `routes/api/users.get.ts` and `routes/api/users.post.ts`
- legacy `GET /health` endpoint -> `routes/health.get.ts`

## Verification checklist

Run and validate:

1. `npm run dev` (or project dev command)
2. Exercise representative API routes locally.
3. `npm run build`
4. `void deploy` and verify live URL responds.
5. Confirm no deploy-critical scripts still depend on `wrangler`.

In the Void deploy output, verify:

- worker modules uploaded
- static assets uploaded
- migrations applied (if present)

## Common migration pitfalls

- Importing from the main `void` runtime in worker route files when a lighter handler import is expected by tooling.
- Forgetting to split method-specific handlers (`GET`/`POST`) into filename suffixes.
- Keeping old custom worker entry wiring that conflicts with generated route runtime.
- Binding names changed to lowercase (`db`) instead of expected uppercase (`DB`), breaking inference/provisioning.

## Deliverable format

When applying this migration, produce:

1. A change summary grouped by config/routes/migrations/CI.
2. A list of moved or newly created route files.
3. Exact commands to run locally and in CI.
