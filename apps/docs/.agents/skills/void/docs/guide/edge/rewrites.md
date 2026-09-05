---
outline: deep
---

# Rewrites

Define URL rewrites in [`void.json`](../../reference/config) using the `routing.rewrites` field. Keys are source URL patterns, values are destination paths. A rewrite serves content from the destination path **without changing the URL in the browser** — the user sees the original URL, but the server resolves content from the destination.

```json
{
  "routing": {
    "rewrites": {
      "/": "/en",
      "/docs": "/en/docs",
      "/docs/*": "/en/docs/:splat"
    }
  }
}
```

## When to use rewrites

Use rewrites instead of [redirects](./redirects) when you want to decouple the **public URL** from the **internal route** without the user seeing a URL change. Common scenarios:

- **i18n routing** — serve the default locale at unprefixed paths (`/docs` serves `/en/docs`)
- **URL restructuring** — reorganize internal route files without changing public URLs or SEO
- **Vanity URLs** — map `/pricing` to `/marketing/pricing-page` without exposing the internal structure
- **API versioning** — route `/api/users` to `/api/v3/users` internally so consumers use clean, unversioned endpoints
- **Incremental migration** — old URL structure continues working at the edge while route handlers move to new paths
- **Multi-app composition** — serve different internal apps under a unified URL namespace (e.g., `/docs/*` rewrites to a docs app, `/app/*` to the main app)

If you **do** want the user to see the new URL (e.g., for SEO canonical signals or moving a page permanently), use a [redirect](./redirects) instead.

## Rules

- **Source patterns** start with `/`. `*` matches any characters including `/`.
- **Destinations** are strings starting with `/` (only internal paths are supported).
- `:splat` in the destination is replaced with the portion of the path matched by `*` in the source pattern.
- When multiple rules match, the **first match wins**. Put more-specific rules above more-general ones (matches Netlify `_redirects` and Vercel `vercel.json` semantics).
- On the default target, rewrites are evaluated at the edge **before** the request reaches the worker. On `node` / `bun` / `deno` targets they run in-process as Hono middleware, still before route dispatch. Either way, the rewritten path is then used for static asset serving, ISR, and SSR.
- Unlike redirects, rewrites do **not** change the URL in the browser or send a `Location` header.

## Example: i18n routing

Define route files only under `[locale]/` and rewrite the default locale to unprefixed paths:

```json
{
  "routing": {
    "rewrites": {
      "/": "/en",
      "/docs": "/en/docs",
      "/docs/*": "/en/docs/:splat"
    }
  }
}
```

A request to `/docs/getting-started` serves the content from `/en/docs/getting-started`, but the browser URL stays at `/docs/getting-started`. Non-default locales like `/zh-CN/docs/getting-started` work as-is because they match the `[locale]/` route directly.

## Example: vanity URLs

Map short marketing URLs to internal route paths:

```json
{
  "routing": {
    "rewrites": {
      "/pricing": "/marketing/pricing-page",
      "/start": "/onboarding/get-started",
      "/jobs": "/company/careers"
    }
  }
}
```

## Example: API versioning

Route unversioned API paths to the current version internally:

```json
{
  "routing": {
    "rewrites": {
      "/api/users": "/api/v3/users",
      "/api/users/*": "/api/v3/users/:splat"
    }
  }
}
```

When v4 ships, update the rewrite — no client-side changes needed.

## Example: path restructuring

After reorganizing from `/blog/:slug` to `/posts/:slug`, keep the old URLs working:

```json
{
  "routing": {
    "rewrites": {
      "/blog/*": "/posts/:splat"
    }
  }
}
```

Unlike a redirect, users on `/blog/hello-world` won't see the URL change — they'll just see the content from `/posts/hello-world`.

## Programmatic rewrites in middleware

For dynamic rewrite logic — like i18n locale negotiation based on cookies or headers — use `c.rewrite()` in middleware:

```ts
import { defineMiddleware } from "void";

export default defineMiddleware(async (c, next) => {
  const locale = detectLocale(c.req);
  if (!c.req.path.match(/^\/(en|zh-CN)\//)) {
    return c.rewrite(`/${locale}${c.req.path}`);
  }
  return next();
});
```

