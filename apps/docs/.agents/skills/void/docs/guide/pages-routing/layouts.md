---
outline: deep
---

<script setup>
function layoutBasicItems(ext) {
  return [
    {
      name: "pages/",
      children: [
        { name: `layout${ext}`, description: "Root layout (nav, footer)" },
        { name: `index${ext}` },
        {
          name: "users/",
          children: [
            { name: `layout${ext}`, description: "Nested layout for /users/*" },
            { name: `index${ext}` },
            { name: `[id]${ext}` },
          ],
        },
      ],
    },
  ]
}

function namedLayoutItems(ext) {
  return [
    {
      name: "pages/",
      children: [
        {
          name: "_layouts/",
          children: [
            { name: `landing${ext}`, description: 'named "landing"' },
            { name: `post${ext}`, description: 'named "post"' },
          ],
        },
        { name: `layout${ext}`, description: "default root layout" },
        { name: `index${ext}` },
        {
          name: "blog/",
          children: [
            { name: "hello.md", description: "layout: post" },
            { name: "archive.md", description: "layout: landing" },
          ],
        },
        { name: `pricing${ext}`, description: "layout: !landing (exclusive)" },
      ],
    },
  ]
}

function blogLayoutItems(ext) {
  return [
    {
      name: "pages/",
      children: [
        {
          name: "_layouts/",
          children: [
            { name: `post${ext}`, description: "sidebar, date, author" },
          ],
        },
        { name: `layout${ext}`, description: "nav + footer" },
        {
          name: "blog/",
          children: [
            { name: `layout${ext}`, description: "blog sidebar" },
            { name: "hello.md", description: "layout: post → chain: [root, _layouts/post]" },
            { name: `archive${ext}`, description: "(no layout) → chain: [root, blog/layout]" },
          ],
        },
      ],
    },
  ]
}

</script>

# Layouts & Shared Data

## Layouts

Place a layout file in any `pages/` directory to wrap all pages in that subtree:

<FileTree :items="layoutBasicItems" adapter-tabs default-expanded />

::: code-group

```tsx [React]
// pages/layout.tsx
import { useShared, Link } from "@void/react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { auth } = useShared();
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/users">Users</Link>
        {auth?.user && <span>{auth.user.name}</span>}
      </nav>
      <main>{children}</main>
    </>
  );
}
```

```vue [Vue]
<!-- pages/layout.vue -->
<script setup lang="ts">
import { useShared, Link } from "@void/vue";
const { auth } = useShared();
</script>

<template>
  <nav>
    <Link href="/">Home</Link>
    <Link href="/users">Users</Link>
    <span v-if="auth?.user">{{ auth.user.name }}</span>
  </nav>
  <main>
    <slot />
  </main>
</template>
```

```svelte [Svelte]
<!-- pages/layout.svelte -->
<script>
  import { useShared, Link } from "@void/svelte";
  let { children } = $props();
  const { auth } = useShared();
</script>

<nav>
  <Link href="/">Home</Link>
  <Link href="/users">Users</Link>
  {#if auth?.user}<span>{auth.user.name}</span>{/if}
</nav>
<main>
  {@render children()}
</main>
```

```tsx [Solid]
// pages/layout.tsx
import { useShared, Link } from "@void/solid";
import type { JSX } from "solid-js";

export default function Layout(props: { children: JSX.Element }) {
  const shared = useShared();
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/users">Users</Link>
        {shared.auth?.user && <span>{shared.auth.user.name}</span>}
      </nav>
      <main>{props.children}</main>
    </>
  );
}
```

:::

When a page renders, the layout wraps it. The page component is injected as the layout's children in React, Solid, and Svelte, or as a slot in Vue:

<img src="./layout-nesting.svg" alt="Layout nesting diagram: pages/layout wraps pages/users/layout wraps pages/users/[id] page component" style="max-width: 520px; width: 100%;" />

Layouts nest automatically and persist across navigations within their subtree, so component state is preserved.

## Named Layouts

Named layouts let individual pages opt into a different layout without changing the URL structure. Define them in `_layouts/` directories within `pages/`:

<FileTree :items="namedLayoutItems" adapter-tabs default-expanded />

