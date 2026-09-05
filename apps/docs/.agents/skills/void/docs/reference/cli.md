---
outline: deep
---

# CLI

`void` is a local binary from the installed `void` package.

Use this page as a command reference. If you are setting up a project for the first time, start with [Quickstart](../guide/quickstart.md) and come back here when you need exact command behavior or flags.

## Cheat Sheet

| Command                           | Purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `void deploy`                     | Build and deploy to Void                                            |
| `void prepare`                    | Generate `.void` artifacts without starting Vite                    |
| `void gen model <name> [cols...]` | Scaffold migration + CRUD routes                                    |
| `void gen route <path>`           | Create an API route                                                 |
| `void db push`                    | Apply schema directly without migration files                       |
| `void db generate`                | Generate SQL migrations from schema changes                         |
| `void db status`                  | Show local/remote migration status                                  |
| `void db reset`                   | Drop and re-apply all migrations                                    |
| `void db seed`                    | Reset + seed local database                                         |
| `void db execute <sql>`           | Run SQL against the database (--remote for deployed)                |
| `void db studio`                  | Open Drizzle Studio (--remote for the deployed PostgreSQL database) |
| `void secret put <name=value>`    | Set a production secret                                             |
| `void secret list`                | List production secrets                                             |
| `void secret sync .env.local`     | Bulk upload secrets from dotenv file                                |
| `void env check [--remote]`       | Validate env.ts schema                                              |
| `void env types`                  | Regenerate .void/env.d.ts from env.ts                               |
| `void env example`                | Refresh the void-managed block in .env.example                      |
| `void auth login`                 | Authenticate with Void                                              |
| `void project link`               | Link directory to a project                                         |
| `void project logs`               | Show runtime logs from deployed project                             |
| `void project requests`           | Show request-level traffic (status, method, timing)                 |
| `void project rollback`           | Roll back to a previous deployment                                  |
| `void project cancel`             | Cancel an active deployment                                         |
| `void project purge-cache`        | Purge all cached pages                                              |
| `void build logs`                 | Stream, tail, or download build logs                                |
| `void mcp`                        | Start the Void MCP server                                           |
| `void init`                       | Setup wizard for new or existing projects                           |

## Binary Invocation

Outside npm scripts, invoke `void` with `npx`, `pnpm`, `yarn`, or `bunx`. For readability, the docs show unprefixed `void` commands. In practice, you still need a binary runner unless the executable is already on your `PATH`.

Alternatively, you can add `./node_modules/.bin` to your `PATH` so that you can invoke `void` directly when you are in the root directory of your app.

:::warning ⚠️ Prefer local install
We do not recommend installing `void` globally, because the CLI needs to be in sync with same version of the runtime framework. Always install `void` locally as a dev dependency of your project.
:::

## Help

```
void --help
void help
void help <command>
void help <group> <command>
void <command> --help
void <group> <command> --help
void <group> help <command>
```

Use `void --help` or `void help` for the top-level command list. Every command and grouped subcommand has a focused help page, so `void deploy --help`, `void help db execute`, and `void db help execute` all print command-specific usage before any command validation or network/auth work runs.

## Setup

### `void init`

```
void init [--tsconfig] [--github] [--agents]
```

Setup wizard for Void projects (new or existing).

If run in a scaffoldable empty directory, `void init` scaffolds a Pages starter. It asks which scaffold toolchain to use, with Vite+ as the default top option and plain Vite as the alternative. If a single Pages adapter is already installed, it reuses that framework; otherwise it asks which framework to scaffold (React, Vue, Svelte, or Solid). It then asks which starter you want: D1, PostgreSQL, or Static Pages. The D1 and PostgreSQL starters write a framework-specific `vite.config.ts`, a `pages/` home page plus `.server.ts` loader, `db/schema.ts`, `db/seed.ts`, a generated initial migration under `db/migrations/`, and `routes/api/hello.ts`. The Static Pages starter writes just the framework-specific `vite.config.ts` and a `pages/` home page so you can add server features later. Vite+ starters add `vite-plus` and use `vp dev`, `vp build`, and `vp preview` scripts.

If run in a non-empty folder that does not look like an app yet, such as a parent `Projects/` folder with subdirectories but no `package.json`, `void init` asks whether to create a new subfolder or continue in the current folder. Creating a subfolder is the default selection.

If run in an existing project, `void init` configures the project in place: it ensures `void` and `vite` are declared, adds missing `dev` (`vite`) and `build` (`vite build`) scripts without overwriting existing scripts, and creates or patches `vite.config.*` with `voidPlugin()` when the config shape is safe to edit. If the Vite config is too dynamic to patch confidently, it prints the manual snippet instead of rewriting it.

After that, the full interactive flow walks through:

