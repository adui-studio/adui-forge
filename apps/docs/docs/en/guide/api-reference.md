---
title: API Reference
---

# API Reference

Base path `/api/v1`; machine-readable description at `GET /api/v1/openapi.json`.

| Endpoint                            | Method       | Description                                                          |
| ----------------------------------- | ------------ | -------------------------------------------------------------------- |
| `/health`                           | GET          | Health check (includes db status)                                    |
| `/auth/register` `/auth/login`      | POST         | Register / login (Argon2id + JWT)                                    |
| `/agents`                           | GET / POST   | List agents / create or update a custom agent                        |
| `/agents/{name}`                    | GET / DELETE | Agent detail / delete custom agent                                   |
| `/agents/models`                    | GET          | Named model catalog                                                  |
| `/runs`                             | GET / POST   | List runs (browse view, no event stream, latest 200) and create      |
| `/runs/{id}`                        | GET          | Run detail (events can derive token usage)                           |
| `/runs/{id}/events`                 | GET          | SSE event stream (snapshot + live)                                   |
| `/runs/{id}/artifacts`              | GET          | Run artifacts                                                        |
| `/runs/{id}/retry`                  | POST         | Retry run (new run, same task)                                       |
| `/runs/{id}/cancel`                 | POST         | Cancel run                                                           |
| `/approvals/pending`                | GET          | Pending approvals                                                    |
| `/approvals/{id}/decision`          | POST         | Submit approval decision                                             |
| `/tasks`                            | GET / POST   | Task ledger (creating derives a run)                                 |
| `/workflows`                        | GET / POST   | List / register workflow definitions (linear tasks or branchy graph) |
| `/workflows/{name}`                 | DELETE       | Delete a workflow                                                    |
| `/workflows/{name}/runs`            | POST         | Run a workflow (a run with `workflow(` agentName prefix)             |
| `/comparisons`                      | GET / POST   | Comparison batches (list / create)                                   |
| `/comparisons/{id}`                 | GET / DELETE | Batch detail (results derived from runs, incl. totalTokens) / delete |
| `/comparisons/{id}/export/{format}` | GET          | Export CSV / Markdown (incl. tokens column)                          |
| `/comparisons/stats`                | GET          | Cross-batch agent stats (avg duration / avg tokens / fastest wins)   |
| `/comparisons/stats/by-model`       | GET          | Same stats grouped by model                                          |
| `/conversations`                    | GET / POST   | Chat conversations (list / create)                                   |
| `/conversations/{id}`               | GET / DELETE | Conversation detail / delete                                         |
| `/conversations/{id}/title`         | PATCH        | Rename a conversation                                                |
| `/conversations/{id}/messages`      | POST         | Append a message                                                     |
| `/skills`                           | GET / POST   | Skill library (list / upsert)                                        |
| `/skills/{name}`                    | DELETE       | Delete a skill                                                       |
| `/skills/{name}/enabled`            | PATCH        | Toggle (rebuilds agents referencing it)                              |
| `/skills/{name}/export`             | GET          | Export a skill as SKILL.md                                           |
| `/skills/bundled`                   | GET          | Built-in skill catalog (versioned)                                   |
| `/skills/import-bundled`            | POST         | Install all bundled skills                                           |
| `/skills/import-bundled/{name}`     | POST         | Install one bundled skill (bundledVersion overwrite guard, force)    |
| `/skills/import-markdown`           | POST         | Import a pasted SKILL.md (server-side validation + overwrite guard)  |
| `/skills/export-bundle`             | GET          | Export the whole library as a bundle JSON                            |
| `/skills/import-bundle`             | POST         | Import a bundle (per-entry validation, max 100)                      |
| `/skills/usage`                     | GET          | Usage stats (how many custom agents select each skill)               |
| `/skills/import`                    | POST         | Import SKILL.md files from `FORGE_SKILLS_DIR`                        |
| `/workspace/tree` `/workspace/file` | GET          | Workspace file tree / content                                        |
| `/workspace/file`                   | PUT / DELETE | Write / delete a file                                                |
| `/workspace/git/status` `…/commit`  | GET / POST   | Git panel backend (status / diff / commit)                           |
| `/memory`                           | GET          | Session memory summaries                                             |
| `/metrics`                          | GET          | Run metrics                                                          |

Authentication: when `FORGE_AUTH_REQUIRED=1`, everything except
health/openapi requires `Authorization: Bearer <token>`.

The Local Runner serves the same shape for `workspace`, `runs` (subset) and
`approvals` (Trusted Local Mode) on `127.0.0.1` with a per-session token;
skills / conversations / comparisons are always served by the cloud API.
