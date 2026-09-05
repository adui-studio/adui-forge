---
outline: deep
---

# Static Assets Caching

Void serves static assets through Cloudflare's global edge network with sensible cache defaults. This page covers how static assets are cached at the edge.

## Hashed assets

Files in Vite's `build.assetsDir` (default `assets/`) are produced with content hashes in the filename, such as `assets/app-Ab3xK9.js`. These files are immutable because the filename changes whenever the content changes, so they get aggressive caching:

```
Cache-Control: public, max-age=31536000, immutable
```

Cached at the edge for up to one year. Browsers cache them indefinitely. Because the cache key is unversioned, hashed assets survive across deploys without re-fetching.

If your Vite config customizes `build.assetsDir`, Void automatically detects this and applies the immutable optimization to the configured directory:

```ts
// vite.config.ts
export default defineConfig({
  build: {
    assetsDir: "static", // hashed assets go to dist/client/static/
  },
});
```

If `build.assetsDir` is set to `""`, meaning hashed files live at the root, the optimization is skipped because there is no directory-based way to distinguish hashed from non-hashed files.

Void also includes presets for where supported meta frameworks (Astro, Nuxt, SvelteKit, etc.) place their hashed assets, so framework-generated assets enjoy optimal caching out of the box.

## Non-hashed assets

Everything else such as `index.html`, `favicon.ico`, and `/about` is edge-cached using deploy-versioned cache keys. On each deploy, the version changes and previous cache entries are invalidated automatically, so there is nothing to purge.

```
Cache-Control: public, s-maxage=31536000, max-age=0, must-revalidate
```

Cached at the edge until the next deploy. Browsers always revalidate on the next request.

**What gets cached:**

- All `GET` requests for non-SSR projects such as SPAs and static sites
- GET requests with file extensions (`.ico`, `.png`, `.css`, etc.) in SSR projects

**What does NOT get cached:**

- `/api/*` routes, which always hit the worker
- SSR-rendered pages (paths without file extensions in SSR projects)
- Non-GET requests
- Non-2xx responses

### Opting out

If your worker serves dynamic content at a URL that looks static (e.g., a dynamically generated image at `/avatar.jpg`), you can prevent caching by setting `Cache-Control: private` or `Cache-Control: no-store` in your response headers. Any response with `Cache-Control` containing `private`, `no-store`, or `no-cache` will bypass the edge cache.

## ETags and 304 Not Modified

All static asset responses include an `ETag` header derived from the file's content hash in R2. When a browser revalidates a cached resource, it sends `If-None-Match` with the previous ETag. If the file has not changed, the edge returns **304 Not Modified** with no body. That saves bandwidth and speeds up page loads.

This happens automatically for all static assets. No configuration is needed.

## Custom headers

You can override caching headers or add your own for any static asset path using [Custom Headers](./headers).

## Request pipeline

Static assets can run in front of the worker, behind the worker, or without any worker at all. Void chooses the pipeline from the app shape so static pages stay static unless application code must inspect document navigations.

### Deploy shapes

| Shape                                                                              | Worker deployed | First handler for assets | First handler for document navigations | Miss behavior                                                                                                          |
| ---------------------------------------------------------------------------------- | --------------- | ------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `inference.appType: "static"`                                                      | No              | Asset platform           | Asset platform                         | Platform 404 page.                                                                                                     |
| Static SPA deploy                                                                  | No              | Asset platform           | Asset platform                         | Platform serves `/index.html` for unmatched navigations. If user `routing.fallbacks` exist, Void ships fallback rules. |
| Void app with only `/api` routes or managed auth                                   | Yes             | Worker first for `/api`  | Asset platform                         | Static navigations keep the platform SPA fallback; API requests, including document navigations, reach the worker.     |
| Void app with `middleware/`, non-`/api` routes, document WebSockets, live bindings | Yes             | Worker first             | Worker first                           | Asset misses stay 404, then the worker serves `/index.html` for HTML requests after routes and middleware run.         |
| Pages, SSR, and framework apps                                                     | Yes             | Worker first             | Worker first                           | Asset misses stay 404. Pages, SSR, or framework rendering owns HTML responses, including intentional HTML 404s.        |

