---
outline: deep
---

# Object Storage

Void provides a typed `storage` export for [Cloudflare R2](https://developers.cloudflare.com/r2/). Import it from `void/storage` and use the full R2 API directly.

## Basic Operations

```ts
import { storage } from "void/storage";

// Upload
await storage.put("uploads/photo.jpg", file, {
  httpMetadata: { contentType: "image/jpeg" },
});

// Download
const object = await storage.get("uploads/photo.jpg");
if (object) {
  const data = await object.arrayBuffer();
}

// Delete
await storage.delete("uploads/photo.jpg");

// List
const listed = await storage.list({ prefix: "uploads/" });
for (const obj of listed.objects) {
  console.log(obj.key, obj.size);
}

// Head (metadata only)
const head = await storage.head("uploads/photo.jpg");
```

The `storage` object is a full `R2Bucket`. Every method from the [Cloudflare R2 API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) is available directly, with no wrapper layer.

## Serving Files

A common pattern is serving uploaded files from an API route:

```ts
import { storage } from "void/storage";

export const GET = defineHandler(async (c) => {
  const key = c.req.param("key");
  const object = await storage.get(key);

  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
});
```

## How It Works

Unlike the [database](./database.md) and [KV](./kv.md) clients, `storage` doesn't add any abstraction over the underlying API. The R2 API is already well-designed for direct use, so `storage` is simply a lazy reference to `env.STORAGE` that you can import without manually accessing bindings.

The `createStorage()` factory exists for testing and for frameworks that manage their own routing. It accepts an `R2Bucket` and returns it directly.
