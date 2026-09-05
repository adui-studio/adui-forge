---
outline: deep
---

# Static Site Generation (SSG)

Set `output: "static"` in `void.json` to prerender all pages at build time:

```json
{
  "output": "static"
}
```

When `output` is `"static"`:

- All pages default to `prerender = true`, so they are rendered during `vite build` and written as HTML files to `dist/client/`.
- Use `export const prerender = false` in a page's `.server.ts` to opt out. That page will be server-rendered on request.
- Dynamic pages without `getPrerenderPaths()` are implicitly not prerendered (the paths aren't known at build time).
- The build output is self-contained and works for `wrangler deploy`, self-hosting, or `void deploy`.

## How it works

During `vite build`, after both the worker and client bundles are written to disk, Void spins up Miniflare with the built worker and fetches each page. The HTML responses are written to `dist/client/` as static files (e.g. `/about` becomes `dist/client/about.html`).

## Per-page overrides

Individual pages can opt out of prerendering:

```ts
// pages/dashboard.server.ts
export const prerender = false;
```

Dynamic pages with `getPrerenderPaths()` are prerendered for the returned param combinations:

```ts
// pages/blog/[slug].server.ts
export async function getPrerenderPaths() {
  return [{ slug: "hello-world" }, { slug: "getting-started" }];
}
```

Dynamic pages **without** `getPrerenderPaths()` are not prerendered because the paths are not known at build time. These pages are served dynamically by the worker at runtime.

## Comparison with edge prerendering

| `output` value       | Default prerender | Per-page override                | Prerender timing           |
| -------------------- | ----------------- | -------------------------------- | -------------------------- |
| `"server"` (default) | `false`           | `export const prerender = true`  | Deploy-time (platform ISR) |
| `"static"`           | `true`            | `export const prerender = false` | Build-time (`vite build`)  |

When `output` is omitted or set to `"server"`, behavior is unchanged. `export const prerender = true` opts individual pages into deploy-time [edge prerendering](./edge/prerendering.md).

## Deployment behavior

When you run `void deploy` with `output: "static"`, Void inspects the build output to decide the optimal deploy strategy:

- **Fully static:** if every page is prerendered and there are no API routes, middleware, cron jobs, or queues, Void deploys as a pure static site with no worker.
- **Hybrid:** if any pages are not prerenderable, such as dynamic pages without `getPrerenderPaths()` or pages with `export const prerender = false`, a worker is deployed to handle those routes at runtime. Prerendered pages are still served as static assets.

You do not need to configure this. Void detects it automatically from your pages and project structure.

## Relationship to `inference.appType: "static"`

The `inference.appType` field describes app type (SPA, static, void), while `output` controls rendering strategy:

|              | `inference.appType: "static"`                   | `output: "static"`                            |
| ------------ | ----------------------------------------------- | --------------------------------------------- |
| **What**     | Deploy a pre-built static site (no Void plugin) | Prerender a Void app at build time            |
| **Worker**   | None (static assets only)                       | Only if some pages can't be prerendered       |
| **Use case** | VitePress, plain HTML, external SSG tools       | Void apps with mostly or fully static content |

When all pages are prerendered and there are no backend features, `output: "static"` produces the same deploy result as `inference.appType: "static"`: pure static assets with no worker. The difference is that `output: "static"` figures this out by analyzing your build output, while `inference.appType: "static"` is a manual declaration for non-Void projects.