### Selecting a named layout

Export a `layout` constant from any page:

::: code-group

```tsx [React]
export const layout = "landing";

export default function Page() {
  return <div>This page uses the landing layout</div>;
}
```

```vue [Vue]
<script>
export const layout = "landing";
</script>

<template>
  <div>This page uses the landing layout</div>
</template>
```

```svelte [Svelte]
<script context="module">
export const layout = "landing";
</script>

<div>This page uses the landing layout</div>
```

```tsx [Solid]
export const layout = "landing";

export default function Page() {
  return <div>This page uses the landing layout</div>;
}
```

:::

For markdown pages, use frontmatter:

```md
---
layout: post
---

# My Blog Post
```

### Layout modes

| Value        | Behavior                                                                       |
| ------------ | ------------------------------------------------------------------------------ |
| `"landing"`  | Replace the innermost layout in the chain. Outer ancestor layouts still apply. |
| `"!landing"` | Replace the **entire** chain. Only the named layout wraps the page.            |
| `false`      | No layout wrapping at all. Page renders standalone.                            |

"Innermost" means the deepest layout in the resolved chain. If the chain is `[root, docs/layout]`, the named layout replaces `docs/layout`. If the chain is only `[root]`, it replaces root.

### Resolution order

When a page specifies `layout: "post"`, the scanner walks up the directory tree to find `_layouts/post`:

```
pages/guide/intro.md  (layout: post)

1. pages/guide/_layouts/post.vue  → not found
2. pages/_layouts/post.vue        → found ✓
```

Closest ancestor wins, same as default layout chain. If no matching named layout is found in any ancestor, the build fails with a clear error.

### Examples

**Blog with shared nav but post-specific layout:**

<FileTree :items="blogLayoutItems" adapter-tabs default-expanded />

`layout: post` on `blog/hello.md` replaces the innermost default layout (`blog/layout`) with `_layouts/post`. The root layout still wraps.

**Fullscreen page with no layout:**

::: code-group

```tsx [React]
export const layout = false;

export default function Landing() {
  return (
    <div className="hero fullscreen">
      <h1>Welcome</h1>
    </div>
  );
}
```

```vue [Vue]
<script>
export const layout = false;
</script>

<template>
  <div class="hero fullscreen"><h1>Welcome</h1></div>
</template>
```

:::

**Exclusive layout (skip all ancestors):**

```md
---
layout: "!landing"
---

# Standalone Landing Page
```

Only `_layouts/landing` wraps this page, and the root layout is skipped entirely.

## Shared Data

Middleware can inject data available on every page via `c.set("shared", {...})`. Augment `CloudContextVariables` to type the shared data, and `useShared()` will infer the type automatically:

```ts
// middleware/01.auth.ts
import { defineMiddleware } from "void";
import { getUser, type AuthUser } from "void/auth";

declare module "void" {
  interface CloudContextVariables {
    shared: { auth: { user: AuthUser | null } };
  }
}

export default defineMiddleware(async (c, next) => {
  const user = getUser();
  c.set("shared", { auth: { user } });
  await next();
});
```

Access it on the client with `useShared()`. The return type is inferred from your augmentation:

::: code-group

```tsx [React]
import { useShared } from "@void/react";

export default function Page() {
  const { auth } = useShared(); // { auth: { user: AuthUser | null } }
  return <p>Hello, {auth?.user?.name}</p>;
}
```

```vue [Vue]
<script setup lang="ts">
import { useShared } from "@void/vue";
const { auth } = useShared(); // { auth: { user: AuthUser | null } }
</script>
```

```svelte [Svelte]
<script>
  import { useShared } from "@void/svelte";
  const { auth } = useShared(); // { auth: { user: AuthUser | null } }
</script>
```

```tsx [Solid]
import { useShared } from "@void/solid";

export default function Page() {
  const shared = useShared(); // { auth: { user: AuthUser | null } }
  return <p>Hello, {shared.auth?.user?.name}</p>;
}
```

:::

Shared data is separate from page props. Props come from the loader, while `useShared()` returns global data from middleware. See [Type Safety](../type-safety.md#context-variables) for more on augmenting `CloudContextVariables`.
