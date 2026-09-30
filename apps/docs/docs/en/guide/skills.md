---
title: Skills
---

# Skills

A skill is a reusable agent capability above tools: Markdown instructions are
injected into the system prompt of agents that select them — the same model,
different "playbooks".

## Lifecycle

1. **Create**: on the Web "Skills" page (name / description / instructions), or
   import `<name>/SKILL.md` from the `FORGE_SKILLS_DIR` directory;
2. **Inject**: select skills when editing a custom agent — changes take effect
   immediately (no restart);
3. **Export**: any skill can be exported as a standard `SKILL.md`, closing the
   loop back to your repository.

## Directory Convention

```text
<skills-dir>/
└─ <skill-name>/
   └─ SKILL.md        # frontmatter (name / description) + Markdown instructions
```

The import directory is set server-side via `FORGE_SKILLS_DIR` (client paths
are rejected).

## Limits & Roadmap

- The current carrier is Instructions (plain text); Tools / Knowledge /
  Scripts carriers and versioning are planned;
- **Skill Marketplace** is a placeholder capability: shareable skill packs,
  ratings and distribution — the underlying schema and import/export are ready;
  the marketplace itself ships in a later release.
