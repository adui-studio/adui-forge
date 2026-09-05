---
outline: deep
---

# What is Void?

This guide explains how Void fits together before you dive into individual features. It starts with the mental model, then moves into routing, data, platform features, and deployment. If you want to get something running first, jump to [Quickstart](./quickstart).

Void combines a Vite plugin, a backend SDK, and a deployment platform. Add one plugin to your app, and the imports in your code drive the infrastructure around it. A database, key-value store, object storage, AI inference, and deployment all line up without a separate layer of config files or dashboard setup.

```sh
npm install -D vite void
```

```ts
import { defineConfig } from "vite";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin()],
});
```

```sh
void deploy
# app live at <your-subdomain>.void.app!
```

## The idea

With most stacks, your app and its platform do not talk to each other directly. You end up stitching them together with config files, environment setup, resource provisioning, and deployment scripts. Once the app is live, caching, scaling, and limits often live in a separate control plane too.

Void closes that gap. It connects your app directly to the platform through Vite. Import `db` from `void/db` and you have a database in local development plus the matching production resource on deploy. The same idea applies to `kv`, `storage`, queues, and AI. In most cases, the code already describes what the platform needs to provision.

This is what it unlocks:

- **Write code, not config:** no infrastructure files, no dashboard clicks, and no manual resource declarations. Your imports are the contract.
- **Types from database to frontend:** your Drizzle schema defines DB types, route handlers infer return types, and the [typed fetch client](./typed-fetch.md) checks calls at the usage site. One [Standard Schema](https://standardschema.dev/) validator can drive both runtime validation and compile-time types.
- **Real runtime in development:** `vite dev` runs your server code in the same runtime used in production, with local database, KV, and storage.
- **Deploy that understands the app:** `void deploy` reads your migrations, provisions the resources you actually use, and ships the result to the edge.

## The platform

Void deploys to [Cloudflare Workers](https://developers.cloudflare.com/workers/). Your server code runs at the edge, close to users, and scales without extra platform work on your side.

- [Static assets](./edge/static-assets) are served from the edge with proper cache headers. [Incremental revalidation](./edge/revalidation) (ISR) and [prerendering](./edge/prerendering) let you cache dynamic pages while keeping data fresh.
- Database reads are fast everywhere via D1's read replication.
- Custom domains with automatic TLS.
- Secrets and environment variables managed via CLI or dashboard, scoped per project.
- A dashboard for deployments, usage metrics, and project settings.

You do not need a Cloudflare account or Cloudflare-specific knowledge to get started. If you want full control later, every build still produces a standard Cloudflare Worker, so you can [self-host](../integrations/cloudflare#deploy-to-your-own-cloudflare-account) with your own `wrangler.json`.

## How it works

```
vite.config.ts                →  voidPlugin() (works with any Vite app)
import { db }                 →  D1 database (auto-provisioned)
import { kv }                 →  KV namespace (auto-provisioned)
import { storage }            →  R2 bucket (auto-provisioned)
import { ai }                 →  Workers AI inference (metered)
db/schema.ts                  →  Drizzle schema (source of truth for DB types)
db/migrations/*.sql           →  Applied to D1 on deploy
void deploy                   →  Live at https://<slug>.void.app
```

The plugin scans your source code at build time, detects which imports you use, and provisions the corresponding Cloudflare bindings on deploy.

Void also works with existing frameworks. [TanStack Start](/integrations/frameworks/tanstack-start), [React Router](/integrations/frameworks/react-router), [SvelteKit](/integrations/frameworks/sveltekit), [Nuxt](/integrations/frameworks/nuxt), and [Astro](/integrations/frameworks/astro) can all deploy with the same `voidPlugin()`.

If you are building a full-stack app without a meta-framework, Void also gives you [file-based server routing](./server-routing) with method exports, dynamic params, middleware, and validation. It also includes [pages routing](./pages-routing/overview) for server-rendered UI, SPA navigation, co-located data loading, and typed forms across React, Vue, Svelte, and Solid.

Void auto-detects your [app type](./app-types) and adapts accordingly.

## Next steps

- [Quickstart](./quickstart): get a running app in minutes
- [Server Routing](./server-routing): dynamic params, middleware, and validation
- [Pages Routing](./pages-routing/overview): full-stack pages with server loaders and actions
- [Supported App Types](./app-types): full-stack, meta-framework, and static site modes
