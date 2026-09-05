---
outline: deep
---

# Remote Development

During local development, Void uses local emulations of D1, KV, and R2 through [Miniflare](https://miniflare.dev/). That covers most work, but sometimes you need real data for debugging a production issue, testing against a populated database, or validating R2 uploads end to end.

Remote development mode connects your local dev server to the **real bindings** from your deployed project. Your code does not change. `db.select()`, `env.KV.get()`, and `env.STORAGE.get()` work the same way, but they hit remote resources instead of local emulations.

## Prerequisites

Before enabling remote mode, you need:

1. **Logged in:** run `void auth login` if you have not already
2. **Project linked:** run `void deploy` at least once to create and link a project

## Enabling Remote Mode

### In `void.json` (persistent)

```json
{
  "remote": true
}
```

### Via environment variable (one-off)

```bash
VOID_REMOTE=1 vite dev
```

`VOID_REMOTE=0` disables remote mode even if `void.json` has `"remote": true`.

## Supported Bindings

| Binding | Local (default)            | Remote              |
| ------- | -------------------------- | ------------------- |
| D1      | Local SQLite via Miniflare | Remote D1 database  |
| KV      | Local file-backed KV       | Remote KV namespace |
| R2      | Local file-backed R2       | Remote R2 bucket    |
| AI      | Always proxied             | Always proxied      |

AI inference is always routed through the proxy regardless of remote mode. There is no local AI emulation.

## How It Works

When remote mode is active, the dev server replaces local Miniflare bindings with proxy-backed versions at runtime. Every binding call is forwarded to your deployed resources via Void's proxy service, authenticated with your login token. The proxy resolves which D1 database, KV namespace, or R2 bucket to use based on your project's binding configuration.

You don't need to change any code. Imports like `import { db } from "void/db"` and direct binding access via `c.env.KV` both work transparently.

When the dev server starts with remote mode active, it prints:

```
⚡ Remote bindings active (my-project.void.app)
   DB      → remote D1
   KV      → remote KV
   STORAGE → remote R2
```

## Limitations

- **Network latency:** every binding call goes over the network, so local dev is slower than local emulation. This is expected.
- **R2 multipart uploads:** `createMultipartUpload()` and `resumeMultipartUpload()` are not supported in remote mode.
- **D1 dump:** `db.dump()` is not supported in remote mode.
- **Writes affect real data:** remote mode connects to your actual deployed resources. Inserts, updates, and deletes are real, so use it carefully or point it at a staging project.
