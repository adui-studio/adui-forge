---
outline: deep
---

# Key-Value Storage

Void provides a typed KV client with automatic JSON serialization for [Cloudflare Workers KV](https://developers.cloudflare.com/kv/). Import `kv` from `void/kv` and start reading and writing data.

## Basic Operations

### Get

```ts
import { kv } from "void/kv";

const user = await kv.get<User>("user:123");
// User | null
```

Values are automatically parsed as JSON. If the stored value isn't valid JSON, the raw string is returned.

### Put

```ts
await kv.put("user:123", { name: "Alice", role: "admin" });
```

Objects are automatically JSON-stringified. Strings are stored as-is.

Add a TTL (in seconds) or absolute expiration (Unix timestamp):

```ts
await kv.put("session:abc", sessionData, { ttl: 3600 });
await kv.put("token:xyz", tokenData, { expiration: 1700000000 });
```

Attach metadata to a key:

```ts
await kv.put("user:123", userData, {
  metadata: { updatedBy: "admin" },
});
```

### Delete

```ts
await kv.delete("user:123");
```

### List

```ts
const result = await kv.list({ prefix: "user:" });
// { keys: [{ name: "user:1" }, { name: "user:2" }], list_complete: true }
```

Paginate with `limit` and `cursor`:

```ts
const page = await kv.list({ prefix: "user:", limit: 100 });
if (!page.list_complete) {
  const next = await kv.list({ prefix: "user:", limit: 100, cursor: page.cursor });
}
```

### Get with Metadata

```ts
const result = await kv.getWithMetadata<User, { updatedBy: string }>("user:123");
// { value: User | null, metadata: { updatedBy: string } | null }
```

## Typed Maps

For collections of the same type, use `kv.map()` to create a scoped, typed client with automatic key prefixing:

```ts
const sessions = kv.map<Session>("sessions");

await sessions.put("abc", { userId: 1, token: "..." }, { ttl: 3600 });
// KV key: "sessions:abc"

const session = await sessions.get("abc");
// Session | null

await sessions.delete("abc");
```

The map automatically prefixes all keys with `"sessions:"` and strips the prefix when listing:

```ts
const result = await sessions.list();
// keys: [{ name: "abc" }, { name: "def" }]  (prefix stripped)
```

Maps have the same methods as the base client (`get`, `put`, `delete`, `list`, `getWithMetadata`) but with a typed value and automatic prefixing.

## How It Works

The KV client is a thin wrapper over the Cloudflare KV API that adds two things:

1. **Auto serialization:** `put()` calls `JSON.stringify()` on non-string values. `get()` calls `JSON.parse()` with a fallback to the raw string for values that are not JSON. You can store and retrieve objects without manual serialization.

2. **Typed maps:** `kv.map<T>(prefix)` returns a scoped client where all keys are prefixed with `"prefix:"` and values are typed as `T`. This is useful for organizing related data such as sessions, cache entries, and feature flags without manually managing prefixes.

> **Escape hatch:** The `kv` client covers the most common KV operations. For advanced use cases like `getWithMetadata` with specific cache behaviors, you can access the raw `KVNamespace` binding via `c.env.KV` in a route handler.