`c.rewrite(path)` re-dispatches the request through the router with the new pathname. You must `return` the result — same shape as `c.redirect()`. A queryless destination preserves the incoming query string; a destination with `?` replaces it, so `c.rewrite('/search')` keeps `?q=...` and `c.rewrite('/search?q=all')` forwards exactly `?q=all`.

The `path` argument is typed as [`RewriteDestination`](../../reference/api#rewritedestination), a union of your generated route patterns plus `string`. Known route patterns (e.g. `/posts/[id]`, `/en/docs`) surface as autocomplete entries in your editor, while interpolated strings like ``c.rewrite(`/${locale}${c.req.path}`)`` stay accepted by design. Treat it as autocomplete, not a proof of reachability.

### Runtime rewrites cannot reach static assets

`c.rewrite()` can only re-dispatch to paths the worker itself handles — routes, SSR entries, API handlers. It **cannot** re-dispatch into the static asset handler, because the Void platform serves assets in front of your worker. A call like `c.rewrite('/hero.png')` re-enters the worker's route table, doesn't match anything, and 404s.

This is enforced at the call site: if the destination's final path segment ends in a known static-asset extension, `c.rewrite()` throws `VoidAssetRewriteError` (exported from `"void"`, catchable by name) before the re-dispatch, with the attempted destination in the message. Query strings and fragments are stripped before matching, so `c.rewrite('/hero.png?v=2')` also throws.

The guarded extensions are:

```
.png .jpg .jpeg .gif .webp .avif .svg .ico
.css .js .mjs .cjs
.woff .woff2 .ttf .otf .eot
.mp4 .webm .mp3 .wav
.pdf .txt .xml .json .wasm .map
```

`.html` is deliberately **excluded** from this list. A path like `/about.html` is ambiguous — it may be a real SSR/SPA route handler rather than a static file — so banning `.html` would produce false positives for apps that route on explicit `.html` URLs. `c.rewrite('/about.html')` is allowed; if it 404s, the existing behavior stands and the dev `X-Void-Routing` trace header is your debug hook.

Static rewrites are different: `_redirects` `200!` entries and `routing.rewrites` run at the platform layer **before** the asset handler, so they _can_ rewrite into assets. If you need "rewrite into an asset" behavior dynamically, model it as a static rule (possibly with a broader source pattern) rather than doing it from middleware.

**Loop prevention:** Single-hop rewrite loops are prevented automatically. When `c.rewrite('/foo')` re-dispatches the request, the runtime records the new `Request` in an internal `WeakMap<Request, URL>` (keyed on the `Request` identity, value = pre-rewrite URL) so static routing rules are skipped on the second pass — even if `/foo` would itself match a rewrite rule, it won't rewrite again. The guard is identity-based on the in-memory `Request` object, so client-supplied headers cannot spoof or bypass it. The pre-rewrite URL is exposed to re-dispatched handlers via [`c.originalUrl()`](#original-url-access).

What the guard **doesn't** catch are multi-hop user-written loops across separate middleware: middleware A rewrites `/a → /b`, middleware B rewrites `/b → /c`, middleware C rewrites `/c → /a`. Each hop constructs a fresh `Request`, so the per-request guard can't see the cycle. If you chain rewrites across middleware, write each hop so it only rewrites paths that aren't already in its target shape.

Also avoid deep rewrite chains for performance: every hop re-runs all middleware from the top, so `/a → /b → /c → /d` costs four router passes.

### Performance notes

- Static `routing.rewrites` and `routing.fallbacks` rules are evaluated in order, first-match-wins, at O(rules) per request. The list is small in practice, but keep it bounded — don't programmatically generate thousands of entries.
- Each `c.rewrite()` hop replays the full middleware stack against a fresh `Request`. A chain of three middleware rewrites with four middleware in the stack is roughly twelve middleware invocations, not four.
- The WeakMap loop guard is keyed on the `Request` identity and only suppresses the _static rules_ middleware on re-dispatched requests. User middleware is not guarded: if `c.rewrite('/a')` lands on `/a`, and middleware on `/a` calls `c.rewrite('/b')`, that second hop runs — each hop allocates a new `Request`, so the guard never matches. Chain depth is your responsibility.

### Side effects in re-dispatched middleware

Because every hop replays the full middleware stack, any side-effectful middleware fires twice (or N times for deep chains): DB lookups, session/auth checks, rate-limiter increments, and request loggers all double-count. For example, an auth middleware that logs every request will log twice for every rewritten request.

To skip idempotent-unsafe work on the second pass, use `c.isRewritten()`:

```ts
if (c.isRewritten()) return next();
```

`c.isRewritten()` returns `true` when the request was re-dispatched by a rewrite (whether from a static rule at the edge or `c.rewrite()` in middleware). Internally the framework tracks rewrites in an in-worker `WeakMap<Request, URL>` keyed on `c.req.raw` — the helper just checks whether the current `Request` has an entry. The `X-Void-Original-URL` header is only the wire format between the edge dispatcher and the worker; entry middleware migrates it into the WeakMap once per request, and from that point on the map is the single source of truth.

::: tip
This is the recommended approach for i18n libraries. The library can export a middleware factory that handles locale detection and rewriting, and users just drop it into their `middleware/` directory.
:::

## Original URL access

When a request has been rewritten — either by a static rule at the edge or by `c.rewrite()` in middleware — `c.originalUrl()` returns the URL the user originally requested. This is useful for canonical links, locale detection, and building correct hrefs:

```ts
export default defineHandler((c) => {
  const original = c.originalUrl();
  // original is a `URL` instance for the full URL the user requested
  // before the rewrite, or null if the request was not rewritten.
});
```

Internally this reads the pre-rewrite URL from an in-worker `WeakMap<Request, URL>` keyed on `c.req.raw`. When a request crosses the edge, Void's dispatcher sets `X-Void-Original-URL` on the forwarded request; entry middleware migrates that header into the WeakMap once, and every subsequent `c.rewrite()` hop writes straight into the map. The header on the wire is only the hand-off format — in-worker, the WeakMap is the single source of truth, so there's no per-call header parse.

## Fallbacks

`routing.fallbacks` shares the same shape as `rewrites` but runs **only when no static asset or route matched** — i.e. the request would otherwise return a 404. This lets you add catch-all rewrites without preempting real routes.

In Void apps, production dispatch only treats generated no-route 404s as fallback-eligible. A route handler or API endpoint that intentionally returns `404` is returned as-is, so catch-all fallbacks do not turn missing API resources into HTML. Third-party framework deployments do not expose Void's no-route marker, so their fallback rules still apply after the framework worker returns `404`.

```json
{
  "routing": {
    "fallbacks": {
      "/*": "/index.html"
    }
  }
}
```

Common uses:

- **SPA shell** — serve `/index.html` for any unmatched path so client-side routing can take over (for app types that don't already do this automatically).
- **Default-locale catch-all** — send unmatched paths to `/en/:splat` without stealing requests that already resolve to an existing page under `/zh-CN/…`, `/ja/…`, etc.

Ordering:

- `rewrites` are evaluated **before** the static asset lookup; a matching rule always wins.
- `fallbacks` are evaluated **after** the static asset lookup, only when it would 404.

Use `rewrites` when you want to force a path mapping regardless of what exists; use `fallbacks` when the rule should only kick in as a safety net.

### SPA app type + `routing.fallbacks`

For the `spa` app type, the platform already serves `/index.html` for any asset miss by default (`not_found_handling: 'single-page-application'`). Adding `routing.fallbacks` to a SPA app is **additive, not an override**:

1. Your `routing.fallbacks` rules are checked first, in the order they appear (first match wins among user rules).
2. If none of them match, the implicit `/* → /index.html` SPA fallback still fires.

So a SPA app can carve out specific paths without losing the SPA shell behavior for everything else:

```json
{
  "routing": {
    "fallbacks": {
      "/docs/*": "/docs.html"
    }
  }
}
```

With this config, an asset miss under `/docs/getting-started` resolves to `/docs.html`, while an asset miss under `/app/settings` still resolves to `/index.html` (the SPA default).

You don't need to write `"/*": "/index.html"` yourself — the CLI **appends** a synthetic `{ source: '/*', destination: '/index.html' }` rule to the fallback list when packaging a SPA deploy that has user fallbacks. Because evaluation is first-match-wins, user rules come before the synthetic entry and take precedence; the synthetic rule only fires when no user rule matched. This is why the shipped manifest may contain more fallback rules than you wrote in `void.json`. If you do write `"/*": "/index.html"` yourself, the CLI emits a warning on `void deploy` noting that the rule duplicates the default and can be omitted.

## `_redirects` file

Rewrites can also be defined in a `_redirects` file placed in Vite's `publicDir` (defaults to `public/`). Void mirrors Netlify-compat semantics for the `200` status code:

```text
# plain 200 = fallback (asset-miss only, equivalent to routing.fallbacks)
/*         /index.html    200

# 200! with force suffix = always rewrite (equivalent to routing.rewrites)
/docs/*    /en/docs/:splat 200!
```

| File-based form | `void.json` equivalent | Behavior                                                                 |
| --------------- | ---------------------- | ------------------------------------------------------------------------ |
| `... 200`       | `routing.fallbacks`    | Fires only when no static asset and no route matched (would have 404'd). |
| `... 200!`      | `routing.rewrites`     | Always fires, overriding any static asset that would have served.        |

- `void.json` rules are applied **before** file-based rules. Since the first match wins, `routing.rewrites` / `routing.fallbacks` in `void.json` take precedence.
- The `_redirects` file can mix 3xx redirects, `200` fallbacks, and `200!` force rewrites. Ordering is preserved within each bucket.
- The `!` force suffix is only meaningful on `200`. On a 3xx entry like `301!`, the `!` is silently stripped — 3xx redirects always "force" by their nature (they change the URL), so the suffix is meaningless. `void deploy` prints a single aggregated warning tallying all `301!` / `302!` / `307!` / `308!` entries so you can clean them up.

## Precedence: `_redirects` vs `void.json`

When the same source pattern appears in both a `_redirects` file and `void.json` (`routing.redirects` / `routing.rewrites` / `routing.fallbacks`), the rules don't replace each other — they **merge into a single ordered list per phase**, and the first match wins.

Rules are bucketed by phase before merging:

- **Pre-asset phase** (always fires, runs before static asset lookup): `routing.redirects` + `routing.rewrites` + `_redirects` 3xx entries + `_redirects` `200!` entries.
- **Post-asset phase** (only fires on an asset miss): `routing.fallbacks` + `_redirects` plain `200` entries. For SPA app types, the synthetic `/* → /index.html` rule is **appended last** in this phase, so user fallbacks evaluated earlier take precedence under first-match-wins.

Within each phase, the order is always: **`void.json` rules first, then `_redirects` file rules**. Because evaluation is first-match-wins, **`void.json` rules override `_redirects` rules for the same source**. This holds even though `_redirects` is "closer to the build output" — intuitions like "file wins" or "whichever I wrote later in the file wins" are both wrong.

### Concrete example

```text
# _redirects
/docs/*    /en/docs/:splat    200!
```

```json
// void.json
{
  "routing": {
    "rewrites": {
      "/docs/*": "/handbook/:splat"
    }
  }
}
```

A request to `/docs/intro` matches both rules. Merged order is `[void.json: /docs/* → /handbook/:splat, _redirects: /docs/* → /en/docs/:splat]`, so `void.json` wins and the request resolves to `/handbook/intro`.

To confirm precedence in practice, check the [`X-Void-Routing` dev header](#debugging-with-x-void-routing) on any response during `vite dev` — it names the winning rule and its origin (`_redirects:<line>` vs `void.json#routing.rewrites`).

## How rewrites work

**Static rewrites** (`void.json` and `_redirects` file):

1. `void deploy` reads rewrite rules from the `_redirects` file (status `200` entries) and `routing.rewrites` in `void.json`, then includes them in the deploy manifest alongside redirect rules.
2. The platform stores the rules in the KV routing entry for your project.
3. The dispatch worker evaluates all routing rules (redirects and rewrites) before any worker invocation. If a rewrite matches, the request pathname is updated internally and the request continues through the normal pipeline (static assets, ISR, worker). The original URL is passed as `X-Void-Original-URL`.

**Middleware rewrites** (`c.rewrite()`):

1. The request reaches the worker with its original (or edge-rewritten) pathname.
2. Your middleware calls `c.rewrite(newPath)`, which constructs a new request with the rewritten pathname and re-dispatches it through the Hono router.
3. The re-dispatched request runs through all middleware and route handlers as if it were a fresh request to the new path.

Static rewrites are evaluated at the edge (zero-cost). Middleware rewrites run inside the worker (adds a re-dispatch but enables dynamic logic).

## Caveat: client navigation skips rewrites

Rewrites run on the server. A full HTTP request to `/docs` resolves through `routing.rewrites` and serves `/en/docs` content. But a client-side `<Link to="/docs">` navigation in Pages mode fetches loader data directly for `/docs` — the Void Router doesn't know about the server's rewrite table, so there's no lookup against `/en/docs` on that path.

In practice this only matters when the source and destination have **different loader behavior**. If `/docs` has no route handler but `/en/docs` does, clicking a `<Link to="/docs">` will fail where a fresh page load would succeed. The first render (server) and a subsequent client nav (CSR) to the same URL can diverge.

Two mitigations:

- Use a plain `<a href="/docs">` when you need the navigation to round-trip through the server (and therefore through rewrites).
- If the URL change is meant to be authoritative, use a [redirect](./redirects) instead — the Void Router follows redirects via HTTP, so behavior is consistent.

## ISR cache keys with rewrites

If you use [`routing.revalidate`](./revalidation) on a dispatch rewrite (`routing.rewrites`, `routing.fallbacks`, or `_redirects` 200/200!), the cache slot is keyed on the **rewritten** pathname plus the original request URL's pathname. By default, query parameters are dropped from the rewrite variant key to avoid unbounded cache fanout; add `routing.revalidateQueryAllowlist` when selected query params should vary cached output. So a direct request to `/en/docs/foo` and a rewrite from `/docs/foo → /en/docs/foo` cache independently — useful when your worker reads `c.isRewritten()` or `c.originalUrl()`. Middleware `c.rewrite()` runs after ISR lookup, so it does not create a separate ISR variant.

`revalidate({ paths })` operates on the rewritten pathname (the slot's primary key). Purging `/en/docs/foo` removes all variants — direct + every rewrite source — under that path. Purging the source path (`/docs/foo`) invalidates nothing, because no slot is written under the source.

## Debugging with `X-Void-Routing`

During `vite dev`, every response carries an `X-Void-Routing` header that traces how the request was resolved. Open the Network tab in devtools and inspect the response headers:

```
X-Void-Routing: redirect[/old] -> /new 301 (_redirects:12)
X-Void-Routing: rewrite[/api/*] -> /backend/:splat (void.json#routing.rewrites)
X-Void-Routing: fallback[/docs/*] -> /docs.html (void.json#routing.fallbacks)
X-Void-Routing: c.rewrite -> /new-path (middleware)
X-Void-Routing: pass-through
```

Phases are separated by `->` so the diagnostic value stays valid as an HTTP header. The parenthesised source hint points at the exact declaration — a line number for `_redirects`, a config path for `void.json`, or `spa-default` for the synthetic SPA catch-all. The header is **only emitted in dev** — production builds strip both the trace code and the per-rule `origin` metadata from the bundle and manifest.

::: info What fires in `vite dev`
`vite dev` applies the full static routing pipeline on every target — `node`, `bun`, `deno`, and the default target alike. `void.json` rules (`routing.redirects` / `routing.rewrites` / `routing.fallbacks` / `routing.headers`) and file-based rules (`public/_redirects`, `public/_headers`) are merged at plugin load and compiled into the Hono middleware your worker runs behind. Editing `_redirects` or `_headers` during a dev session re-runs the merge and reloads the page — no restart needed. `c.rewrite()` calls in middleware work everywhere because they live inside the worker itself, and the `X-Void-Routing` dev header reports every decision on every target.

A few things still only run in the deployed runtime, not `vite dev`:

- [ISR caching](./revalidation) (`routing.revalidate`) — served cold in dev, no cached slot warm-ups.
- Custom-domain rewriting and per-project asset prefixes — dev always runs against the root.
- AI Gateway metering for `void/ai` calls — dev hits the provider directly.

For everything else, the rule that fires in `vite dev` is the rule that will fire after `void deploy`.
:::
