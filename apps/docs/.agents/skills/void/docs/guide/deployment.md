---
outline: deep
---

# Deployment

Void apps run on Cloudflare's infrastructure but you don't need to use your own Cloudflare account. Our long term goal is to provide a simpler app-centric deployment experience similar to that of Vercel and Netlify. But right now, Void only supports deploying via the CLI or GitHub actions.

## CLI

### First deploy

```bash
void init               # can handle auth + project setup during onboarding
void deploy             # auto-detects app type, builds, deploys
```

If you skipped Void project setup during `void init`, you can still run `void auth login` manually. On first deploy, the CLI will prompt you to create or select a project if none is linked yet. The project link is saved to `.void/project.json` for subsequent deploys.

### Migrations

If your app uses Drizzle, `void deploy` runs migrations as part of the deploy flow:

1. Build the app
2. Read SQL migrations from `db/migrations/`
3. Fail if the schema has drifted ahead of the committed migrations
4. Apply pending migrations to the target database
5. Make the new deploy live

Deploy always uses checked-in migration files. If drift is detected, run `void db generate`, review the generated migration, commit it yourself, then rerun deploy. For the full database workflow and backend-specific details, see the [Database guide](./database.md).

### Flags

```bash
void deploy [--project <name>] [--dir <path>] [--spa]
```

| Flag               | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `--project <name>` | Target a specific project by slug                 |
| `--dir <path>`     | Deploy a pre-built static directory (skips build) |
| `--spa`            | Use SPA mode instead of SSG for static deploys    |

### Project resolution

The CLI resolves which project to deploy to in this order:

1. `--project <name>` flag
2. `VOID_PROJECT` environment variable
3. Linked project in `.void/project.json`

If none match, the CLI prompts interactively.

### CI preparation

If your CI pipeline runs typechecking or other static analysis before deploy, run `void prepare` after install to generate the `.void/` artifacts without booting Vite.

### Environment variables

| Variable       | Purpose                          |
| -------------- | -------------------------------- |
| `VOID_TOKEN`   | Auth token (for CI, skips OAuth) |
| `VOID_PROJECT` | Project slug override            |

## GitHub Actions

You can deploy from a GitHub repo on every push to `main`. Running `void init --github` generates `.github/workflows/void-deploy.yml` in your project.

The workflow authenticates with [GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) — there is **no long-lived `VOID_TOKEN` secret to store or rotate**. `void deploy` detects GitHub Actions and does the exchange itself: it requests a short-lived OIDC token from GitHub (audience `void`), exchanges it at `POST $VOID_API_URL/auth/github-oidc` for a short-lived project-scoped deploy token (about 15 minutes on the free tier; longer on higher plans, capped at ~60 minutes), and deploys — so the workflow is a single `void deploy` step. `permissions: id-token: write` is still required: it is what lets the job (and the CLI) mint the OIDC token.

```yaml
name: Deploy to Void
on:
  push:
    branches: [main]

# Latest push wins: a newer commit cancels an in-flight deploy for the same
# repo + branch, so an older commit can never overtake a newer one.
concurrency:
  group: void-deploy-${{ github.repository }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  id-token: write
  contents: read

env:
  VOID_API_URL: ${{ vars.VOID_API_URL || 'https://api.void.cloud' }}
  VOID_PROJECT: my-app

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - name: Deploy
        run: npx void deploy --project "$VOID_PROJECT"
```

Connect the repository to your project once with `void github connect <project> --repo <owner/repo> --executor github_actions` to authorize it. This GitHub Actions path requires the `github_actions` build executor — the default `container` executor will not work with this workflow. The exact steps vary by package manager (the scaffold detects pnpm, yarn, bun, or npm). The `VOID_PROJECT` value is baked in from your linked project when known; otherwise the workflow reads a `VOID_PROJECT` repository variable. To target staging, set a `VOID_API_URL` repository variable to `https://api.staging.void.cloud`.

## Other Targets

If you prefer to deploy directly to your own Cloudflare account instead of using Void's managed platform, run `void deploy --backend cloudflare` (add `--provision` on the first deploy to create the D1/KV/R2/Queues/Hyperdrive resources your app needs). This uses your local wrangler auth and root `wrangler.jsonc` -- pin an account (`account_id` or `CLOUDFLARE_ACCOUNT_ID`) and keep real secrets in `wrangler secret put` rather than `.env`. `wrangler login` is enough to authenticate, with one exception: provisioning a **Hyperdrive** config for the first time needs `CLOUDFLARE_API_TOKEN`, because wrangler exposes no machine-readable Hyperdrive list for Void to check against (an already-provisioned Hyperdrive app deploys fine under `wrangler login`). In v1 it deploys **full Void apps on the Cloudflare Workers target** (D1/KV/R2/Queues/Hyperdrive; auth and ISR on D1/SQLite); framework SSR (TanStack Start, React Router, vinext, SvelteKit, Nuxt, Analog, Astro), static/SPA/SSG apps (including `output: "static"`), WebSocket/Durable Object apps (`*.ws.ts`), a custom `migrations_pattern`, `--skip-build`, `node`/`bun`/`deno` targets, and PostgreSQL apps with auth all fail closed with guidance. Auth apps must ship checked-in migrations that produce the Better Auth schema. Provision is a single-operator, dev-machine step and is disabled in CI. See the [Cloudflare integration guide](../integrations/cloudflare.md#deploy-to-your-own-cloudflare-account) for the full walk-through and scope.

To deploy to Node.js, Bun, or Deno instead of Cloudflare, set [`target`](../reference/config.md) in `void.json`. This builds a standalone server you can run anywhere, including Docker, Railway, and Fly.io. These targets do not have access to Void platform features such as D1, KV, R2, built-in auth, Workers AI, or cron scheduling. See the [Node.js, Bun, and Deno guide](../integrations/nodejs-bun-deno.md).
