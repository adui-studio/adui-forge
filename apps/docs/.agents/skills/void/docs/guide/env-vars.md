---
outline: deep
---

# Environment Variables

Void provides typed, validated environment variables via a single `env.ts` file at the root of your project. The schema serves three purposes:

1. **Runtime validation** — declared keys are validated on first access; missing/invalid values produce a clear error
2. **TypeScript** — `env.X` and `c.env.X` become typed automatically (no manual interface to maintain)
3. **Deploy safety** — `void deploy` refuses to upload if a required key is missing from `.env*` files or remote secrets

## `env.ts` (recommended)

Place an `env.ts` at your project root and call `defineEnv` once:

::: tip Scaffolded on `void init`
If you already have `.env` or `.env.example` files when you run `void init`, Void generates an `env.ts` seeded from those keys. Inference is conservative — values that unambiguously parse as a boolean (`true`/`false`), an `http(s)://` URL, or a small integer get typed accordingly; everything else stays `string()`. The generated file carries a banner comment asking you to review and tighten types before running dev.
:::

```ts
// env.ts
import { defineEnv, string, number, boolean, oneOf, url } from "void/env";

export default defineEnv({
  STRIPE_KEY: string(),
  PORT: number().default(3000),
  NODE_ENV: oneOf(["development", "production"]),
  WEBHOOK_URL: url(),
  DEBUG: boolean().optional(),
  VITE_APP_TITLE: string(),
});
```

Then read values from anywhere in your app:

```ts
import { env } from "void/env";

console.log(env.STRIPE_KEY); // typed as string
console.log(env.PORT); // typed as number
```

`c.env.STRIPE_KEY` inside Hono handlers is also typed once the schema is declared.

### Built-in helpers

`string()`, `number()`, `boolean()`, `url()`, `email()`, `oneOf([...])`, `json<T>()` cover the common cases. Each helper returns a Standard Schema-conformant builder with `.optional()` and `.default(value)` modifiers.

