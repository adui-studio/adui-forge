---
outline: deep
---

# Pages Routing

Pages routing provides the server-rendered, components-as-pages, collocated-data-loading routing system that is seen in many existing JavaScript meta frameworks. However, pages routing in Void is different from most in that it is **rendering framework agnostic.** It is built on patterns inspired by [Inertia.js](https://inertiajs.com/): The server returns the data, and the component receives it as props. The client-side routing logic is minimal, allowing Void to support any rendering framework Vite can support. Today, React, Vue, Svelte, and Solid have first-party adapters.

Pages mode activates when a `pages/` directory exists. It coexists with `routes/`. Use `pages/` for UI pages and `routes/` for APIs. Components in `pages/` are server-rendered, which means **they run in both Cloudflare Workers and browsers**.

Pages mode is also entirely optional - you can use any client-side router to build a pure client-side SPA that interacts with the backend API via the [typed fetch](../typed-fetch.md) utility.

## Setup

If you start in a scaffoldable empty directory, `void init` can generate this setup for you: it asks whether to scaffold with Vite+ (the default) or plain Vite, asks whether you want React, Vue, Svelte, or Solid Pages mode, then lets you pick a D1 starter, a PostgreSQL starter, or Static Pages. The database-backed starters write the adapter-aware `vite.config.ts`, `pages/`, and `db/` starter files; Static Pages writes just the basic `pages/` setup so you can grow into server features later.

If you're adding Pages mode manually, install a framework adapter alongside `void`:

::: code-group

```sh [React]
npm install @void/react
```

```sh [Vue]
npm install @void/vue
```

```sh [Svelte]
npm install @void/svelte
```

```sh [Solid]
npm install @void/solid
```

:::

Add both plugins to your Vite config:

::: code-group

```ts [React]
// vite.config.ts
import { defineConfig } from "vite";
import { voidPlugin } from "void";
import { voidReact } from "@void/react/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidReact()],
});
```

```ts [Vue]
// vite.config.ts
import { defineConfig } from "vite";
import { voidPlugin } from "void";
import { voidVue } from "@void/vue/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidVue()],
});
```

```ts [Svelte]
// vite.config.ts
import { defineConfig } from "vite";
import { voidPlugin } from "void";
import { voidSvelte } from "@void/svelte/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidSvelte()],
});
```

```ts [Solid]
// vite.config.ts
import { defineConfig } from "vite";
import { voidPlugin } from "void";
import { voidSolid } from "@void/solid/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidSolid()],
});
```

:::

That is the full setup. You do not need an SSR entry, a client entry, or hydration boilerplate because the adapter generates them for you.

Each adapter plugin includes the framework's Vite plugin (`@vitejs/plugin-react`, `@vitejs/plugin-vue`, `@sveltejs/vite-plugin-svelte`, `vite-plugin-solid`) so you don't need to install or configure it separately. Pass framework plugin options via `voidReact({ react: { ... } })`, `voidVue({ vue: { ... } })`, `voidSvelte({ svelte: { ... } })`, or `voidSolid({ solid: { ... } })` if needed.

## Directory Structure

Pages can be flat files such as `about.vue` or directory-based routes such as `about/index.vue`. Both map to the same route:

<PagesFileTree />

Each page can have a companion `.server.ts` file that runs exclusively on the server. It can export:

- A [**loader**](./loaders), which runs on `GET` and returns the data that becomes the page component's props
- [**Actions**](./actions-and-forms), which handle mutations from forms and programmatic calls. Export a single `action` or multiple [named actions](./actions-and-forms#named-actions) when a page has several mutations
- `ssr = false` to opt a route out of server-rendered component HTML while keeping server loaders and client-side routing

File-based routing rules are the same as [server routing](../server-routing.md): `[param]` for dynamic segments, `[...param]` for catch-all, `(group)/` for route groups.

## How Navigation Works

Pages uses an Inertia-style protocol under the hood:

| Request               | Response                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Initial page load     | Full SSR HTML. Client hydrates automatically. Routes with `ssr = false` return a client-mounted shell instead. |
| Subsequent navigation | JSON with component name + props. Client component swap or re-render.                                          |
| Form submission       | Runs action, then returns fresh props or a redirect.                                                           |

This means the first page load is server-rendered for SEO and performance, while later navigations stay fast without full page reloads.

To opt a specific route out of server-rendered component HTML, export `ssr = false` from its companion `.server.ts` file:

```ts
// pages/dashboard.server.ts
import { defineHandler } from "void";

export const ssr = false;

export const loader = defineHandler(async () => {
  return { title: "Dashboard" };
});
```

The loader still runs on the first request, and its props are embedded in the HTML shell. The page component mounts in the browser instead of hydrating server-rendered markup.

Render and prerender flags combine like this:

| Page exports                           | Behavior                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `ssr` unset or `true`                  | Server-render component HTML on request.                                  |
| `ssr = false`                          | Return a client-mounted shell on request.                                 |
| `ssr = false` + `prerender = true`     | Prerender a client-mounted shell with embedded loader data.               |
| `ssr = false` + `prerender = false`    | Return the client-mounted shell only on request; never prerender it.      |
| Island page + `ssr = false`            | Invalid. Island pages already use the island renderer.                    |
| `output: "static"` + `prerender` unset | Auto-prerender pages that have known paths, including client-only shells. |

Use the `Link` component for SPA navigation between pages. It renders an `<a>` tag that intercepts clicks and navigates without a full page reload:

::: code-group

```tsx [React]
import { Link } from "@void/react";

<Link href="/users">Users</Link>
<Link href={`/users/${id}`}>View</Link>
```

```vue [Vue]
<script setup lang="ts">
import { Link } from "@void/vue";
</script>

<template>
  <Link href="/users">Users</Link>
  <Link :href="`/users/${id}`">View</Link>
</template>
```

```svelte [Svelte]
<script>
  import { Link } from "@void/svelte";
</script>

<Link href="/users">Users</Link>
<Link href={`/users/${id}`}>View</Link>
```

```tsx [Solid]
import { Link } from "@void/solid";

<Link href="/users">Users</Link>
<Link href={`/users/${id}`}>View</Link>
```

:::

The `Link` components also support query data, history replacement, document navigation, and cancellable client-side navigation:

```tsx
<Link href="/users" data={{ page: 2, tag: ['active', 'new'] }}>
  Filtered users
</Link>

<Link href="/users" replace>
  Users
</Link>

<Link href="/logout" reloadDocument>
  Sign out
</Link>

<Link
  href="/settings"
  onNavigate={(event) => {
    if (!confirm('Leave this page?')) {
      event.preventDefault();
    }
  }}
>
  Settings
</Link>
```

`prefetch` and `reloadDocument` are GET-only. Passing either prop to a mutation link throws. GET `data` is merged into the rendered `href` query string; arrays become repeated keys, `null` and `undefined` are omitted, and nested objects throw.

For programmatic navigation, use `useRouter()`:

```ts
import { useRouter } from "@void/vue"; // or "@void/react", "@void/svelte", "@void/solid"

const router = useRouter();
router.visit("/users");
router.refresh(); // re-fetch current page props
router.visit("/logout", { method: "POST" }); // non-GET navigation
```

For dynamic route params, use `useParams()` from the same adapter package:

```tsx
import { useParams } from "@void/react";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  return <h1>Post {id}</h1>;
}
```

## Scroll Restoration

The Void Router automatically saves and restores scroll position during client-side navigation:

- **Back/forward navigation** restores the exact scroll position you were at before navigating away.
- **Forward navigation** scrolls to the top of the page.
- **Hash links** (`/docs#api`) scroll to the target element. Same-page hash links (`#section`) skip the server fetch entirely.

This works out of the box with no configuration. If you need to opt out for a specific navigation, pass `preserveScroll: true`:

```ts
router.visit("/users", { preserveScroll: true });
```

`Link` also accepts `preserveScroll`:

::: code-group

```tsx [React]
<Link href="/users" preserveScroll>
  Users
</Link>
```

```vue [Vue]
<Link href="/users" preserve-scroll>Users</Link>
```

```svelte [Svelte]
<Link href="/users" preserveScroll>Users</Link>
```

```tsx [Solid]
<Link href="/users" preserveScroll>
  Users
</Link>
```

:::
