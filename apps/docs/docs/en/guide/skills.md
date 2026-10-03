---
title: Skills
---

# Skills

A skill is a reusable agent capability above tools: Markdown instructions are
injected into the system prompt of agents that select them — the same model,
different "playbooks".

## Lifecycle

1. **Create**: four interchangeable sources —
   - the Web "Skills" page form (name / description / instructions);
   - **paste import**: paste a full `SKILL.md`, the server parses the
     frontmatter and validates it against the schema; name conflicts require
     an explicit overwrite confirmation;
   - import `<name>/SKILL.md` from the `FORGE_SKILLS_DIR` directory;
   - **bundle import**: import many skills at once from a `.json` bundle file;
2. **Inject**: select skills when editing a custom agent — changes take effect
   immediately (no restart);
3. **Usage stats**: each installed skill shows how many custom agents select
   it (hover for the list) — a proxy for popularity;
4. **Export**: a single skill exports as a standard `SKILL.md`; or export the
   whole library as a bundle JSON to migrate between installs or share with
   others.

## Directory Convention

```text
<skills-dir>/
└─ <skill-name>/
   └─ SKILL.md        # frontmatter (name / description) + Markdown instructions
```

The import directory is set server-side via `FORGE_SKILLS_DIR` (client paths
are rejected).

## Skill Marketplace

The marketplace ships a curated built-in catalog with the app (zero network
dependency) and supports:

- **One-click install**: import the entire catalog in a batch;
- **Per-skill install**: install individual skills on demand;
- **Overwrite protection**: locally modified skills are never silently
  overwritten — a forced update requires explicit confirmation;
- **Version-driven update hints**: the catalog is versioned; when the local
  version falls behind, the market card highlights "update available" in
  gold; same version with different content is marked "modified".

## Skill Bundles

A bundle is the carrier for whole-library migration and sharing: a JSON file
of `{version, exportedAt, skills[]}` shape (named
`adui-forge-skills-<date>.json`). Bundled skills keep their version numbers
across the round-trip so update tracking stays intact on the receiving side.
Import is an explicit restore: valid entries overwrite same-name skills,
invalid entries are skipped with a reason (up to 100 per bundle).

## Limits & Roadmap

- The current carrier is Instructions (plain text); Tools / Knowledge /
  Scripts carriers are planned;
- External skill sources (remote catalogs / online distribution) and a rating
  system are planned for later releases.