1. **TypeScript:** creates or updates `tsconfig.json`, including `extends .void/tsconfig.json`, `void/env` types, and root-level `files` / `compilerOptions.paths` merges when an existing config would otherwise replace Void's generated entries.
2. **Database:** asks whether you want D1, PostgreSQL, or no database yet. Choosing PostgreSQL writes `"database": "pg"` to `void.json`; D1 stays implicit; choosing no database leaves config unchanged so you can add data features later.
3. **Agent instructions:** detects agents once and injects instructions into `CLAUDE.md` or `AGENTS.md`.
4. **Skills:** links Void skills using the same detected or selected agent context.
5. **MCP config:** writes MCP server config using that same agent context.
6. **Demo code:** for existing non-Pages projects, optionally scaffolds a `db/migrations/` directory plus an API route and typed fetch example.
7. **GitHub Actions:** optionally creates `.github/workflows/void-deploy.yml`. The workflow deploys on pushes to `main` and authenticates via [GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) — no long-lived `VOID_TOKEN` secret is stored in the repo. The workflow is a single `void deploy` step: when it runs in GitHub Actions, `void deploy` mints an OIDC token (audience `void`), exchanges it at `POST $VOID_API_URL/auth/github-oidc` for a short-lived project-scoped deploy token, and deploys. `permissions: id-token: write` is retained so the CLI can mint that token. The project slug is baked in from your linked project (`.void/project.json`) when known; otherwise the workflow reads a `VOID_PROJECT` repository variable.
8. **`env.ts` scaffold:** if the project has no `env.ts` but has `.env` / `.env.example` / `.env.local` / `.env.development*` files on disk, generates an `env.ts` pre-populated with their keys. Values get conservative type inference (`boolean`/`url`/`number`/`string`) — the file carries a banner nudging you to tighten anything the heuristic got wrong.
9. **Project setup:** optionally logs you in, lets you select or create a project, and writes `.void/project.json` so your first deploy can just be `void deploy`.

If no agent is detected, `void init` asks you to choose one from a short list (Claude, Cursor, Codex, Gemini CLI, Generic). That single choice is reused across all agent steps.

Use flags to run individual steps without prompts:

| Flag         | Purpose                                           |
| ------------ | ------------------------------------------------- |
| `--tsconfig` | Only update `tsconfig.json`                       |
| `--agents`   | Set up agent instructions, skills, and MCP config |
| `--github`   | Only create the GitHub Actions deploy workflow    |

Flags can be combined. When any flag is provided, only the specified steps run and interactive prompts are skipped.

The `--github` workflow uses GitHub OIDC: you connect the repository to your Void project once with `void github connect <project> --repo <owner/repo> --executor github_actions` (see the GitHub section below), and pushes to `main` deploy automatically. There is no `VOID_TOKEN` secret to create or rotate. To target staging, set a `VOID_API_URL` repository variable to `https://api.staging.void.cloud`.

For projects that already have `"extends"`, `void init --tsconfig` preserves the existing config and adds `./.void/tsconfig.json`. If the existing config defines `files` or `compilerOptions.paths`, Void also merges its generated declaration files and aliases into the root config because TypeScript replaces those fields across `extends` instead of deeply merging them.

### `void prepare`

```
void prepare
```

Generates the project-local `.void/` artifacts used by TypeScript and runtime codegen without starting `vite dev` or running a full `vite build`.

This is the intended command for CI, fresh clones, editor bootstrap, and any workflow that needs `routes.d.ts`, `db.d.ts`, `queues.d.ts`, `env.d.ts`, and `.void/tsconfig.json` in place before typechecking.

## Auth

### `void auth login`

OAuth login. You choose GitHub or Google at the prompt, and the token is saved to `~/.void/config.json`.

This is optional if you already completed auth during the interactive `void init` flow.

### `void auth logout`

Removes saved credentials.

### `void auth whoami`

Prints your current login.

### `void auth token`

Copies your auth token to the system clipboard. Useful for setting up CI secrets.

## Project commands

### `void project status [name]`

Show the last 5 deployments for a project.

- If `[name]` is provided, looks up the project by slug
- Otherwise uses the linked project from `.void/project.json`

### `void project link [name]`

Link current directory to an existing project by slug, or select interactively if omitted. State is stored in `.void/project.json`.

### `void project list`

List all your projects (slug, mode, URL).

### `void project logs`

```
void project logs [--level <level>] [--filter <text>] [--range <duration>] [--deployment <id>]
```

Show runtime logs from the deployed project. Uses the linked project from `.void/project.json`.

| Flag                 | Purpose                                                                                                                                                                                                         | Default |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `--range <duration>` | How far back to look. Format: `<number><unit>` (m/h/d). Max 7d.                                                                                                                                                 | `1h`    |
| `--level <level>`    | Filter by log level. One of `error`, `warn`, `info`, `log`, `debug`, `all`. `error` also includes uncaught exceptions, non-`ok` outcomes, and any 5xx response — even when the worker neither threw nor logged. | `all`   |
| `--filter <text>`    | Case-insensitive **substring** match against log message text and exception name/message — not a level filter. Shows the full request entry on any hit.                                                         | none    |
| `--deployment <id>`  | Filter logs to a specific deployment ID.                                                                                                                                                                        | none    |

Output shows one line per request (`HH:MM:SS METHOD URL STATUS`) with indented console log and exception lines beneath. Errors and exceptions are colored red, warnings yellow.

Examples:

```
void project logs --level error --range 12h
void project logs --level error --filter websocket
```

Tip: `void project logs` only sees what Cloudflare Tail captures — top-level `console.*` calls and uncaught throws. Application errors caught and persisted to your own DB are invisible to tail. Surface them via `console.error(...)` or `void/log`'s `logger.error(...)` so they show up under `--level error`. For 5xx that never reach your worker at all (edge-router errors, static/SPA projects), use `void project requests --status 5xx`.

### `void project requests`

