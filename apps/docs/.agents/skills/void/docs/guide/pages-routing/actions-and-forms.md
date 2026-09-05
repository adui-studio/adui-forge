---
outline: deep
---

# Actions & Forms

Actions handle mutations (POST, PUT, PATCH, DELETE) in companion `.server.ts` files. They use the same `defineHandler` API as [loaders](./loaders) and [server routes](../server-routing.md), with the same typed `c.env` bindings, `withValidator()` support, and Hono context methods.

## Defining an Action

Export `action` from a `.server.ts` file. Use `withValidator()` with a [schema-derived validator](../database.md#schema-derived-validators) to validate the request body:

```ts
// pages/users/index.server.ts
import { defineHandler } from "void";
import { db } from "void/db";
import { users, insertUserSchema } from "@schema";

export const action = defineHandler.withValidator({
  body: insertUserSchema,
})(async (c, { body }) => {
  await db.insert(users).values(body);
  // No return → re-runs loader, page re-renders with fresh data
});
```

| Action returns        | Behavior                                              |
| --------------------- | ----------------------------------------------------- |
| Nothing (void)        | Re-runs the loader, page re-renders with fresh props. |
| `c.redirect('/path')` | Navigates to another page.                            |

## Named Actions

When a page needs multiple mutations, such as updating and deleting a user on the same page, export `actions` (plural) instead of `action`:

```ts
// pages/users/edit.server.ts
import { defineHandler } from "void";
import { db, eq } from "void/db";
import { users } from "@schema";

export const actions = {
  update: defineHandler.withValidator({
    body: updateUserSchema,
  })(async (c, { body }) => {
    await db
      .update(users)
      .set(body)
      .where(eq(users.id, c.req.param("id")));
  }),

  delete: defineHandler(async (c) => {
    const { id } = await c.req.json<{ id: string }>();
    await db.delete(users).where(eq(users.id, id));
  }),
};
```

Named actions are dispatched via a `?actionName` suffix on the URL (e.g. `/users/edit?update`). The client primitives `useForm` and `action()` handle this automatically.

`export const action` (singular) still works for pages that only need one mutation. Named actions are opt-in. Exporting both `action` and `actions` from the same file is an error.

You can also define an `actions.default` key for the action that runs when no name is specified (i.e. a bare POST to the page URL):

```ts
export const actions = {
  default: defineHandler(async (c) => {
    // runs on POST /users/edit (no ?suffix)
  }),
  delete: defineHandler(async (c) => {
    // runs on POST /users/edit?delete
  }),
};
```

## `useForm`

`useForm` handles form submissions, loading state, and validation errors. It is **fully typed end to end**. The URL autocompletes to pages that have an action, `form.data` matches the action validator schema, and `form.errors` keys are constrained to the body field names.

First, define the action in your server handler:

```ts
// pages/users/create.server.ts
import { defineHandler } from "void";
import { db } from "void/db";
import { users } from "@schema";
import * as v from "valibot";

const createUserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
});

export const action = defineHandler.withValidator({
  body: createUserSchema,
})(async (c, { body }) => {
  await db.insert(users).values(body);
  return c.redirect("/users");
});
```

Then, use `useForm` in the page component to submit to this action:

::: code-group

```tsx [React]
// pages/users/create.tsx
import { useForm } from "@void/react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>Create</button>;
}

export default function CreateUser() {
  // "/users/create" autocompletes; { name, email } is typed from the action's validator
  const form = useForm("/users/create", { name: "", email: "" });

  return (
    <form action={form.post}>
      <input
        name="name"
        value={form.data.name}
        onChange={(e) => form.setData("name", e.target.value)}
      />
      {form.errors.name && <span>{form.errors.name}</span>}

      <input
        name="email"
        value={form.data.email}
        onChange={(e) => form.setData("email", e.target.value)}
      />
      {form.errors.email && <span>{form.errors.email}</span>}

      {form.error && <p>{form.error.message}</p>}

      <SubmitButton />
    </form>
  );
}
```

```vue [Vue]
<!-- pages/users/create.vue -->
<script setup lang="ts">
import { useForm } from "@void/vue";

// "/users/create" autocompletes; { name, email } is typed from the action's validator
const form = useForm("/users/create", { name: "", email: "" });
</script>

<template>
  <form @submit.prevent="form.post()">
    <input v-model="form.data.name" />
    <span v-if="form.errors.name">{{ form.errors.name }}</span>

    <input v-model="form.data.email" />
    <span v-if="form.errors.email">{{ form.errors.email }}</span>

    <button :disabled="form.pending">Create</button>
  </form>
</template>
```

```svelte [Svelte]
<!-- pages/users/create.svelte -->
<script>
  import { useForm } from "@void/svelte";

  // "/users/create" autocompletes; { name, email } is typed from the action's validator
  const form = useForm("/users/create", { name: "", email: "" });
</script>

<form onsubmit={(e) => { e.preventDefault(); return form.post(); }}>
  <input bind:value={form.data.name} />
  {#if form.errors.name}<span>{form.errors.name}</span>{/if}

  <input bind:value={form.data.email} />
  {#if form.errors.email}<span>{form.errors.email}</span>{/if}

  <button disabled={form.pending}>Create</button>
</form>
```

```tsx [Solid]
// pages/users/create.tsx
import { useForm } from "@void/solid";

export default function CreateUser() {
  // "/users/create" autocompletes; { name, email } is typed from the action's validator
  const form = useForm("/users/create", { name: "", email: "" });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        return form.post();
      }}
    >
      <input value={form.data.name} onInput={(e) => form.setData("name", e.target.value)} />
      {form.errors.name && <span>{form.errors.name}</span>}

      <input value={form.data.email} onInput={(e) => form.setData("email", e.target.value)} />
      {form.errors.email && <span>{form.errors.email}</span>}

      <button disabled={form.pending}>Create</button>
    </form>
  );
}
```

:::

The types are inferred from your action's `withValidator()` schema in the companion `.server.ts` file. If no validator is defined, the body type falls back to `Record<string, unknown>`, and you still get URL autocomplete.

### `useForm` API

`useForm` returns a reactive object with:

| Property / Method                | Purpose                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| Property / Method                | Purpose                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `data` / `setData`               | Current form values, typed to match the action's body schema.                                 |
| `errors`                         | Field-level validation errors, keys typed to body field names.                                |
| `error`                          | Non-validation call-site action error, or `null`.                                             |
| `post`, `put`, `patch`, `delete` | Submit the form with that method. In React these are native form action callbacks.            |
| `pending`                        | `true` while the submission is in flight.                                                     |
| `hasChanges`                     | `true` if form data differs from initial values.                                              |
| `wasSuccessful`                  | `true` after a successful submission. Stays `true` until the next submission.                 |
| `recentlySuccessful`             | `true` for 2 seconds after a successful submission. Useful for flash messages.                |
| `reset(...fields)`               | Reset form data to initial values. Field names autocomplete.                                  |
| `clearErrors(...fields)`         | Clear validation errors. Field names autocomplete.                                            |
| `clearError()`                   | Clear the non-validation call-site error.                                                     |

In React, prefer the native Action form:

```tsx
<form action={form.post}>{/* controlled inputs update form.data */}</form>
```

Use `form.put`, `form.patch`, or `form.delete` as the form action for alternate HTTP methods. Use the `action()` helper when you need an awaitable imperative mutation.

In Vue, Svelte, and Solid, the same helpers return `Promise<void>` so
boundary-class failures can propagate through framework async error handling or
explicit `catch` handlers.

For dynamic routes, pass `params` in the options:

```ts
// pages/users/[id].server.ts has an action
const form = useForm('/users/:id', { name: '' }, { params: { id: '42' } });
<form action={form.put}>{/* submits to /users/42 */}</form>
```

### Named Actions with `useForm`

When a page exports named actions, append `?actionName` to the URL:

```ts
const form = useForm('/users/:id?update', { name: '' }, { params: { id } });
<form action={form.put}>{/* submits to /users/42?update */}</form>
```

The URL, body fields, and error keys are typed per action. Each named action gets its own validator schema. See [Type Safety: Action -> useForm](../type-safety#action-useform) for the full typing story.

## `action()` Helper

For one-shot mutations that do not need form state such as dirty tracking, reset, or field-level errors, use `action()` instead of `useForm`. It sends a request to a page action and triggers an Inertia page update, just like `useForm`, but without the reactive form object:

```ts
import { useForm, action } from "@void/react"; // or "@void/vue", "@void/svelte", "@void/solid"

// Form with state + Inertia page update
const form = useForm("/?create-user", { name: "", email: "" });

// Programmatic call + Inertia page update (no form state)
const result = await action("/?delete-user", {
  data: { id: 42 },
  method: "DELETE",
});
if (!result.ok) {
  showToast(result.error.message);
}
```

`action()` is useful in event handlers such as button clicks, confirmation dialogs, or any place where you want to call a server action without managing form state. It uses `POST` by default and accepts `{ data, method, params }`, where `method` can be `'PUT'`, `'PATCH'`, or `'DELETE'` for alternate HTTP methods. It returns `{ ok: true, pageData }` for successful actions and `{ ok: false, error }` for call-site errors such as validation, conflicts, or missing resources.

## Validation Errors

When an action throws a `ValidationError`, or validation fails through `withValidator`, the errors are automatically available on `form.errors`. You do not need to wire that up manually.

Void separates action failures into call-site errors and boundary errors. Call-site errors are expected local failures such as `400`, `404`, `409`, `422`, and `429`; `useForm` stores them in `form.errors` or `form.error`, and `action()` returns `{ ok: false, error }`. Boundary errors such as `401`, `403`, `500`, `502`, and unknown network/protocol failures are thrown so React error boundaries, or your framework's error handling, can handle them at a higher level.

Actions can throw `ValidationError` for custom validation logic:

```ts
import { defineHandler, ValidationError } from "void";

export const action = defineHandler(async (c) => {
  const body = await c.req.json();
  if (await emailExists(body.email)) {
    throw new ValidationError({ email: "Email already taken" });
  }
  // ...
});
```

Or use `withValidator()` for automatic schema-based validation. Errors are returned in the same format.

## File Uploads

`useForm` automatically detects `File`, `Blob`, and `FileList` values in form data and sends the request as `multipart/form-data` instead of JSON. No extra configuration is needed. Set a file on the form data and submit.

::: code-group

```tsx [React]
import { useForm } from "@void/react";

export default function Upload() {
  const form = useForm("/photos", { title: "", photo: null as File | null });

  return (
    <form action={form.post}>
      <input value={form.data.title} onChange={(e) => form.setData("title", e.target.value)} />
      <input type="file" onChange={(e) => form.setData("photo", e.target.files?.[0] ?? null)} />
      <button disabled={form.pending}>Upload</button>
    </form>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import { ref } from "vue";
import { useForm } from "@void/vue";

const form = useForm("/photos", { title: "", photo: null as File | null });
const fileInput = ref<HTMLInputElement>();

function onFileChange() {
  form.data.photo = fileInput.value?.files?.[0] ?? null;
}
</script>

<template>
  <form @submit.prevent="form.post()">
    <input v-model="form.data.title" />
    <input type="file" ref="fileInput" @change="onFileChange" />
    <button :disabled="form.pending">Upload</button>
  </form>
</template>
```

```svelte [Svelte]
<script>
  import { useForm } from "@void/svelte";

  const form = useForm("/photos", { title: "", photo: null });
</script>

<form onsubmit={(e) => { e.preventDefault(); return form.post(); }}>
  <input bind:value={form.data.title} />
  <input type="file" onchange={(e) => { form.data.photo = e.target.files?.[0] ?? null; }} />
  <button disabled={form.pending}>Upload</button>
</form>
```

```tsx [Solid]
import { useForm } from "@void/solid";

export default function Upload() {
  const form = useForm("/photos", { title: "", photo: null as File | null });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        return form.post();
      }}
    >
      <input value={form.data.title} onInput={(e) => form.setData("title", e.target.value)} />
      <input type="file" onChange={(e) => form.setData("photo", e.target.files?.[0] ?? null)} />
      <button disabled={form.pending}>Upload</button>
    </form>
  );
}
```

:::

On the server, use `c.req.parseBody()` to access the uploaded file:

```ts
// pages/photos.server.ts
import { defineHandler } from "void";
import { storage } from "void/storage";

export const action = defineHandler(async (c) => {
  const body = await c.req.parseBody();
  const file = body["photo"] as File;
  if (file && file.size > 0) {
    await storage.put(file.name, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
  }
});
```

## Choosing a Primitive

| Primitive  | Inertia page update | Form state                 | Framework-specific |
| ---------- | ------------------- | -------------------------- | ------------------ |
| `useForm`  | Yes                 | Yes (errors, dirty, reset) | Yes                |
| `action()` | Yes                 | No                         | Yes                |
| `fetch()`  | No (raw response)   | No                         | No                 |

Use `useForm` when you have a form with inputs. Use `action()` for programmatic mutations (delete buttons, toggles), optionally passing `{ method }` for non-POST actions. Use `fetch()` when you need the raw response and don't want Inertia page updates.
