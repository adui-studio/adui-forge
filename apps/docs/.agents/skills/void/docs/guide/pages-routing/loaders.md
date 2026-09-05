---
outline: deep
---

# Loaders & Props

Every page can have a companion `.server.ts` file that exports a `loader`. Server handlers use the same `defineHandler` API as [server routes](../server-routing.md), so you get the same typed `c.env` bindings and Hono context methods.

## Defining a Loader

`loader` runs on GET requests and returns an object that becomes the page's props:

```ts
// pages/users/index.server.ts
import { defineHandler } from "void";
import type { InferProps } from "void";
import { db } from "void/db";
import { users } from "@schema";

export type Props = InferProps<typeof loader>; // [!code highlight]

export const loader = defineHandler(async (c) => {
  return { users: await db.select().from(users) };
});
```

`InferProps` extracts the return type from a `defineHandler` call, so you don't need to maintain a separate interface. You can also write the interface explicitly if you prefer:

```ts
export interface Props {
  users: Array<{ id: number; name: string; email: string }>;
}

export const loader = defineHandler<Props>(async (c) => {
  return { users: await db.select().from(users) };
});
```

## Using the Data in Page Components

The component receives loader data as props. Export the props type from your `.server.ts` file to keep the contract in one place:

::: code-group

```tsx [React]
// pages/users/index.tsx
import type { Props } from "./index.server";

export default function UsersPage({ users }: Props) {
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

```vue [Vue]
<!-- pages/users/index.vue -->
<script setup lang="ts">
import type { Props } from "./index.server";
defineProps<Props>();
</script>

<template>
  <h1>Users</h1>
  <ul>
    <li v-for="u in users" :key="u.id">{{ u.name }}</li>
  </ul>
</template>
```

```svelte [Svelte]
<!-- pages/users/index.svelte -->
<script lang="ts">
  import type { Props } from "./index.server";

  let { users }: Props = $props();
</script>

<h1>Users</h1>
<ul>
  {#each users as u (u.id)}
    <li>{u.name}</li>
  {/each}
</ul>
```

```tsx [Solid]
// pages/users/index.tsx
import type { Props } from "./index.server";
import { For } from "solid-js";

export default function UsersPage(props: Props) {
  return (
    <>
      <h1>Users</h1>
      <ul>
        <For each={props.users}>{(u) => <li>{u.name}</li>}</For>
      </ul>
    </>
  );
}
```

:::

## Deferred Props

Loaders sometimes need to fetch slower data such as analytics, external API responses, or AI inference. `defer()` lets you return a placeholder immediately so the page renders quickly, then streams the real data when it resolves:

```ts
// pages/dashboard.server.ts
import { defineHandler, defer } from "void";
import type { InferProps } from "void";
import { db } from "void/db";
import { projects } from "@schema";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const allProjects = await db.select().from(projects); // fast, returns immediately
  return {
    projects: allProjects,
    usage: defer(async () => {
      return await fetchUsageMetrics(); // slow, streams when ready
    }),
  };
});
```

The page renders immediately with `projects` available. The `usage` prop is a framework-native deferred resource: React consumes it with Suspense and `use()`, while the other adapters expose a `{ loading, value, error }` state object.

### Handling Deferred State

In React, `Deferred<T>` is consumed as a promise. Put the deferred read under a `<Suspense>` boundary and call `use()` where the value is needed:

::: code-group

```tsx [React]
import { Suspense, use } from "react";
import type { Props } from "./dashboard.server";

function Usage({ usage }: Pick<Props, "usage">) {
  const resolved = use(usage);
  return <p>{resolved.requests} requests</p>;
}

export default function Dashboard({ projects, usage }: Props) {
  return (
    <div>
      <h1>Projects ({projects.length})</h1>
      <Suspense fallback={<p>Loading usage...</p>}>
        <Usage usage={usage} />
      </Suspense>
    </div>
  );
}
```

:::

Rejected deferred props throw from `use()`. Put a normal React error boundary
around the Suspense boundary when the page should render a custom failure state.
For explicit React prop annotations, import `Deferred` from `@void/react`; the
adapter export is typed as `Promise<T>`.

In Vue, Svelte, and Solid, `Deferred<T>` behaves as a [discriminated union](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) with three states:

```ts
type Deferred<T> =
  | { loading: true; value: null; error: null } // pending
  | { loading: false; value: T; error: null } // resolved
  | { loading: false; value: null; error: Error }; // rejected
```

Check `loading` first, then `error`. TypeScript narrows `value` to `T` in the resolved branch:

::: code-group

```vue [Vue]
<script setup lang="ts">
import type { Props } from "./dashboard.server";
defineProps<Props>();
</script>

<template>
  <div>
    <h1>Projects ({{ projects.length }})</h1>
    <p v-if="usage.loading">Loading usage...</p>
    <p v-else-if="usage.error">Failed: {{ usage.error.message }}</p>
    <p v-else>{{ usage.value.requests }} requests</p>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import type { Props } from "./dashboard.server";
  let { projects, usage }: Props = $props();
</script>

<div>
  <h1>Projects ({projects.length})</h1>
  {#if usage.loading}
    <p>Loading usage...</p>
  {:else if usage.error}
    <p>Failed: {usage.error.message}</p>
  {:else}
    <p>{usage.value.requests} requests</p>
  {/if}
</div>
```

```tsx [Solid]
import type { Props } from "./dashboard.server";

export default function Dashboard(props: Props) {
  return (
    <div>
      <h1>Projects ({props.projects.length})</h1>
      {props.usage.loading ? (
        <p>Loading usage...</p>
      ) : props.usage.error ? (
        <p>Failed: {props.usage.error.message}</p>
      ) : (
        <p>{props.usage.value.requests} requests</p>
      )}
    </div>
  );
}
```

:::

### How Streaming Works

On the initial page load (SSR), React uses React 19 streaming SSR and renders the nearest Suspense fallback for deferred props; the other adapters render their loading state. As each deferred function resolves, the server streams an inline `<script>` tag that delivers the data, so no extra HTTP request is needed. Routes with `export const ssr = false` skip server-rendered component HTML but still stream deferred resolution scripts after the client-mounted shell. On SPA navigation, deferred data streams via NDJSON over the same response.

### Deferred Props After Mutations

::: info
When a mutation runs, the loader runs again to provide fresh props, but deferred props cannot stream over a mutation response. The client preserves the last resolved value for each deferred prop, so the UI keeps showing the previous data until the next full page load or SPA navigation.
:::

### Grouped Deferred Props

When multiple props depend on the same slow operation, use a named group to resolve them together with a single function call:

```ts
export const loader = defineHandler<Props>(async (c) => {
  const analyticsResolver = async () => {
    const data = await fetchAnalytics(); // one slow call
    return { metrics: data.metrics, chart: data.chart };
  };

  return {
    projects: await db.select().from(projects),
    metrics: defer("analytics", analyticsResolver),
    chart: defer("analytics", analyticsResolver),
  };
});
```

Both `metrics` and `chart` resolve from a single invocation of the analytics resolver. The component receives them as separate `Deferred<T>` props.