```
void project requests [--status <filter>] [--range <duration>]
```

Show request-level traffic recorded at the edge for the linked project: one line per request with time, method, HTTP status, request type, and server timing. Unlike `void project logs` (which only has rows for invoked user workers), this reads the edge request-metering data, so it also surfaces:

- **5xx the edge router generated itself** — missing deployment manifest, static-asset read timeouts, SSR dispatch timeouts — which never invoke your worker and so never appear in logs.
- **Requests to static/SPA projects**, which are served directly from storage and never run a worker.

| Flag                 | Purpose                                                                                       | Default |
| -------------------- | --------------------------------------------------------------------------------------------- | ------- |
| `--status <filter>`  | Filter by status: a class (`2xx`, `3xx`, `4xx`, `5xx`) or an exact 3-digit code (e.g. `500`). | none    |
| `--range <duration>` | How far back to look. Format: `<number><unit>` (m/h/d). Max 7d.                               | `1h`    |

Output shows one line per request (`HH:MM:SS METHOD STATUS TYPE DURATION`). 5xx are colored red, 4xx yellow. Note: request paths are not recorded, so this view shows status and type rather than URLs — use `void project logs` for per-URL, per-log detail on requests that do reach your worker.

Examples:

```
void project requests --status 5xx
void project requests --range 24h
```

### `void project rollback [deployId]`

```
void project rollback [deployId]
```

Roll back to a previous deployment. Traffic instantly switches to the target deployment's worker script via KV routing update.

- If `[deployId]` is omitted, shows an interactive select menu of retained deployments
- If the target deployment has fewer applied migrations than the current one, a warning is shown listing the migration diff before confirmation

Only **retained** deployments can be rolled back to. The number of retained deployments depends on your plan (free: 1, solo: 5, pro: 25, unlimited for sponsored/custom).

### `void project cancel [deployId]`

```
void project cancel [deployId]
```

Cancel an active deployment.

- If `[deployId]` is omitted, shows an interactive select menu of active deployments for the linked project
- If `[deployId]` is provided, cancels that deployment directly

### `void project delete [name]`

Permanently delete a project and all its resources (databases, KV namespaces, R2 buckets, deployments). Requires typing the project slug to confirm.

If `[name]` is omitted, uses the linked project.

### `void project purge-cache`

```
void project purge-cache [--project <name>]
```

Purge all cached pages for the linked project. The edge cache will clear within seconds.

If `--project` is provided, purges that project's cache instead of the linked project.

## Deploy

### `void deploy`

```
void deploy [--project <name>] [--dir <path>] [--spa] [--skip-build] [--debug]
void deploy --backend cloudflare [--provision]
```

Auto-detects your project type and chooses the right pipeline. See [Supported App Types](../guide/app-types.md) and [Deployment](../guide/deployment.md) for details.

For Drizzle projects, deploy performs a read-only schema drift check. If a new migration would be generated, deploy stops and tells you to run `void db generate`, review the migration, commit it yourself, and rerun `void deploy`.

| Flag                   | Purpose                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `--project <name>`     | Target a specific project by slug; not supported with `--backend cloudflare`                 |
| `--dir <path>`         | Deploy a pre-built static directory (skips build); not supported with `--backend cloudflare` |
| `--spa`                | Use SPA mode instead of SSG for static deploys; not supported with `--backend cloudflare`    |
| `--skip-build`         | Skip the build step (use existing build output); not supported with `--backend cloudflare`   |
| `--backend cloudflare` | Deploy to your own Cloudflare account instead of the Void platform                           |
| `--provision`          | Create missing bindings (D1/KV/R2/Queues/Hyperdrive); requires `--backend cloudflare`        |
| `--debug`              | Mirror the structured deploy log to stderr (also written to `~/.void/logs/`)                 |

Every deploy writes a structured JSONL trace to `~/.void/logs/deploy-<timestamp>.jsonl` regardless of `--debug`. On failure the path is printed at the end of the error message so you can attach it when reporting platform issues. `VOID_DEPLOY_DEBUG=1` is accepted as an alternate trigger for stderr mirroring.

Project resolution precedence:

1. `--project <name>`
2. `VOID_PROJECT`
3. linked project in `.void/project.json`

If no project is linked and no override is provided, CLI prompts to link or create one. In CI (non-TTY), `void deploy` errors out instead — set `VOID_PROJECT` or pass `--project <slug>`.

That fallback is mainly for projects that skipped Void project setup during `void init`.

### `void deploy --backend cloudflare`

Deploy the built worker straight to **your own** Cloudflare account instead of the Void platform. This path uses your local `wrangler` auth and your root `wrangler.jsonc` — no Void login or linked project is involved.

```
void deploy --backend cloudflare              # deploy using resources already in wrangler.jsonc
void deploy --backend cloudflare --provision  # create any missing resources first, then deploy
```

Prerequisites:

