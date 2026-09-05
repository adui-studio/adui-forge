---
outline: deep
---

# Redirects

Define URL redirects in [`void.json`](../../reference/config) using the `routing.redirects` field. Keys are source URL patterns, values are destination strings or objects with an explicit status.

```json
{
  "routing": {
    "redirects": {
      "/old": "/new",
      "/blog/*": { "to": "/posts/:splat", "status": 301 }
    }
  }
}
```

## Rules

- **Source patterns** start with `/`. `*` matches any characters including `/`.
- **Destinations** can be strings (default `302`) or objects with `to` and optional `status`. Supported statuses: `301`, `302`, `303`, `307`, `308`.
- `:splat` in the destination is replaced with the portion of the path matched by `*` in the source pattern.
- Destination query strings are merged into the `Location` header (the destination's parameters take precedence on per-key conflict). To drop the incoming query, write an explicit reset like `?`.
- When multiple rules match, the **first match wins**. Put more-specific rules above more-general ones (matches Netlify `_redirects` and Vercel `vercel.json` semantics).
- Redirects are evaluated **before** the request reaches the worker, so they short-circuit static asset serving, ISR, and SSR.

## Example: permanent redirect

```json
{
  "routing": {
    "redirects": {
      "/old-page": { "to": "/new-page", "status": 301 }
    }
  }
}
```

## Example: path prefix migration

```json
{
  "routing": {
    "redirects": {
      "/blog/*": { "to": "/posts/:splat", "status": 301 }
    }
  }
}
```

A request to `/blog/hello-world` redirects to `/posts/hello-world` with a `301` status.

## Domain-level redirects

Scope a redirect to a specific Host header by prefixing the source with `https://host`. Useful for:

- **Domain consolidation** — redirect everything from an old marketing domain to a new one without per-host deploy config.
- **Canonical host enforcement** — `www.example.com` → `example.com`.
- **Per-domain rules on a multi-domain project** — when you've bound several custom domains to one project but want different behavior on each.

```json
{
  "routing": {
    "redirects": {
      "https://www.example.com/*": "https://example.com/:splat",
      "https://old-marketing.com/*": "https://example.com/:splat"
    }
  }
}
```

The `_redirects` file accepts the same syntax:

```
https://www.example.com/*  https://example.com/:splat  301!
```

The host portion is split off the source and stored as a `host` field on the rule. Path-only sources (no `https://` prefix) apply to every domain bound to the project — that's the existing behavior. Host-prefixed sources only fire when the request's `Host` header matches.

### Validation

- The host must be a literal hostname — wildcards (`*.example.com`), ports, paths, and userinfo are rejected.
- Only `https://` is accepted. `http://` and protocol-relative `//` sources are rejected — TLS terminates upstream of the worker, so an `http://`-scoped rule physically cannot fire.
- The host must be **bound to your project** (either `<slug>.void.app` or a custom domain you've added via `void domain add`). `void deploy` rejects rules scoped to hosts that aren't on the project — staging the rule in the same change as the domain is the recommended flow.
- Custom domains in `pending` (DCV-in-progress) state are accepted. The rule deploys but stays inert until DCV completes; once the certificate is issued, the rule starts firing automatically without a redeploy.

### Combined with external destinations

The source `host` and the destination URL are independent. Combining them lets you express domain-consolidation redirects in a single rule:

```
https://old.example.com/*  https://www.example.com/:splat  301!
```

Reads as "when a request hits `old.example.com` on any path, send a 301 to the same path on `www.example.com`."

## Framework `_redirects` files

Meta-frameworks may generate a `_redirects` file during build. Void parses this file at deploy time and merges the rules into the deploy manifest.

- `void.json` rules are applied **before** framework-generated `_redirects` rules. Since the first match wins, `routing.redirects` in `void.json` takes precedence.
- Both 3xx redirect rules and status `200` [rewrite rules](./rewrites) are supported in `_redirects` files.
- The `!` force suffix is only meaningful on `200` entries (see [rewrites — `_redirects` file](./rewrites#redirects-file)). On 3xx entries (`301!`, `302!`, `307!`, `308!`) it's silently stripped — a redirect always "forces" by nature, so the suffix is redundant. `void deploy` prints a single aggregated warning tallying every such entry so you can clean them up.
- The `_redirects` file is not uploaded as a static asset. Its contents are parsed and included in the manifest only.

Precedence when the same source appears in both sources follows the same rules as rewrites — config rules are merged before file rules within each phase, and first match wins, so `void.json` overrides `_redirects`. See [Precedence: `_redirects` vs `void.json`](./rewrites#precedence-redirects-vs-void-json) for the full explanation and a worked example.

## How redirects work

1. `void deploy` reads redirect rules from the framework `_redirects` file (if present) and `routing.redirects` in `void.json`, then includes them in the deploy manifest.
2. The platform stores the rules in the KV routing entry for your project.
3. The dispatch worker checks redirect rules before any worker invocation, so matching requests get a redirect response immediately.

Because rules are evaluated at the edge before invoking the worker, redirects add no latency to the request path.
