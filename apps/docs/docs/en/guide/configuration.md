---
title: Configuration
---

# Configuration

Environment variables come from `apps/api/.env` (copy the root `.env.example`)
or the deployment environment.

## Database & Infrastructure

| Variable       | Description                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection; enables persistence for runs/tasks/users/workflows/…, otherwise in-memory fallback |
| `REDIS_URL`    | Redis (reserved)                                                                                          |

## Models

| Variable               | Description                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| `FORGE_MODEL_BASE_URL` | OpenAI-compatible endpoint (default agent not registered if unset)              |
| `FORGE_MODEL_ID`       | Model ID (business code never hard-codes model names)                           |
| `FORGE_MODEL_API_KEY`  | Model API key                                                                   |
| `FORGE_MODEL_NAME`     | Provider name (default forge-provider)                                          |
| `FORGE_MODELS`         | JSON array of named models; selectable per custom agent (`apiKeyEnv` supported) |

## Agent Loop & Sandbox

| Variable                   | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `FORGE_AGENT_MAX_STEPS`    | Max model rounds (default 16)                            |
| `FORGE_AGENT_TIMEOUT_MS`   | Run timeout (default 300000)                             |
| `FORGE_AGENT_TOKEN_LIMIT`  | Cumulative token limit (optional)                        |
| `FORGE_SANDBOX`            | `docker` (default) / `host` / `off`                      |
| `FORGE_SANDBOX_IMAGE`      | Docker sandbox image (default node:22-bookworm)          |
| `FORGE_WORKSPACE_ROOT`     | Root for the workspace file API                          |
| `FORGE_TRUSTED_LOCAL_MODE` | `1` enables Host sandbox (no isolation — explicit trust) |

## Skills, MCP & Auth

| Variable              | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `FORGE_SKILLS_DIR`    | Directory scanned for `<name>/SKILL.md` imports (server-side only)          |
| `FORGE_MCP_SERVERS`   | JSON array `[{name, command, args?, env?}]`, connected at startup via stdio |
| `FORGE_JWT_SECRET`    | JWT signing secret (required when auth enabled)                             |
| `FORGE_AUTH_REQUIRED` | `1` enables global Bearer validation                                        |