- A Cloudflare account must be **pinned**: set `account_id` in your root `wrangler.jsonc`, or export `CLOUDFLARE_ACCOUNT_ID`. A multi-account token otherwise makes wrangler prompt (or error in CI), which Void cannot intercept.
- Authenticate wrangler (`wrangler login`, or set `CLOUDFLARE_API_TOKEN`). Deploy needs a token with `Workers Scripts:Edit` plus read on the resources you bind; `--provision` additionally needs per-product `*:Edit` (D1, KV, R2, Queues, Hyperdrive).
- `CLOUDFLARE_API_TOKEN` is **required** to provision a Hyperdrive config for the first time — `wrangler login` covers every other resource, but wrangler exposes no machine-readable Hyperdrive list, so Void checks for an existing config over the Cloudflare REST API, which OAuth cannot authenticate. Without a token, `--provision` stops before touching your account. Alternatively create the Hyperdrive config yourself and put its id in `wrangler.jsonc` — deploying an already-provisioned Hyperdrive app needs no token.
- `--skip-build` is **not supported** with `--backend cloudflare`: this backend validates the artifact the build emits (worker `vars` in `dist/ssr/wrangler.json`, the generated auth schema), so there is nothing to check without a fresh build.
- `--project`, `--dir` and `--spa` are **not supported** with `--backend cloudflare` either, and are rejected rather than ignored: no Void project is resolved on this path, and it uploads the worker your build emits rather than a static directory.
- Local Docker is required to build apps that use the sandbox.

