---
outline: deep
---

# Custom SSR

Void supports framework-agnostic SSR via explicit server and client entries. This is for advanced use cases where you want full control over rendering and hydration.

::: tip
For most apps, [Pages Routing](./pages-routing/overview) handles SSR automatically. You do not need entry files or hydration code.
:::

## Relationship to Pages Routing

Custom SSR is separate from Pages Routing. Use Custom SSR when you want to bring
your own root component, router, data loading, HTML shell, and hydration logic.

The `App` component in the examples below is not a Void convention and it is not
the same thing as `pages/layout.tsx`. It is just the root component for your
custom-rendered application:

```tsx
// src/App.tsx
export default function App({ url }: { url: string }) {
  return url === "/about" ? <main>About</main> : <main>Home</main>;
}
```

If you are using `pages/` with `@void/react`, `@void/vue`, `@void/svelte`, or
`@void/solid`, do not create `src/main.ssr.*`, `src/main.client.*`, or
`src/App.*` for Pages mode. The adapter generates the SSR and hydration entries
and automatically composes your `pages/layout.*`, route components, loaders, and
actions.

## Required entries

SSR mode is enabled when both of these exist:

- `src/main.ssr.ts` or `src/main.ssr.tsx`
- `src/main.client.ts` or `src/main.client.tsx`

Only one server entry and one client entry may exist.
If only one side is present, build/deploy fails with a clear error.

## Render API

`src/main.ssr.ts(x)` must export either:

```ts
render(c: CloudContext, assetTags: RenderAssetTags): Response | Promise<Response>
```

or:

```ts
export default defineRender((c, assetTags) => Response | Promise<Response>);
```

The recommended form is `defineRender(...)` for inferred types.

`assetTags` contains the HTML tags for your client assets:

```ts
{
  css: string; // stylesheet links for <head>
  preloads: string; // modulepreload/Vite client+preamble tags for <head>
  body: string; // main client entry script tag before </body>
}
```

If no render export is found, build/deploy fails with a clear error.

Example:

```tsx
import { renderToString } from "react-dom/server";
import { defineRender } from "void";
import App from "./App";

export default defineRender(async (c, assetTags) => {
  const url = new URL(c.req.raw.url);
  const html = renderToString(<App url={url.pathname} />);
  return new Response(
    `<!doctype html>
<html>
  <head>${assetTags.css}${assetTags.preloads}</head>
  <body>
    <div id="root">${html}</div>
    ${assetTags.body}
  </body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
});
```

`src/main.client.ts(x)` should hydrate/mount your app:

```tsx
import { hydrateRoot } from "react-dom/client";
import App from "./App";

hydrateRoot(document.getElementById("root")!, <App url={window.location.pathname} />);
```

## Client Asset Injection

Void no longer mutates your rendered HTML automatically.
You decide whether and where to inject client asset tags.

The `assetTags` values are computed by Void:

- In production: from `dist/client/.vite/manifest.json` (entry script, CSS, modulepreload)
- In dev: includes Vite HMR client and React refresh preamble (when React plugin is active), plus the client entry script

## Caching

See [Revalidation](./edge/revalidation.md) for stale-while-revalidate caching of SSR pages.

## Request flow

With SSR enabled:

1. `/api/*` requests go to worker API routes
2. static asset hits are served from R2
3. unmatched non-API requests fall back to `render(c, assetTags)`

Without SSR entries, non-API requests keep SPA static fallback behavior.
