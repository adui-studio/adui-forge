---
outline: deep
---

# Authentication

::: warning ⚠️ Void Apps Only
Void-managed auth currently works only for Void apps. Meta-framework mode is not supported yet.
:::

Void uses [Better Auth](https://www.better-auth.com/) as the auth engine for Void apps. Void owns the conventions and wiring; Better Auth owns the auth behavior.

## Quick Start

### 1. Enable auth

Add a provider to `void.json`. Email/password is the default, so the simplest config is:

```json
{
  "auth": {
    "providers": ["email"]
  }
}
```

You can also skip this step entirely. Auth activates automatically when you import from `void/auth` or `void/client`.

### 2. Sign up and sign in

Use the preconfigured auth client from `void/client`:

```tsx
import { auth } from "void/client";

// sign up
await auth.signUp.email({
  email: "alice@example.com",
  password: "s3cret",
  name: "Alice",
});

// sign in
await auth.signIn.email({
  email: "alice@example.com",
  password: "s3cret",
});
```

### 3. Protect a server route

Use `requireAuth` in an API route handler or a page loader to gate access. It returns the authenticated user or throws a `401`:

```ts
// routes/api/profile.ts
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler((c) => {
  const user = requireAuth(c);
  return { email: user.email };
});
```

In a pages-mode loader, use `getUser` or `getSession` when you want to allow unauthenticated access:

```ts
// pages/dashboard.server.ts
import { defineHandler, type InferProps } from "void";
import { getUser } from "void/auth";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(() => {
  const user = getUser();
  return { user };
});
```

### 4. Sign out

```tsx
await auth.signOut();
```

The rest of this page covers configuration, server helpers, and advanced customization in detail.

## Config

Auth turns on automatically when you:

- import anything from `void/auth`
- import `auth` from `void/client`
- add `auth` to `void.json`
- add a root-level `auth.ts` file

The simplest setup is no config at all. Email/password auth is enabled by default.

Example:

```json
{
  "auth": {
    "providers": ["email", "google", "github"]
  }
}
```

Use `auth.providers` when you want to enable social providers explicitly. Provider credentials come from `AUTH_<PROVIDER>_CLIENT_ID` and `AUTH_<PROVIDER>_CLIENT_SECRET`.

See the full provider list in the [config reference](../reference/config.md#auth).

For example, `github` uses:

- `AUTH_GITHUB_CLIENT_ID`
- `AUTH_GITHUB_CLIENT_SECRET`

## Client Usage

`void/client` exports a preconfigured Better Auth client:

```ts
import { auth } from "void/client";

await auth.signUp.email({
  email: "alice@example.com",
  password: "s3cret",
  name: "Alice",
});

await auth.signIn.email({
  email: "alice@example.com",
  password: "s3cret",
});

await auth.signOut();
```

The exact client API comes from Better Auth. Void just preconfigures the client with `basePath: "/api/auth"`.

See the official [Better Auth client docs](https://www.better-auth.com/docs/concepts/client) for the full client API.

Framework-specific clients are selected automatically:

- React pages apps use `better-auth/react`
- Vue pages apps use `better-auth/vue`
- Svelte pages apps use `better-auth/svelte`
- Solid pages apps use `better-auth/solid`
- other Void apps use `better-auth/client`

For advanced usage, `void/client` also exports `createAuthClient`.

## Server Usage

`void/auth` provides the server-side helpers:

```ts
import { getSession, getUser, requireAuth } from "void/auth";
```

- `getUser()` returns the current `AuthUser | null`
- `getSession()` returns `{ user, session } | null`
- `requireAuth(c)` returns the authenticated user or throws `401`

Example:

```ts
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler((c) => {
  const user = requireAuth(c);
  return { email: user.email };
});
```

### `AuthUser`

`AuthUser` maps to Better Auth's core user type:

```ts
interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `AuthSession`

`AuthSession` maps to Better Auth's core session type:

```ts
interface AuthSession {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}
```

## Behavior

When auth is active, Void configures Better Auth with these conventions:

- mount path: `/api/auth/*`
- email/password enabled by default unless `auth.providers` is set without `"email"`
- `auth.providers` can enable any built-in Better Auth social provider
- deployed apps need an auth secret via `BETTER_AUTH_SECRET`
- D1/SQLite uses the app `DB` binding
- PostgreSQL apps (`"database": "pg"`) use the app `HYPERDRIVE` binding

Auth sessions live in the same database system as the rest of the app. `AUTH_KV` is no longer used.

On Void Cloud, Void auto-creates `BETTER_AUTH_SECRET` for auth-enabled apps if you have not set `BETTER_AUTH_SECRET` yourself through project secrets.

Localhost dev uses a built-in fallback secret automatically. Outside the managed Void Cloud deploy flow, set `BETTER_AUTH_SECRET` yourself.

## Customization

For advanced configuration, create `auth.ts` at the project root and export `defineAuth(...)`:

```ts
import { defineAuth } from "void/auth";

export default defineAuth(({ defaults }) => ({
  ...defaults,
  trustedOrigins: ["https://example.com"],
}));
```

`defaults` already includes Void's conventions. Extend it explicitly instead of expecting a deep merge.

For the full set of available options, see the official [Better Auth options reference](https://www.better-auth.com/docs/reference/options).

## Database and Migrations

Void manages Better Auth migrations as part of the normal Void migration flow:

- local dev bootstraps auth tables automatically
- deploy runs auth migrations together with app migrations
- users do not run a separate Better Auth CLI path

This applies to `void deploy` (the managed platform), which creates the Better Auth
tables at runtime after dispatch. Deploying to your own Cloudflare account with
[`--backend cloudflare`](/integrations/cloudflare) does **not** run that step: there,
your checked-in `db/migrations/*.sql` must already produce the Better Auth schema, and
deploy fails closed if they do not. Define the tables in `db/schema.ts` and run
`void db generate` — Drizzle's `.unique()` and `.references()` are opt-in, and the
constraints are verified too. See [#274](https://github.com/voidzero-dev/void/issues/274).

## Unsupported Modes

Void-managed Better Auth is supported only for Cloudflare Void apps in v1.

- meta-framework mode should use Better Auth's official framework integrations directly
- `target: "node" | "bun" | "deno"` should use Better Auth directly
