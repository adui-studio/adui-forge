---
outline: deep
---

# Quickstart

## Start in an Empty Directory

Install the Void CLI from npm:

`npm`

```sh
npm install -D void
```

`pnpm`

```sh
pnpm add -D void
```

`yarn`

```sh
yarn add -D void
```

`bun`

```sh
bun add -D void
```

In an empty directory, `void init` adds the matching Pages adapter and starter dependencies after you choose a scaffold toolchain and framework. Vite+ is the default toolchain and uses `vp` scripts.

As part of `void init`, you'll choose Vite+ or plain Vite, then a Pages framework (React, Vue, Svelte, or Solid) and a starter type. D1 is the default top option and scaffolds a DB-backed page loader, schema, generated migration, `db/seed.ts`, and API route. PostgreSQL scaffolds the same starter and writes `"database": "pg"` to `void.json`. Static Pages skips the database and server starter files so you can start with static content and add Void features later.

After installation, run the setup flow:

::: code-group

```sh [npm]
npx void init
```

```sh [pnpm]
pnpm void init
```

```sh [yarn]
yarn void init
```

```sh [bun]
bunx void init
```

:::

At the end of the full interactive flow, `void init` can also handle Void project setup by logging you in and linking or creating your Void project. That means the default first-time path is install packages, run `void init`, then `void deploy`.

For the database-backed starters, D1 is the zero-config default for prototyping and read-heavy apps, while PostgreSQL is better when you already have Postgres infrastructure or need heavier writes and more complex queries.

<details>
<summary style="cursor:pointer">
💡 <b>Notes on <code>void</code> binary usage</b>
</summary>

`void` is a local binary from the installed `void` package, so outside of npm scripts, you will have to invoke it with `npx`, `pnpm`, `yarn`, or `bunx`. For brevity, you will sometimes see unprefixed `void` usage throughout the docs. Just remember it needs to be invoked through a binary runner.

Alternatively, you can add `./node_modules/.bin` to your `PATH` so that you can invoke `void` directly when you are in the root directory of your app.

:::warning ⚠️ Prefer local install
We do not recommend installing `void` globally, because the CLI needs to be in sync with same version of the runtime framework. Always install `void` locally as a dev dependency of your project.
:::

</details>

## Using with Coding Agents

`void init` detects your agent once and reuses that choice for instructions, skills linking, and MCP config.

If auto-detection fails, `void init` asks you to choose from a short list (Claude, Cursor, Codex, Gemini CLI, Generic).

In supported agents such as Claude Code, you can invoke the `/void` skill to turn your agent into a Void export. Then, simply ask the agent to build an app with Void. See the [Coding Agents](../integrations/agents) guide for more details.

## Meta Frameworks

Void as a platform supports Vite-based meta frameworks, but the Void SDK itself is also a powerful and flexible meta framework via its [Pages routing](./pages-routing/overview) feature. If you only want to use an existing meta framework and deploy to Void, check out the [Framework Integration Guides](../integrations/frameworks/overview).

## Adding to an Existing Vite App

::: code-group

```sh [npm]
npm install -D void
```

```sh [pnpm]
pnpm add -D void
```

```sh [yarn]
yarn add -D void
```

```sh [bun]
bun add -D void
```

:::

Enable the plugin in `vite.config.ts`

```ts
import { defineConfig } from "vite";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin()],
});
```

Then run the setup guide via `void` (Void CLI):

::: code-group

```sh [npm]
npx void init
```

```sh [pnpm]
pnpm void init
```

```sh [yarn]
yarn void init
```

```sh [bun]
bunx void init
```

:::

## Once You Have a Working App

### 1. Edit the generated API route

Your starter already includes `routes/api/hello.ts` with a named `GET` export:

```ts
import { defineHandler } from "void";

export const GET = defineHandler(() => {
  return { message: "Hello from Void" };
});
```

### 2. Run locally

```sh
npm run dev
```

Then visit:

- App: `http://localhost:5173`
- API route: `http://localhost:5173/api/hello`

### 3. Finish Void project setup if you skipped it during `void init`

```sh
void auth login
```

If you already logged in and linked a project during `void init`, you can skip this step.

### 4. Deploy

Set secrets once before deploying, if any:

```sh
void secret put KEY=value
```

Then run:

```sh
void deploy
```

```sh
┌  void deploy
│
◇  Building...
│  (vite build output)
│
ℹ  Found N migration(s)
│
◇  Checking assets...
◇  Uploading X/Y assets (Z cached)
◇  Packaging...
◇  Deploying...
◇  Deployed!
│
│  ╭─────────────────────────────────────────╮
│  │  https://my-app.void.app           │
│  │                                         │
│  │  2 worker module(s), 5 static asset(s)  │
│  │  1 migration(s) applied                 │
│  │  SSR enabled                            │
│  ╰─────────────────────────────────────────╯
│
└  Done!
```

On first deploy, Void will:

- build your app
- create or link a project if you did not already do that during `void init`
- provision required resources (for example D1/KV/R2 when inferred)
- deploy to `https://<slug>.void.app`

Right now, only deploys via the CLI is supported. To setup push-to-deploy GitHub, run `void init --github`.

## Next steps

- To understand what kind of apps are supported: [Supported App Types](./app-types)
- [Server Routing](./server-routing): dynamic params, middleware, and validation
- [Database](./database): queries, migrations, and generated types
- [Type Safety](./type-safety): end-to-end typed fetch client
