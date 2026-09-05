---
outline: deep
---

# Custom Headers

Define custom response headers in [`void.json`](../../reference/config) using the `routing.headers` field. Keys are URL patterns, values are arrays of `"Name: value"` strings.

```json
{
  "routing": {
    "headers": {
      "/assets/*": ["Cache-Control: public, max-age=31536000, immutable"],
      "/*": ["X-Frame-Options: DENY", "X-Content-Type-Options: nosniff"],
      "/*.html": ["Cache-Control: no-cache"]
    }
  }
}
```

## Rules

- **Pattern keys** start with `/`. `*` matches any characters including `/`.
- **Header values** use `Name: value` format. The value may contain colons.
- All matching rules are merged. When multiple rules set the same header name, the **last match wins**.
- User-defined `Cache-Control` overrides the built-in default. The default still applies when no rule matches.

## Example: security headers

```json
{
  "routing": {
    "headers": {
      "/*": [
        "X-Frame-Options: DENY",
        "X-Content-Type-Options: nosniff",
        "Referrer-Policy: strict-origin-when-cross-origin"
      ]
    }
  }
}
```

## Example: override caching

```json
{
  "routing": {
    "headers": {
      "/*.html": ["Cache-Control: public, max-age=300"],
      "/config.json": ["Cache-Control: no-store"]
    }
  }
}
```

## Scope

Header rules apply to **all responses** served through the dispatch worker, including static assets, SSR pages, API routes, and hashed asset responses (which browsers fetch over `GET` from the immutable edge cache). Serving headers on hashed assets is what lets a cross-origin-isolated app attach `Cross-Origin-Embedder-Policy` and `Cross-Origin-Resource-Policy` to its hashed worker and wasm files — without them, a module worker spawned from a `require-corp` document is blocked.

On hashed (content-addressed, immutable) assets, rules are **additive**. You can add headers such as COOP/COEP/CORP or other security headers, but the platform-managed caching, representation, and framing headers are preserved so an immutable asset cannot be mis-cached or corrupted: `Cache-Control`, `Content-Type`, `Content-Encoding`, `Content-Length`, `Content-Range`, `Accept-Ranges`, and `Transfer-Encoding` keep their platform values even if a broad rule tries to overwrite them. (This is the one case where a user `Cache-Control` does not override the default.)

Header rules do not apply to:

- ISR cache responses (these have their own cache-control headers)

### Blocked headers

Two headers can never be set through rules: `Set-Cookie` and `Clear-Site-Data`. On the shared `*.void.app` domain, `void.app` is the registrable domain, so a cookie operation from one project would reach every project's subdomain. Both are dropped from rule output to keep that tenant boundary intact.

## Framework `_headers` files

Meta-frameworks like SvelteKit, Nuxt, and Astro generate a `_headers` file with cache rules for their hashed asset directories. Void automatically parses this file during deploy and merges the rules into the deploy manifest.

- Framework-generated rules are applied **before** `void.json` rules. Since the last match wins, `routing.headers` in `void.json` takes precedence and can override framework defaults.
- The `_headers` file is not uploaded as a static asset. Its contents are parsed and included in the manifest only.

No configuration is needed. If the framework generates a `_headers` file, it is picked up automatically.

## How headers work

1. `void deploy` reads header rules from the framework `_headers` file (if present) and `routing.headers` in `void.json`, then includes them in the deploy manifest.
2. The platform stores the rules in the KV routing entry for your project.
3. The dispatch worker applies matching rules to matching responses before returning them. Most cacheable responses are cached with the final headers; hashed assets are the exception — their rules are applied on every serve (including cache hits), so a later header-rule change takes effect even when the content hash, and thus the cache entry, is unchanged.

Because rules are evaluated at the edge, there is no extra latency cost. Headers are applied inline before the response is returned and cached.
