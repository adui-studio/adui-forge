---
title: Deployment
---

# Deployment

## Docs site (GitHub Pages)

Pushing to main when `apps/docs/**`, the lockfile or workflow files change
triggers
[deploy-docs.yml](https://github.com/adui-studio/adui-forge/blob/main/.github/workflows/deploy-docs.yml)
which builds and publishes to <https://adui-studio.github.io/adui-forge/>.

The site is hosted under the project sub-path; `RSPRESS_BASE=/adui-forge/` is
injected at build time. Both locales (zh/en) are built.

## API / Web (Docker Compose)

```bash
docker compose -f infra/docker-compose.yml up -d
# postgres :5432 · redis :6379 · minio :9000/:9001 · api :3000 · web :8080
```

- The web container serves static assets via Nginx and proxies `/api`
  (SSE buffering disabled);
- The API container receives `FORGE_*` variables (see
  [Configuration](/guide/configuration.html));
- Run `pnpm --filter @adui-forge/api db:migrate` once after first start.

## Desktop (Tauri 2)

```bash
pnpm --filter @adui-forge/web build        # web assets first
node scripts/build-runner.mjs windows-x64  # Local Runner sidecar (Bun)
pnpm --filter @adui-forge/desktop bundle   # NSIS / MSI installers
```

Tag pushes (`v*`) trigger the release workflow which builds installers and
APKs automatically and uploads them to GitHub Releases.

## Mobile (Flutter)

```bash
cd apps/mobile
flutter build apk        # Android
flutter build ios        # iOS (needs macOS + Xcode)
```

## Verification

- Full gate: `pnpm run ready` (check / test / build — same as CI)
- Post-deploy smoke: `pnpm run smoke` (asserts core endpoints against a
  running API)
