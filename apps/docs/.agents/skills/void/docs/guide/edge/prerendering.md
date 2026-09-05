---
outline: deep
---

# Edge Prerendering

You can instruct Void to prerender a page so it is served from cache immediately after a new deploy. Prerendering happens on the platform at deploy time. The platform invokes the uploaded worker and writes the result to the edge cache.

- [Markdown pages](../pages-routing/markdown.md) are auto-prerendered.
- [Island pages](../pages-routing/islands) with no companion loader and no dynamic params are also auto-prerendered.

## Static pages (no params)

Export `prerender = true` from the companion `.server.ts` file:

```ts
// pages/about.server.ts
export const prerender = true;

export const loader = defineHandler(async (c) => {
  // ...
});
```

Pages with no dynamic params are automatically prerendered at their URL pattern (e.g. `/about`).

## Dynamic pages (with params)

For pages with URL params, also export `getPrerenderPaths()` to specify which param combinations to prerender:

```ts
// pages/blog/[slug].server.ts
export const prerender = true;

export async function getPrerenderPaths() {
  // Return param objects matching the URL pattern
  return [{ slug: "hello-world" }, { slug: "getting-started" }];
}

export const loader = defineHandler(async (c) => {
  // ...
});
```

## Custom SSR

In custom SSR mode (`src/main.ssr.ts`), export `getPrerenderPaths()` at the top level. Since there's no file-based routing, return full path strings:

```ts
// src/main.ssr.ts
export const prerender = true;

export async function getPrerenderPaths() {
  return ["/", "/about", "/blog/hello-world"];
}

export default defineRender(async (c, assetTags) => {
  // ...
});
```

## Relationship to revalidation

Pages with long revalidate TTLs (e.g. 1 year) are effectively static, but the first visitor after a deploy hits a cold cache. This is where prerendering helps - it ensures your users never get slow requests.

Enabling prerendering for a page automatically sets `revalidate` to 1 year, so you don't need to export it yourself. Since the ISR cache is cleared on every deploy, the TTL only needs to be long enough to last between deploys.

You can also explicitly set to it a different value to override the default:

```ts
// pages/about.server.ts
export const prerender = true;
export const revalidate = 3600;
```

Just be aware that if no new deploy happens before the revalidate expires, the first user request after expiration will miss the cache and incur a full render.

## Behavior details

- Prerender happens once per deployment, before traffic is routed to the new version. Prerendered pages are cached at the edge.
- Each deploy clears the ISR cache. The deployment shows `"prerendering"` during this phase.
- Only paths with a positive revalidate TTL are prerendered (TTL `0` is skipped).
- Prerender failures are logged but never block the deploy. The page will render on the first request as usual.