For richer validation (regex, transforms, branded types), drop in any [Standard Schema](https://standardschema.dev) library — valibot, zod, or arktype work out of the box, and you can mix them with the built-ins:

```ts
import * as v from "valibot";

export default defineEnv({
  STRIPE_KEY: string(), // built-in
  WEBHOOK_URL: v.pipe(v.string(), v.url(), v.endsWith("/webhook")), // valibot
});
```

### Client vs server

Keys matching Vite's `envPrefix` (default `VITE_`) are exposed to client code; Vite enforces this at the bundler level. All other keys are server-only — referencing one from a client module fails the build with a file:line:col error from `void:env-client-guard`, and the runtime proxy still throws as a backstop.

If your project sets a custom `envPrefix` (e.g. `'PUBLIC_'` or an array like `['PUBLIC_', 'NEXT_PUBLIC_']`) in `vite.config.ts`, the build guard honours it automatically. Schema keys that match any configured prefix pass the client check.

### Build-time constant folding

In production client builds, static reads of a client-exposed key are folded into string literals so the bundler can dead-code-eliminate conditional branches — exactly what Vite already does for `import.meta.env.MODE`.

```ts
// source
import { env } from "void/env";
if (env.MODE === "production") {
  initAnalytics();
}

// production client bundle (after folding + DCE)
initAnalytics();
```

Rules:

- **Client bundles only.** Server / SSR / worker code keeps the full runtime proxy so secrets, runtime-injected vars, and HMR keep working.
- **Prefix-gated.** Only keys matching Vite's `envPrefix` (default `VITE_`, honours custom string or array config) are ever folded — server-only keys never appear as literals in client output.
- **Static access only.** `env.FOO` and `env["FOO"]` get folded. Dynamic access (`env[key]`), destructuring, and reassignment fall back to the runtime proxy.
- **Values come from** the same source Vite already uses for `import.meta.env`: `.env*` files (respecting `envDir`) plus schema `.default(x)` values for missing keys. Unknown keys are left untouched and the proxy serves them at runtime.
- **Build-only.** Dev keeps going through the proxy so editing `.env.local` takes effect without a full rebuild.
- **Zero-config.** No flags, no opt-in — just works.

### Vite `define` interop

Vite's `define` option performs build-time literal replacement (e.g. `define: { 'process.env.VERSION': '"1.0"' }`). It does **not** flow through schema validation or the typed `env` proxy — using both `define` and `defineEnv` for the same name causes silent skew (compiled client code sees the define value, runtime proxy and validation see the schema source). Void emits a warning at config time when this overlap is detected.

### `envDir`

Void honours Vite's `envDir` option for `.env` file loading (both the worker `vars` injection and dev-time validation). Defaults to the project root. The deploy CLI still reads from the project root regardless — keep production `.env` files there.

### Imports inside `env.ts`

`env.ts` is loaded outside Vite's plugin pipeline — the dev plugin and the deploy CLI both read it through Node's native `import()`. That means only **relative imports** (`./shared/env-keys`) and **bare package names** (`zod`, `valibot`) resolve. Known limitations:

- **tsconfig path aliases are not resolved.** Writing `import { X } from "@/shared/env-keys"` or `import { Y } from "~/foo"` inside `env.ts` fails to load; Void detects this and re-throws with a hint pointing at the offending specifier. Use a relative import instead.
- **Custom Vite plugins don't run.** Anything that needs Vite's transform pipeline (SVG-as-component, GraphQL loaders, virtual modules, etc.) won't apply to `env.ts`. Keep this file to pure TS + schema declarations.

In practice `env.ts` should only import schema helpers from `void/env` and — at most — a shared constants file via a relative path.

## `.env` files

Void uses Vite's standard `.env` convention to populate the schema:

Whether a file's values ship depends on which deploy path you use:

| File                    | Loaded in dev | Shipped by `void deploy` | Shipped by `--backend cloudflare` |
| ----------------------- | ------------- | ------------------------ | --------------------------------- |
| `.env`                  | yes           | yes (`plain_text`)       | yes (worker `vars`)               |
| `.env.local`            | yes           | no                       | **yes** (worker `vars`)           |
| `.env.production`       | yes           | yes (`plain_text`)       | yes (worker `vars`)               |
| `.env.production.local` | yes           | no                       | **yes** (worker `vars`)           |

`.local` files are gitignored by convention — use them for secrets you don't want in source control.

::: warning `.local` files are not deploy-excluded on `--backend cloudflare`
Managed `void deploy` reads only `.env` and `.env.production`, so a `.local` file keeps secrets off the platform. The self-host `void deploy --backend cloudflare` path instead runs Vite's production env loading, which reads all four files and bakes them into the worker's `vars` as plaintext. A value that is also `export`ed in the shell with the same value is stripped back out, so this bites hardest in CI, where the variable usually only exists in the file.

On that path, keep real secrets out of every `.env*` file and use `wrangler secret put <NAME>` instead. See [Cloudflare deploy](/integrations/cloudflare).
:::

### Dotenv variable expansion

Values can reference other keys defined in the same (or earlier-precedence) `.env` file using `${VAR}` or `$VAR`:

```ini
# .env
BASE_URL=https://api.example.com
API_URL=${BASE_URL}/v1        # → "https://api.example.com/v1"
BUILD=$BASE_URL/build.json    # bare form also works
LITERAL=\$NOT_EXPANDED        # → "$NOT_EXPANDED" (backslash-escape)
```

Nested references resolve transitively (`A=${B}`, `B=${C}`, `C=value` → `A=value`). Cycles are detected and leave the raw literal (Void emits a warning rather than looping). Missing references expand to the empty string.

Expansion runs identically across every path that reads your `.env*` files: the runtime typed `env` proxy, `void env check`, `void deploy`, and the `void init` scaffold inference. Importantly, references **only** resolve against values declared in the `.env*` files themselves — shell `process.env` values are not substituted in. This stops a developer-machine variable from silently materialising in committed examples or deploy manifests. (Vite's own `loadEnv` does consult `process.env` during expansion for the dev-server path; Void filters the shell pollution back out via `filterLoadedEnv` so the observable surface stays the same.)

## Production secrets

For values that should never live in a `.env` file (Stripe keys, OAuth secrets, etc.), upload them as encrypted secret bindings on your deployed worker:

```bash
void secret put STRIPE_KEY            # prompts for value
void secret put STRIPE_KEY < key.txt  # from stdin
void secret sync .env.production      # bulk upload from a dotenv file
void secret list
void secret delete STRIPE_KEY
```

Remote secrets count as "present" for deploy validation — `void deploy` checks both `.env*` and the remote secret list before uploading.

## Defaults

Schema defaults from `defineEnv({ PORT: number().default(3000) })` flow into:

- The typed `env` proxy: `env.PORT` returns `3000` when no value is set.
- Worker bindings (`c.env.PORT`, `process.env.PORT` on Node target): the
  default value is injected as a stringified `var` in dev, in `void deploy`
  manifests, and in prerender bindings, so any code path that reads the raw
  env sees the same fallback.
- Client-exposed keys (`VITE_*` by default, or your configured `envPrefix`):
  defaults are added to Vite's client env, so browser code reading
  `env.VITE_APP_TITLE` sees the same fallback.

User-provided `.env` / shell values always win — defaults only fill gaps.

## Validation behavior

| Phase                | Behavior                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Dev server start     | Warns about missing/invalid keys (does not block).                                                               |
| First runtime access | Throws `EnvValidationError` with the failing key and reason.                                                     |
| `void env check`     | Validates `.env` + `.env.production` (and optionally remote secrets with `--remote`); exits non-zero on failure. |
| `void deploy`        | Hard-errors before upload if any required key is missing from the union of `.env*` and remote secrets.           |

Use `void env check --remote` in CI before deploying — it catches missing prod secrets without running a full build.

## Manual type regeneration

Types are auto-generated to `.void/env.d.ts` on dev server start and whenever `env.ts` changes. To regenerate manually (e.g. after a fresh clone):

```bash
void env types
```

## Scaffolding `.env.example`

Generate (or refresh) a `.env.example` from your `env.ts` schema:

```bash
void env example           # creates or refreshes the void-managed block
void env example --force   # silences the "appended block" notice (use in CI)
```

`void env example` manages a marker-delimited block inside `.env.example` — anything outside the markers (custom CI tokens, build flags, comments) is preserved verbatim across refreshes. The block looks like this:

```ini
# >>> void env: managed block — do not edit between markers <<<
# Run `void env example` to refresh.
# required
STRIPE_KEY=
# with defaults
PORT=3000
# >>> end void env <<<
```

On first run, Void writes a fresh `.env.example` containing only the marker block. On subsequent runs, only the lines between the markers are replaced. If the file already exists with no markers, the block is appended at the end and Void prints a one-line notice (suppressed by `--force`).

The managed block is grouped into `required`, `with defaults`, and `optional` sections. Keys defined via `oneOf([...])` get a leading `# enum: A | B | C` comment listing the valid values, and keys with a `.default(x)` are prefilled. Commit the `.env.example` — it's the single source of truth for teammates and coding agents setting up the project.

## Secret redaction

Env validation errors, dev-server warnings, and CLI reports automatically replace secret-looking values with `<redacted>` before they surface. This keeps tokens out of Discord screenshots, GitHub issues, and CI logs when you paste an `EnvValidationError` stack.

Redaction is belt-and-braces:

1. **Explicit override.** The built-in helpers support `.secret()` and `.public()` modifiers, and they win over every heuristic:

   ```ts
   export default defineEnv({
     STRIPE_KEY: string().secret(), // always redacted
     PUBLIC_KEY: string().public(), // never redacted (opts out of the KEY heuristic)
     PORT: number(),
   });
   ```

   Third-party Standard Schema validators (valibot, zod, arktype) can't carry this flag — they fall back to the heuristics below.

2. **Key-name heuristic.** Values for keys matching `/KEY|TOKEN|SECRET|PASSWORD|PASS(WD)?|CREDENTIAL|PRIVATE|AUTH|BEARER|APIKEY|DSN/i` are redacted by default.

3. **Value-content heuristic.** Even on neutral keys, values that start with `sk_` / `pk_` / `ghp_` / `xoxb-` / `AKIA` or look like a ≥24-char high-entropy string are redacted. This catches wrong-file typos like `PORT=sk_live_abc123`, where the key is innocent but the value is a Stripe key.

The **key name itself is never masked** — you need it to locate the offending entry.

For local debugging, set `VOID_ENV_UNMASK=1` in your shell to see raw values in error output. On activation Void prints a one-shot notice to stderr so the loosened output is visibly attributed; unset it before sharing logs.

## Using `env.ts` with a meta-framework

The full env story works on every framework `voidPlugin()` supports — typegen, leak guard, folding, runtime reads on both server and client, plus all CLI-level features.

| Framework         | `env.ts` typegen | Client leak guard | Constant folding |   `env` on server   |     `env` on client     | `void env check` + deploy gate |
| ----------------- | :--------------: | :---------------: | :--------------: | :-----------------: | :---------------------: | :----------------------------: |
| Void (Pages mode) |       yes        |        yes        |       yes        |         yes         |     yes (`VITE_*`)      |              yes               |
| TanStack Start    |       yes        |        yes        |       yes        |         yes         |     yes (`VITE_*`)      |              yes               |
| React Router v7   |       yes        |        yes        |       yes        | yes (in `loader()`) |     yes (`VITE_*`)      |              yes               |
| SvelteKit         |       yes        |        yes        |       yes        | yes (runtime proxy) |     yes (`VITE_*`)      |              yes               |
| Nuxt              |       yes        |        yes        |       yes        |         yes         |     yes (`VITE_*`)      |              yes               |
| Analog            |       yes        |        yes        |       yes        |         yes         |     yes (`VITE_*`)      |              yes               |
| Astro             |       yes        |        yes        |       yes        |         yes         | yes (`envPrefix`-gated) |              yes               |

What you always get, regardless of framework:

- `void env check [--remote]` validates `.env*` files + remote secret names against the schema.
- `void deploy` hard-fails before upload when any required key is missing.
- `void env example` generates the marker-delimited `.env.example` block.
- `void init` scaffolds `env.ts` from existing dotenv files.
- Typed `.void/env.d.ts` so `env.X` autocompletes in editors.
- `void:env-client-guard` fails the build with a file:line:col error when a server-only key is referenced from a client module.
- Build-time constant folding for `envPrefix`-matched reads in the client bundle.

On Nuxt / Analog / Astro, `import { env }` works server-side through the same runtime proxy used on Class A targets — the proxy reads from the worker's `env` binding at request time. You're free to keep using the framework's native mechanism (`useRuntimeConfig()`, `event.context.cloudflare.env`, `import { env } from "cloudflare:workers"`, `Astro.locals.runtime.env`, `astro:env`) wherever it fits better — but you no longer _have_ to.

## Migration from untyped `c.env`

If you don't have an `env.ts`, `c.env.X` continues to work as `unknown` — no breaking change. To opt in, create `env.ts`, declare your keys, and the existing call sites become typed automatically. The recommended access pattern for new code is `import { env } from "void/env"`.

## How it compares

`void/env` is a Void-only module — it isn't a standalone env library you'd pull into a Nuxt, SvelteKit, or bare-Vite project. This section exists so you can see what the integrated Void env story includes relative to what you'd otherwise assemble yourself on those stacks, not as a pick-one-of-many benchmark.

Most frameworks ship _parts_ of an env story — loading, typing, validation, deploy checks — but stitching them together is left to the user. Here's how Void's single `env.ts` stacks up against the tools people reach for on other stacks today.

| Feature                                         | Void `env.ts` | `@t3-oss/env` | Astro `astro:env` | SvelteKit `$env` | Vite `import.meta.env` | Nuxt `runtimeConfig` | `dotenv` + `zod` (DIY) |
| ----------------------------------------------- | :-----------: | :-----------: | :---------------: | :--------------: | :--------------------: | :------------------: | :--------------------: |
| Single schema file                              |      yes      |      yes      |   yes (config)    |        no        |           no           |       partial        |          yes           |
| Runtime validation                              |      yes      |      yes      |        yes        |        no        |           no           |          no          |          yes           |
| Auto-generated types                            |      yes      |      yes      |        yes        |       yes        |   manual `env.d.ts`    |      yes (aug.)      |         manual         |
| Bring-your-own validator (Standard Schema)      |      yes      |      yes      |        no         |        no        |           no           |          no          |          yes           |
| Built-in helpers without installing a validator |      yes      |      no       |        yes        |        —         |           —            |          —           |           no           |
| Build-time guard against leaking server env     |      yes      |      yes      |        yes        |       yes        |      prefix only       |     prefix only      |           no           |
| Custom `envPrefix` honoured                     |      yes      |      yes      |        n/a        |       n/a        |          yes           |         n/a          |          n/a           |
| Schema defaults flow into runtime bindings      |      yes      |    partial    |        yes        |        no        |           no           |       partial        |         manual         |
| Async validators                                |      yes      |      no       |        no         |        no        |           no           |          no          |          yes           |
| `.env.example` scaffolding from schema          |      yes      |      no       |        no         |        no        |           no           |          no          |           no           |
| Deploy-time check (local + remote secrets)      |      yes      |      no       |        no         |        no        |           no           |          no          |           no           |
| Automatic secret redaction in validation errors |      yes      |      no       |        no         |        no        |           no           |          no          |           no           |
| Cloudflare secret store integration             |      yes      |      no       |        no         |        no        |           no           |          no          |           no           |
| Zero-config (auto-discovered, no plugin wiring) |      yes      |      no       |        yes        |       yes        |          yes           |         yes          |           no           |
| Schema scaffolded from existing `.env` files    |      yes      |      no       |        no         |        no        |           no           |          no          |           no           |
| `${VAR}` expansion, no `process.env` leakage    |      yes      |      no       |        no         |        no        |    partial (leaks)     |          no          |      needs plugin      |

### Where Void differs

- **One file, one call.** `defineEnv({...})` is the whole API surface. `@t3-oss/env` is the closest analogue but splits into `server`/`client`/`runtimeEnv` blocks and expects you to hand it `process.env`. Void auto-discovers `env.ts`, loads `.env*` via Vite's own resolver (honouring `envDir`), and wires the result into the plugin, the worker bundle, the CLI, and generated types without extra config.
- **Helpers _and_ Standard Schema, mixable.** Most solutions force a choice: either Zod-only (t3-env, many DIY setups), or a bespoke helper DSL with no escape hatch (Astro, SvelteKit). Void ships `string()`, `number()`, `boolean()`, `url()`, `email()`, `oneOf()`, `json<T>()` so a small project pulls in zero validator dependencies, and any [Standard Schema](https://standardschema.dev) library (valibot, zod, arktype) drops into the same object for richer rules.
- **Build-time leak prevention with source locations.** The `void:env-client-guard` plugin walks client module graphs and fails the build with a file:line:col pointer when a non-prefixed key is imported from the browser bundle. Vite on its own only enforces this through the _prefix convention_ — a renamed variable silently leaks. Void enforces both the prefix rule and the schema's server/client split.
- **Build-time constant folding for client reads.** Production client builds inline static `env.VITE_FOO` reads as literals so `if (env.MODE === 'production') { … }` branches tree-shake the same way `import.meta.env.MODE` already does. Server / SSR / worker code keeps the runtime proxy untouched, and only prefix-matching keys are ever folded — no schema-required validation is bypassed because the same values still flow through `defineEnv` on boot.
- **Defaults propagate everywhere.** `PORT: number().default(3000)` fills the typed proxy, the worker `vars` block in dev, the deploy manifest, and the prerender bindings — so `process.env.PORT`, `c.env.PORT`, and `env.PORT` all return `3000` when unset. t3-env and Nuxt only surface defaults in the typed object; the raw `process.env` still reads `undefined`.
- **Deploy is the enforcement point.** `void deploy` unions `.env*` with the remote secret list and hard-fails on any missing required key _before_ upload. No competing solution in the table treats deploy as a validation gate — the closest substitute is a handwritten CI script calling `zod.parse(process.env)`, which doesn't know about the target platform's remote secrets.
- **`.env.example` is generated, not maintained by hand.** `void env example` writes a marker-delimited block grouped into `required`, `with defaults`, `optional`, with enum hints for `oneOf` keys. Everything outside the markers (team CI tokens, comments) survives refresh. No other tool in the comparison ships this.
- **Async validators.** A validator can return a `Promise` — useful for probing a URL, fetching a JWKS, or resolving a secret reference at startup. t3-env and schema-based systems assume synchronous parsing.
- **Onboarding from an existing `.env`.** `void init` detects pre-existing dotenv files and writes a seeded `env.ts` with conservative type inference (boolean/URL/number/string) and a banner comment prompting you to tighten the guesses. Every other solution in the table requires you to hand-write the schema from scratch even when your team already has a `.env.example` committed.