What it does, in order: settles the app class before any account op (v1 supports **full Void apps on the Cloudflare Workers target** -- worker-bearing apps running Void's routing, with D1/KV/R2/Queues/Hyperdrive and, on D1/SQLite, auth + ISR; framework SSR of every kind, static/SPA/SSG apps, node/bun/deno targets, and PostgreSQL apps with auth or with checked-in migrations all fail closed with guidance), pins the account and checks auth, provisions or drift-checks resources, **builds**, then gates on the artifact the build emitted — production secrets checked against the build's effective mode/envDir, the auth schema, and migration validation — then applies remote D1 migrations for SQLite apps (verifying the applied set equals the validated set and none remain pending), and finally runs `wrangler deploy` on exactly the verified artifact. Auth apps must ship checked-in migrations that produce the Better Auth schema — the managed platform's runtime auth-migration step does not run on this backend.

The build deliberately comes **before** the secret, auth-schema, and migration gates, because those gates inspect the real emitted worker rather than a prediction of it. A missing secret or a bad migration surfaces after the build has run — relevant when a build is expensive or has side effects. Remote D1 migrations run only once every gate has passed, so a failed gate mutates nothing remote.

`--provision` creates any D1 database, KV namespace, R2 bucket, Queues, Hyperdrive config, and the ISR cache namespace your source needs, then lets wrangler write the real ids into your root `wrangler.jsonc`. It is **idempotent** — re-running creates nothing that already exists (it reads existing ids first). Notes:

- **Provision is a single-operator, dev-machine action.** The lock that guards it is per local config path only; it does not coordinate across machines. Two people provisioning the same account at once could create duplicate resources. `--provision` also **fails closed in CI / non-interactive shells** unless your committed `wrangler.jsonc` already covers every resource (a provable no-op). Provision locally, commit the updated `wrangler.jsonc`, then let CI run `void deploy --backend cloudflare`.
- **Your `wrangler.jsonc` is rewritten.** When wrangler writes the new ids, it preserves your comments but normalizes the whole file's indentation — expect that in the diff.
- **Your `.env*` values ship as plaintext.** All four of `.env`, `.env.local`, `.env.production` and `.env.production.local` are loaded by this backend and baked into the worker's `vars` — the `.local` files included, unlike managed `void deploy`. A value also present in the shell environment is stripped back out. Move real secrets to `wrangler secret put <NAME>` so they are not committed into `wrangler.json`. Deploy warns on likely-plaintext secrets and hard-blocks on missing required secrets.
- **First deploy of a not-yet-deployed worker:** its remote secrets can't be listed yet, so the secret gate prints the required key names and the `wrangler secret put <NAME>` commands to bootstrap them on the draft worker before deploying (or add a value to `.env` / `.env.production` and rerun).

See the [Cloudflare integration guide](../integrations/cloudflare.md#deploy-to-your-own-cloudflare-account) for the full walk-through.

## Database

### `void db push`

Apply your Drizzle schema directly to the development database without creating migration files. For D1 projects, this updates the local D1 database used by dev. For PostgreSQL projects, this uses `DATABASE_URL` from `.env.local`.

Use this for quick schema iteration while prototyping. Before deploying, generate and review migration files with `void db generate`.

### `void db generate`

Generate SQL migration files from schema changes.

The command compares your current `db/schema.ts` or `db/schema/` modules against the last generated Drizzle snapshot and writes new migration artifacts under `db/migrations/`. Review and commit the generated files before deploying.

### `void db status`

Show migration status. Displays which migrations are applied or pending locally. When logged in and linked to a project, also shows remote status.

### `void db reset`

Drop the local D1 database and re-apply all migrations. Does not affect the remote database.

### `void db seed`

```
void db seed [--file <path>]
```

Reset the local database, re-apply all migrations, then execute a seed file.

If `--file` is omitted, Void looks for default seed files in this order: `db/seed.ts`, `db/seed.mts`, `db/seed.js`, `db/seed.mjs`, `db/seed.sql`.

If more than one default seed file exists, the CLI stops and asks you to pass `--file <path>`.

Programmatic seed modules must export either a default function or a named `seed` function.

### `void db execute`

```
void db execute <sql>
void db execute --file <path>
void db execute --remote <sql>
```

Run ad-hoc SQL against the database. Provide SQL inline or from a file. SELECT queries display results as a formatted table; other statements execute silently.

By default, targets the local database. Pass `--remote` to run against the deployed database:

- **D1 projects**: routes the query through the Void proxy (`proxy.void.cloud/d1/query`) using your auth token. No Cloudflare credentials needed.
- **PostgreSQL projects**: fetches the stored connection string from the platform and connects directly. Requires that `void db set-url` has been run at least once (the platform stores the URL encrypted). If the URL isn't stored yet, you will see: _"Run `void db set-url` once to populate it, then retry."_

For destructive statements (`DELETE`, `UPDATE`, `DROP`, etc.) when running in a TTY, you will be prompted to confirm before the query is sent to the deployed database. Non-TTY environments (CI) skip the prompt.

### `void db migrate`

```
void db migrate [--remote]
```

Apply pending migrations to the local database without resetting. Unlike `void db reset`, this preserves existing data and only runs migrations that haven't been applied yet.

Pass `--remote` to apply pending migrations to the remote database instead. Requires being logged in (`void auth login`) and having a linked project.

### `void db studio`

```
void db studio [--remote]
```

Open [Drizzle Studio](https://orm.drizzle.team/docs/drizzle-kit-studio) for the database. Launches a web-based GUI for browsing and editing your data.

By default, targets the local database. Pass `--remote` to open Studio against the deployed database:

- **PostgreSQL projects**: fetches the stored connection string from the platform and opens Studio against it. Requires being logged in (`void auth login`) with a linked project. If the URL isn't stored yet, run `void db set-url` first.
- **D1 projects**: remote Studio is not yet supported. Use `void db execute --remote` for ad-hoc queries against your deployed D1 database.

### `void db rename-migrations`

Rename existing migrations from the old numeric prefix format (`0001_name.sql`) to timestamp-based format (`20260410161500_name.sql`). Updates local tracking table and remote records if logged in with a linked project.

### `void db set-url`

Update the PostgreSQL connection string for deployment. Only available for projects with `"database": "pg"` in `void.json`.

Prompts for a connection string and sends it to the platform API to create or update the Hyperdrive configuration.

### `void db export`

```
void db export [--output <path>] [--no-data] [--no-schema] [--table <name>]
```

Dump the local database as SQL. Outputs to stdout by default (pipeable), or to a file with `--output`.

| Flag              | Purpose                            |
| ----------------- | ---------------------------------- |
| `--output <path>` | Write to a file instead of stdout  |
| `--no-data`       | Schema only (no INSERT statements) |
| `--no-schema`     | Data only (no CREATE TABLE)        |
| `--table <name>`  | Export a single table              |

## Code Generation

### `void gen model`

```
void gen model <name> [columns...]
```

Scaffold a complete model: migration file, CRUD API routes, and regenerated DB types in one command.

```sh
void gen model posts title:string body:text published:boolean
```

Creates:

- `db/migrations/NNN_create_posts.sql`: `CREATE TABLE` with `id` (autoincrement), your columns, and `created_at`
- `routes/api/posts/index.ts`: `GET` for list and `POST` for insert with validation
- `routes/api/posts/[id].ts`: `GET` by id with `404` handling
- Regenerated `.void/db.d.ts`

The generated routes automatically detect your validation library from `package.json` (`valibot`, `zod`, or `arktype`). If none is found, you will be prompted to choose one or skip validation. See [Database: Scaffolding](../guide/database.md#scaffolding) for the full type mapping.

Column format: `name:type` or `name:type?` (nullable). Types: `string`, `text`, `datetime`, `integer`, `boolean`, `real`, `blob`.

Model names must be lowercase alphanumeric with underscores (e.g. `posts`, `user_roles`). Existing files are never overwritten.

### `void gen migration`

```
void gen migration <name>
```

Create an empty migration file with a timestamp prefix (`YYYYMMDDHHMMSS`).

```sh
void gen migration add_avatar_to_users
# → db/migrations/20260410161500_add_avatar_to_users.sql
```

Existing projects using the old numeric prefix (`0001_`, `0002_`, ...) can rename with `void db rename-migrations`.

### `void gen route`

```
void gen route <path> [--methods get,post,...]
```

Create a route file with `defineHandler` exports. Defaults to GET.

```sh
void gen route api/health
void gen route api/users --methods get,post,delete
```

Creates `routes/<path>.ts` with an exported handler for each method. Supported methods: `get`, `post`, `put`, `patch`, `delete`.

### `void gen middleware`

```
void gen middleware <name>
```

Create a numbered middleware file with `defineMiddleware` default export.

```sh
void gen middleware auth
# → middleware/01.auth.ts (or 02, 03, etc.)
```

The prefix is auto-detected from existing middleware files.

### `void gen ssr`

```
void gen ssr [--react | --vue | --svelte | --solid]
```

Scaffold SSR entry points and a minimal App component for your framework.

Creates three files:

- `src/main.ssr.{tsx,ts}`: server entry with `defineRender`
- `src/main.client.{tsx,ts}`: client entry with hydration
- `src/App.{tsx,vue,svelte}`: minimal interactive component

If no flag is provided, the framework is auto-detected from `package.json` dependencies.

### `void gen cron`

```
void gen cron <name>
```

Create a cron job file in `crons/` with `defineScheduled` and a placeholder cron expression.

```sh
void gen cron hourly-sync
```

### `void gen queue`

```
void gen queue <name>
```

Create a queue consumer file in `queues/` with `defineQueue`, a `Message` interface, and commented-out batch options.

```sh
void gen queue emails
```

## Secrets

### `void secret list`

```
void secret list [--project <name>]
```

List the production secrets configured for the project. Secret values are never printed.

### `void secret put`

```
void secret put <name> [--project <name>]
void secret put <name=value> [--project <name>]
```

Value input modes:

- inline: `void secret put API_KEY=abcd`
- prompt (TTY): `void secret put API_KEY` (masked input)
- stdin: `echo -n "abcd" | void secret put API_KEY`

### `void secret sync`

```
void secret sync <file> [--project <name>]
```

Bulk upload secrets from a dotenv file. Each `KEY=value` line in the file is uploaded as a secret.

```sh
void secret sync .env.local       # uploads secrets from .env.local
void secret sync .env.production  # uploads a specific file
```

### `void secret delete`

```
void secret delete <name> [--project <name>]
```

Project resolution for secrets follows the same order as deploy (`--project`, env var, linked project).

## Env Schema

### `void env check`

```
void env check [--remote]
```

Validate `env.ts` against `.env` + `.env.production` (and, with `--remote`, also against the remote secret list). Exits non-zero if any required key is missing or invalid. Use in CI before deploy.

### `void env types`

```
void env types
```

Regenerate `.void/env.d.ts` from `env.ts`. Normally happens automatically on dev server start and HMR; use this command after a fresh clone or to refresh stale types in non-dev contexts.

### `void env example`

```
void env example [--force]
```

Generate or refresh a marker-delimited "void env" block inside `.env.example` at the project root, sourced from the registered `env.ts` schema. The block is grouped into `required`, `with defaults`, and `optional` sections, with enum members emitted as inline comments. Prefilled values are used for keys with a `.default(...)`.

The command never overwrites the whole file — anything above or below the markers (custom CI tokens, build flags, etc.) is preserved verbatim:

| State of `.env.example`                     | Behavior                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| File doesn't exist                          | Writes a fresh file containing only the marker block.                                                                  |
| Exists, contains both markers               | Replaces only the lines between (and including) the markers; everything else is preserved.                             |
| Exists, no markers                          | Appends the block at the end (one blank line separator) and prints `appended void env block to existing .env.example`. |
| Exists, only one of the two markers present | Hard error — fix the file (restore the missing marker or delete the file) and rerun.                                   |

Pass `--force` to suppress the "appended block" notice for scripted runs.

Example output:

```ini
# >>> void env: managed block — do not edit between markers <<<
# Run `void env example` to refresh.
# required
STRIPE_KEY=
# enum: development | production
NODE_ENV=

# with defaults
PORT=3000
# >>> end void env <<<
```

::: tip Deploy validation
`void deploy` runs the same schema validation automatically (with remote secrets) and refuses to upload if any required key is missing — no need to call `env check` separately when deploying.
:::

See [Environment Variables](../guide/env-vars.md) for the full guide.

## GitHub

Deploy-on-GitHub works from **any** Void login — Google, GitHub, or other SSO. The first time you connect GitHub, Void links your GitHub identity to your current account (a one-time step, independent of how you logged in); it never creates a second account.

### `void github link`

```
void github link
```

Link your current Void account to a GitHub identity. Opens your browser to authorize Void on GitHub (a localhost + PKCE handshake, the same mechanics as `void auth login`), then binds that GitHub identity to the logged-in account. Requires an authenticated CLI (`void auth login` first).

You normally don't need to run this directly — `void github install` runs the link automatically when your account has no GitHub identity yet. Run it on its own to link ahead of time, or to link a GitHub identity without installing the App.

::: warning Existing GitHub sign-in
Void accounts cannot be merged. If the GitHub account you authorize is already linked to a different Void account, including one created through GitHub sign-in, `void github link` is refused with `This GitHub account is already linked to another Void account.` Run `void auth logout` and sign in to that existing account, or authorize a different GitHub account. The command is also refused if your current Void account is already linked to a different GitHub identity. Re-authorizing the GitHub account attached to your current Void account is allowed and reports `GitHub account already linked.`
:::

### `void github install`

```
void github install
```

Open the GitHub App install page in your browser. If your account has no linked GitHub identity yet, `void github install` first runs the GitHub link automatically (browser authorize), then continues. After installing, run `void github connect` to link a repository to your project.

### `void github installations`

```
void github installations
```

List all GitHub App installations linked to your account. Each entry includes the `[id: <installation_id>]` needed for `--installation` in non-interactive use.

### `void github join`

```
void github join
```

Join the GitHub App installations your organization already has. If a teammate installed the Void GitHub App on a shared GitHub organization, run `void github join` to gain access to those installations without re-installing. Void opens your browser to authorize (a localhost + PKCE handshake, the same mechanics as `void github link`), confirms with GitHub which installations you can manage, and records your membership. Afterwards `void github installations` lists them and `void github connect` can connect your own projects to their repositories.

In an interactive terminal you rarely need to run this yourself — `void github connect` runs the same join automatically when no active installations are linked to your account. Running `void github join` yourself matters mainly for non-interactive use (without a TTY, `void github connect` never opens a browser), or to link installations ahead of time.

Requires an authenticated CLI (`void auth login` first) and organization-installation sharing enabled on your Void instance; when it is not enabled the command fails closed with a clear message. You can only join installations your GitHub authorization actually returns — you cannot name or join one you cannot access on GitHub.

### `void github connect`

```
void github connect [project] [options]
```

Connect a GitHub repository to a Void project for automatic deploys. On every push to the configured branch, Void builds and deploys your project automatically.

Interactively (TTY), if your account has no active installations linked, `void github connect` first runs the same browser authorize as `void github join` automatically — if a teammate already installed the Void GitHub App on your organization, you join it on the spot and the connect continues. Only when no shared installation is found does it ask you to run `void github install`. The same recovery runs when `--installation <id>` names an installation your account is not linked to yet. Without a TTY, connect never opens a browser: it fails closed and tells you to run `void github install`, or `void github join` if your organization already installed the App.

**Options**

| Flag                  | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `--project <name>`    | Project name (alias for the positional argument)                                  |
| `--installation <id>` | GitHub App installation ID (required when you have multiple installations)        |
| `--repo <owner/repo>` | Repository full name — required unless the installation grants exactly one repo   |
| `--branch <name>`     | Branch to deploy from — **required in non-interactive mode**                      |
| `--executor <type>`   | Build executor: `container` (default) or `github_actions`                         |
| `--workflow <path>`   | Authorized deploy workflow file — defaults to `.github/workflows/void-deploy.yml` |

The `--workflow` path is the workflow file the GitHub OIDC exchange authorizes to mint this project's deploy token. It defaults to the scaffolded `.github/workflows/void-deploy.yml`; set it only if your deploy step lives in a different workflow file (it must be under `.github/workflows/` and end in `.yml`/`.yaml`). Because the exchange is secretless, **only this one workflow** can mint a deploy token — any other workflow in the repo (including an unsafe `pull_request_target`) is rejected. Pointing it at a broad, multi-purpose workflow widens that trust, so prefer a dedicated file.

Interactively (TTY), after resolving the repository and branch, `void github connect` prompts for the **build executor** (defaulting to `container`). If you pick `github_actions`, it then prompts for the **deploy workflow file**, defaulting to `.github/workflows/void-deploy.yml` and validated locally before it is sent. Pass `--executor` and/or `--workflow` to skip the respective prompt. The workflow prompt is skipped entirely for the `container` executor, which does not use a workflow file.

**Non-interactive use (CI)**

When stdin is not a TTY, `void github connect` never prompts — it fails closed and names any flag it needs. `--branch` is always required. `--project` must be resolvable (positional / `--project` / `VOID_PROJECT` / linked `.void/project.json`). `--installation` is required only when your account has more than one installation; otherwise the sole installation is used. `--repo` is required when the installation grants access to all repos or to more than one selected repo; when it grants exactly one repo that repo is used automatically. `--repo` is also required when the installation does not expose a repository list to your account (shared org installations hide it). Use `void github installations` to discover the `installation_id`.

```
void github connect my-app \
  --installation 42 \
  --repo owner/my-app \
  --branch main
```

**Project resolution** follows the same order as deploy: positional / `--project`, `VOID_PROJECT`, linked project (`.void/project.json`).

**Connecting as an organization member**

If you are a member of a GitHub organization but not the person who installed the App, `void github connect` first confirms that you personally have access to the specific repository. Interactively (TTY), when it detects this it opens your browser once to authorize access to that repo on GitHub (a localhost + PKCE handshake), then completes the connection automatically — no extra flags. Without a TTY, this per-repo authorization never opens a browser: connect fails closed with an error explaining that the installation requires per-repo authorization, which needs an interactive browser sign-in, and telling you to run `void github connect` locally to authorize, then retry. Interactively, connect joins the shared installation automatically when your account has no active installations linked, so running `void github join` first is optional — useful mainly to see the installation in `void github installations` beforehand. You can only connect repositories you can access on GitHub; one you cannot see is refused with a clear message.

### `void github update`

```
void github update [project] [options]
```

Update an existing connection's deploy **branch**, **build executor**, and/or authorized **workflow file**. Use this to change settings on a project that is already connected — for example, flipping the executor from `container` to `github_actions` for a monorepo whose Void app lives in a subdirectory, moving the deploy branch, or pointing the OIDC trust at a different workflow file. The project must already be connected (run `void github connect` first); the repository and installation are not changed.

**Options**

| Flag                | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `--project <name>`  | Project name (alias for the positional argument)                 |
| `--branch <name>`   | New branch to deploy from                                        |
| `--executor <type>` | New build executor: `container` or `github_actions`              |
| `--workflow <path>` | New authorized deploy workflow file (under `.github/workflows/`) |

Interactively (TTY), `void github update` shows the current branch and executor and prompts for new values, defaulting each to the current setting. If the resulting executor is `github_actions`, it then prompts for the **deploy workflow file**, defaulting to the current path and validated locally; pass `--workflow` to skip that prompt. The workflow prompt is skipped when the executor is `container`, which does not use a workflow file. When stdin is not a TTY, it never prompts: pass at least one of `--branch` / `--executor` / `--workflow`, or it fails closed. If nothing actually changes, the command reports "no changes" and does not call the API.

```
void github update my-app --executor github_actions
```

**Project resolution** follows the same order as deploy: positional / `--project`, `VOID_PROJECT`, linked project (`.void/project.json`).

### `void github status`

```
void github status [project]
```

Show a project's current GitHub connection: the connected **repository**, the deploy **branch**, the **build executor** (`container` or `github_actions`), and the authorized **deploy workflow file**. Read-only — it never changes anything. The workflow file is the OIDC pin used only for `github_actions` builds; on a `container` connection it is still shown but marked unused. The project must already be connected (run `void github connect` first, otherwise it reports that and exits).

**Options**

| Flag               | Description                                      |
| ------------------ | ------------------------------------------------ |
| `--project <name>` | Project name (alias for the positional argument) |

```
void github status my-app
```

**Project resolution** follows the same order as deploy: positional / `--project`, `VOID_PROJECT`, linked project (`.void/project.json`).

### `void github disconnect`

```
void github disconnect [project]
```

Disconnect a project from its GitHub repository, stopping automatic deploys. Any in-flight builds for the project are cancelled (their deploy tokens are revoked) before the connection is removed. If the project has no connection, it reports that and exits successfully. To point a project at a different repository, disconnect first, then run `void github connect`.

You are asked to confirm before anything is removed. Pass `--yes` to skip the prompt; `--yes` is **required** in a non-interactive shell (CI), where there is no prompt to answer.

**Options**

| Flag               | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `--project <name>` | Project name (alias for the positional argument)                  |
| `--yes`            | Skip the confirmation prompt (required in non-interactive shells) |

```
void github disconnect my-app --yes
```

**Project resolution** follows the same order as deploy: positional / `--project`, `VOID_PROJECT`, linked project (`.void/project.json`).

## Build

Inspect Deploy-on-GitHub builds.

### `void build logs`

```
void build logs [build] [--follow] [--output <file>] [--project <slug>]
```

Stream, tail, or download the build logs for a **container** build. With no
`[build]` argument, targets the project's most recent build.

| Flag                     | Purpose                                                           | Default |
| ------------------------ | ----------------------------------------------------------------- | ------- |
| `--follow`, `-f`         | Live-tail: poll until the build reaches a terminal status.        | off     |
| `--output <file>`, `-o`  | Write logs to a file instead of stdout (appends while following). | stdout  |
| `--project <slug>`, `-p` | Target project.                                                   | linked  |

**Project resolution** follows the same order as deploy: positional / `--project`,
`VOID_PROJECT`, linked project (`.void/project.json`).

Builds run on **GitHub Actions** keep their logs on GitHub — the command prints
the Actions run URL instead of streaming. Only the last 10,000 log lines of a
container build are retained.

Examples:

```
void build logs                     # print the latest build's logs
void build logs -f                  # follow the latest build until it finishes
void build logs bld_123 -o build.log  # download a specific build's logs
```

## Custom Domains

### `void domain add`

```
void domain add <hostname> [--project <name>]
```

Add a custom domain to a project. Prints the two DNS records to add at your DNS provider: a traffic **CNAME** pointing `<hostname>` at the CNAME target shown in the command output, and a non-rotating `_cf-custom-hostname` ownership **TXT**. Certificates are validated over HTTP at Cloudflare's edge and renew automatically — there are no `_acme-challenge` records to publish, at first issuance or ever. After adding the records the domain activates automatically (no polling required); run `void domain status <hostname>` to check progress.

> Wildcard custom hostnames (`*.example.com`) are not supported — register each subdomain individually.

### `void domain delete`

```
void domain delete <hostname> [--project <name>]
```

Remove a custom domain from a project.

### `void domain list`

```
void domain list [--project <name>]
```

List all custom domains and their status (active/pending).

### `void domain status`

```
void domain status <hostname> [--project <name>] [--verbose]
```

Check verification and SSL status for a specific domain. Prints a rolled-up state (`awaiting_dns`, `verifying_dns`, `issuing_cert`, `deploying_cert`, `awaiting_deployment`, `active`, `error`, or `pending`) with a one-line diagnostic explaining what Cloudflare is doing and any user action required. While the certificate is not yet active, the command also surfaces the records to configure — the traffic **CNAME** and the `_cf-custom-hostname` ownership **TXT** — so you can verify them. Activation is automatic: a background job reconciles pending domains (about every 2 minutes for the first 30 minutes after adding, then hourly), so this command is for instant feedback rather than required polling.

Pass `--verbose` to additionally print the raw multi-line status breakdown (DB status, SSL status, ownership state, verification errors) underneath the rollup.

Project resolution for domain commands follows the same order as deploy (`--project`, `VOID_PROJECT`, linked project).

## Agent

### `void init --agents`

Runs all agent setup steps:

1. **Instructions:** detects agents once and injects Void framework instructions with versioned markers.
2. **Skills:** links skills for the same detected or selected agent context.
3. **MCP config:** writes MCP server config for that same context, or prints generic MCP JSON in Generic mode.

If no agent is detected, `void init --agents` asks you to choose from Claude Code, Cursor, Codex, Gemini CLI, or Generic.

### `void mcp`

```
void mcp
```

Start the Void MCP server over stdio for supported coding agents.

## Environment variables

| Variable       | Purpose                                                                   | Default |
| -------------- | ------------------------------------------------------------------------- | ------- |
| `VOID_TOKEN`   | Auth token override instead of saved config                               | none    |
| `VOID_PROJECT` | Default project slug for deploy, secret, domain, and cache purge commands | none    |