### Worker-first Void apps

For worker-owned HTML, Void sets Cloudflare assets to `not_found_handling: "none"` and configures `run_worker_first`. The request order is:

1. Platform routing rules that always run before assets, such as redirects and forced rewrites.
2. Worker route table, middleware, auth, WebSocket upgrades, Pages, or SSR.
3. `env.ASSETS.fetch()` from inside the worker for static files.
4. For non-Pages, non-SSR Void apps only, a worker-side SPA fallback to `/index.html` when the original request accepts HTML.
5. The worker's original 404.

This is the path needed for preview auth and other middleware. Cloudflare's platform SPA fallback can serve `index.html` directly for browser navigations; when that happens, middleware never sees the request. Worker-owned HTML avoids that by moving fallback HTML behind middleware.

### Asset-first Void apps

For Void apps with only `/api` routes, Void keeps the platform SPA fallback and scopes `run_worker_first` to `/api` and `/api/*`. Static assets and non-API SPA navigations stay on the asset platform. API requests, including browser document navigations such as OAuth callbacks, reach the worker instead of being rewritten to `index.html`.

### Unmatched requests

`not_found_handling` decides what the asset layer does with a request that matched no asset and no worker route. Void infers it:

| App shape                                         | Inferred value                   | Result for an unknown URL        |
| ------------------------------------------------- | -------------------------------- | -------------------------------- |
| Pages or SSR                                      | `none`                           | The worker's own 404             |
| Worker owns HTML, no `pages/`, no SSR entry       | `none` + worker fallback         | `index.html` with status **200** |
| Asset-first (only `/api` routes, or none)         | `single-page-application`        | `index.html` with status **200** |
| Framework deploy (SvelteKit, Nuxt, Analog, Astro) | `none` — pinned, not overridable | The framework worker's own 404   |

The middle row is a worker with `middleware/`, a route outside `/api`, a document websocket, or Live, but no `pages/` and no SSR entry. `run_worker_first: ['/**']` sends everything to the worker, which bypasses the platform's SPA switch, so the generated worker does that fallback itself for HTML navigations — after your middleware has run, so auth gates and OAuth callbacks still see the request first.

The SPA fallback is right for a single-page app, where deep links must boot the client router. It is wrong for a site whose HTML was generated per page: unknown URLs return 200 instead of 404, and the generator's `404.html` is never served. Nothing in a built asset tree distinguishes the two, so Void does not guess — override it with [`routing.notFound`](../../reference/config.md#routing-notfound):

```json
{ "routing": { "notFound": "404-page" } }
```

Accepted values are `"single-page-application"`, `"404-page"`, and `"none"`. `run_worker_first` keeps its inferred value, so API routes, auth, and `/__void/*` still reach the worker first. Setting anything other than `"single-page-application"` also turns off the worker-side `index.html` fallback described above — otherwise it would answer the request before `not_found_handling` was ever consulted. With `"404-page"` the worker serves whatever the asset binding returns for the unmatched path, which is Cloudflare's nearest `404.html` — but only for HTML navigations (requests whose `Accept` includes `text/html`), so an API route that deliberately returns a 404 keeps its own body, status and headers. If the build has no `404.html`, the worker's own 404 is kept.

The last row is the exception: `routing.notFound` is **ignored** for SvelteKit, Nuxt, Analog, and Astro deploys, and `void deploy` warns when you set it. Those deploys emit no `run_worker_first`, so the asset layer already answers first and real prerendered files win — `not_found_handling` would only change what the framework's own `env.ASSETS.fetch()` delegation returns, where `"single-page-application"` turns genuine 404s into the prerendered home page at 200 and `"404-page"` takes the 404 away from the framework's own error route. TanStack Start and React Router deploys are not affected; they follow the rows above.

### Generated config

Void owns the generated asset routing policy during dev and build. If a root `wrangler.jsonc` contains stale `not_found_handling` or `run_worker_first` values, Void replaces those fields so generated config cannot accidentally change which layer sees a request first.

## API routes and SSR pages

API responses (`/api/*`) and SSR-rendered pages without file extensions always hit the worker. They are **not** edge-cached by the dispatch layer.
