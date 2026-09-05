---
outline: deep
---

# Supported App Types

Void supports three types of apps:

1. **Void apps:** Vite apps powered by Void's framework layer, including [API routes](./server-routing.md), [pages mode](./pages-routing/overview.md), [auth](./auth.md), [crons](./jobs.md), and [queues](./queues.md)
2. **Meta frameworks:** [TanStack Start](https://tanstack.com/start/latest), [React Router](https://reactrouter.com/), [SvelteKit](https://svelte.dev/docs/kit), [Nuxt](https://nuxt.com/), and [Astro](https://astro.build/)
3. **Static sites:** SPAs, sites built with tools like [VitePress](https://vitepress.dev/), or any directory of static files

The type is auto-detected from your project structure, or you can set it explicitly in [`void.json`](../reference/config.md).

## Void Apps

A Vite app powered by Void's framework layer. In this mode, **Void is both the framework and the platform**. It is opinionated in the backend and deployment story, while still staying frontend-framework-agnostic. You can use it with React, Vue, Svelte, Solid, or any frontend that works with Vite.

All Void features that involve backend logic are available in this mode, including [server routing](./server-routing.md), [pages mode](./pages-routing/overview.md), [authentication](./auth.md), [typed fetch](./typed-fetch.md), [cron jobs](./jobs.md), and [queues](./queues.md).

A Void app can be **API-only** (just `routes/`), a **SPA + API** (frontend in `src/` with API routes), or **full-stack with pages mode** (server-rendered pages in `pages/` with co-located data loading):

<VoidAppFileTree annotations />

Your worker handles API routes, page rendering, and (optionally) [custom SSR](./ssr.md). Static assets are served from the edge via per-worker assets. Cloudflare bindings (D1, KV, R2) are [inferred from your source code](../reference/resource-inference.md) and provisioned automatically.

Void apps can also use [`output: 'static'`](./ssg.md) to pre-render all pages at build time. That gives you a fully static site that can be deployed anywhere, with no Cloudflare Worker required.

**Deploy:** `void deploy` builds via Vite, infers bindings, provisions D1/KV/R2 resources, applies migrations, uploads assets and worker, and makes the site live at `{slug}.void.app`. See [Deployment](./deployment.md) for details.

**Detected when any of these exist:**

- `routes/` directory
- `pages/` directory
- `middleware/` directory
- `crons/` directory
- `queues/` directory
- Custom SSR entry (`src/main.ssr.ts` or `src/main.ssr.tsx`)

## Meta Frameworks

Void supports deploying Vite-based meta-framework apps with `void deploy`. The framework owns routing and SSR. Void handles [binding inference](../reference/resource-inference.md), [typed DB queries](./database.md), migrations, and deployment.

| Framework                                           | Detected from package   | Setup guide                                           |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| [TanStack Start](https://tanstack.com/start/latest) | `@tanstack/react-start` | [Guide](../integrations/frameworks/tanstack-start.md) |
| [React Router v7](https://reactrouter.com/)         | `@react-router/dev`     | [Guide](../integrations/frameworks/react-router.md)   |
| [SvelteKit](https://svelte.dev/docs/kit)            | `@sveltejs/kit`         | [Guide](../integrations/frameworks/sveltekit.md)      |
| [Nuxt](https://nuxt.com/)                           | `nuxt`                  | [Guide](../integrations/frameworks/nuxt.md)           |
| [Analog](https://analogjs.org/)                     | `@analogjs/platform`    | [Guide](../integrations/frameworks/analog.md)         |
| [Astro](https://astro.build/)                       | `astro`                 | [Guide](../integrations/frameworks/astro.md)          |

Add `voidPlugin()` to the framework's Vite config to get binding inference, typed DB generation, migration management, cron jobs, queues, and caching. Void-managed auth is not supported in framework mode; use Better Auth's official integration for your framework. See the [Meta Frameworks Integration](../integrations/frameworks/overview.md) for the full feature matrix, deploy pipeline, and per-framework setup guides.

**Deploy:** `void deploy` runs the framework build, packages the output, and deploys to Void. The framework still owns routing and SSR, while Void handles resource provisioning, migrations, and edge hosting.

**Detected when** any of the above packages is in your dependencies.

## Pre-built Static Sites

Any project that produces static files, whether that is an SPA, a static site, or a plain directory. Assets are served directly from the edge, and a minimal passthrough worker is generated automatically. You do not need to write worker code yourself.

**SPAs** (client-side single-page apps) fall back all non-file paths to `index.html` with a 200 status, so client-side routing works out of the box. Detected when `vite` is a dependency and no backend files exist.

**Static sites** (static site generators like VitePress, Docusaurus, or any pre-built directory) produce per-page HTML files. Detected when a known SSG is a dependency, or when using the `--dir` flag.

At the edge, the resolution order is:

1. Exact file path (`/styles.css` → `styles.css`)
2. Nested index (`/about` → `about/index.html`)
3. `404.html` with **status 404** (if the file exists)
4. Plain 404 response

**Deploy:** `void deploy` or `void deploy --dir <path>` uploads static files directly. Assets are served from the edge with automatic caching.

## Adding a backend to a static site

A static site generator plus a few API routes is a Void app, not a static site. Auto-detection sees the SSG dependency first (priority 2 below), so if you leave `inference.appType` unset, `void deploy` refuses rather than deploying the site and silently dropping `routes/`. Tell it which you meant.

To deploy the site **and** the backend, run both builds from one command and let Void's build fold the generated site into its client output:

```json
// void.json
{
  "inference": {
    "appType": "void",
    "build": "vitepress build && vite build"
  }
}
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin()],
  // The SSG's output becomes the static assets of the Void build.
  publicDir: ".vitepress/dist",
});
```

`vitepress build` emits the site, then `vite build` copies `publicDir` into `dist/client` and emits the worker into `dist/ssr`. Keep `voidPlugin()` in the **root** `vite.config.ts` only — not in the generator's own config (e.g. `.vitepress/config.ts`).

Because the worker now owns unmatched requests, add [`routing.notFound`](../reference/config.md#routing-notfound) if you want the generator's `404.html` instead of the SPA-style `index.html` fallback:

```json
{ "routing": { "notFound": "404-page" } }
```

To deploy the static output only and **not** the backend, say so explicitly:

```json
{ "inference": { "appType": "static" } }
```

## Auto-Detection

When running `void deploy` and no `inference.appType` is set in `void.json`, the detection logic runs in this order:

| Priority | Condition                                                                                                       | Type                                        |
| -------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1        | `--dir` flag                                                                                                    | Static (or SPA with `--spa`)                |
| 2        | Known SSG in dependencies (`vitepress`, `@docusaurus/core`)                                                     | Static, builds with SSG CLI                 |
| 2a       | ...and backend files also exist                                                                                 | Refused — set `inference.appType` yourself  |
| 3        | `@tanstack/react-start`, `@react-router/dev`, `@sveltejs/kit`, `nuxt`, `@analogjs/platform`, or `astro` in deps | Framework                                   |
| 4        | Backend files exist (`routes/`, `pages/`, `middleware/`, `crons/`, `queues/`, SSR entry)                        | Void app                                    |
| 5        | `vite` or `vite-plus` in dependencies, no backend files                                                         | SPA, builds with `vite build` or `vp build` |
| 6        | `dist/index.html` or `./index.html` exists                                                                      | Static (no build step)                      |

## Explicit Configuration

To lock the app type and skip auto-detection, set `inference.appType` in [`void.json`](../reference/config.md):

```json
{
  "inference": {
    "appType": "static",
    "outputDir": ".vitepress/dist"
  }
}
```

- `inference.appType`: `"void"`, `"framework"`, `"spa"`, or `"static"`
- `inference.outputDir`: output directory for static app types (relative to project root, defaults to `"dist"`)
