---
title: API Reference
---

# API Reference

Base path `/api/v1`; machine-readable description at `GET /api/v1/openapi.json`.

| Endpoint                            | Method       | Description                                     |
| ----------------------------------- | ------------ | ----------------------------------------------- |
| `/health`                           | GET          | Health check (includes db status)               |
| `/auth/register` `/auth/login`      | POST         | Register / login (Argon2id + JWT)               |
| `/agents`                           | GET          | Registered agents and their tools               |
| `/agents`                           | POST         | Create / update a custom agent                  |
| `/agents/{name}`                    | GET / DELETE | Agent detail / delete custom agent              |
| `/agents/models`                    | GET          | Named model catalog                             |
| `/runs`                             | GET / POST   | List runs (status/agentName filters) and create |
| `/runs/{id}`                        | GET          | Run detail                                      |
| `/runs/{id}/events`                 | GET          | SSE event stream (snapshot + live)              |
| `/runs/{id}/artifacts`              | GET          | Run artifacts                                   |
| `/runs/{id}/retry`                  | POST         | Retry run                                       |
| `/runs/{id}/cancel`                 | POST         | Cancel run                                      |
| `/approvals/pending`                | GET          | Pending approvals                               |
| `/approvals/{id}/decision`          | POST         | Submit approval decision                        |
| `/tasks`                            | GET / POST   | Task ledger (creating derives a run)            |
| `/workflows`                        | GET / POST   | List / register workflow definitions            |
| `/workflows/{name}/runs`            | POST         | Run a workflow                                  |
| `/workflows/{name}`                 | DELETE       | Delete a workflow                               |
| `/comparisons`                      | GET / POST   | Comparison batches (list / create)              |
| `/comparisons/stats`                | GET          | Cross-batch agent stats                         |
| `/comparisons/stats/by-model`       | GET          | Cross-batch stats grouped by model              |
| `/conversations`                    | GET / POST   | Chat conversations (list / create)              |
| `/conversations/{id}/messages`      | POST         | Append a message                                |
| `/skills`                           | GET / POST   | Skill library (list / upsert)                   |
| `/skills/import`                    | POST         | Import SKILL.md files from `FORGE_SKILLS_DIR`   |
| `/skills/{name}/export`             | GET          | Export a skill as SKILL.md                      |
| `/workspace/tree` `/workspace/file` | GET          | Workspace file tree / content                   |
| `/workspace/file`                   | PUT / DELETE | Write / delete a file                           |
| `/workspace/git/status` `…/commit`  | GET / POST   | Git panel backend (status / diff / commit)      |
| `/memory`                           | GET          | Session memory summaries                        |
| `/metrics`                          | GET          | Run metrics                                     |

Authentication: when `FORGE_AUTH_REQUIRED=1`, everything except
health/openapi requires `Authorization: Bearer <token>`.

The Local Runner serves the same shape for `workspace`, `runs` (subset) and
`approvals` (Trusted Local Mode) on `127.0.0.1` with a per-session token.
