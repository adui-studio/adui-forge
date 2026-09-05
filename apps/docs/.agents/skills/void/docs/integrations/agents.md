---
outline: deep
---

# Using Void with Coding Agents

Void integrates with coding agents via **skills** (agent instructions and reference docs) and an **MCP server** (tool-based documentation access). Both are set up as part of the default `void init` flow. To run only the agent setup step:

```sh
npx void init --agents
```

This detects your coding agent, links skills into its configuration directory, writes MCP config, and injects a Void reference block into your agent instructions file (`CLAUDE.md` or `AGENTS.md`). If auto-detection fails, it asks you to choose from Claude Code, Cursor, Codex, Gemini CLI, or Generic.

## Skills

Skills give your coding agent structured knowledge about Void, including how to use the CLI, build apps, work with routes, databases, auth, and more. They are symlinked from the `void` package into the agent's skills directory, so they stay version-matched with your installed Void version.

Void ships two skills:

- **`void`:** main development skill. Routes agent requests to the right documentation for CLI commands, routing, pages, database, auth, deployment, and more.
- **`migrate-vite-cloudflare-to-void`:** migration skill for converting existing `@cloudflare/vite-plugin` apps to Void.

Skills are linked automatically by `void init --agents`. For Claude Code, they are symlinked into `.claude/skills/`. Other agents that support skills will have them linked to their respective directories.

## MCP

Void ships with a built-in [MCP](https://modelcontextprotocol.io/) server that runs locally over stdio. It provides three tools: `list_pages`, `get_page`, and `search_docs`. Together they give your AI agent full access to the Void documentation, version-matched and usable offline.

```sh
npx void mcp
```

### Automatic Setup

MCP config is written automatically by `void init --agents`:

- Agents with project-level config support (Claude, Cursor, etc.): writes the config file for you.
- Agents without project-level config support (Codex, Gemini CLI, etc.): prints the CLI command to register `npx void mcp`.
- Generic mode: prints MCP JSON you can paste into your agent config.

### Manual Setup

#### Claude Code

```sh
claude mcp add void -- npx void mcp
```

#### Codex CLI

```sh
codex mcp add void -- npx void mcp
```

#### Cursor

In `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "void": {
      "command": "npx",
      "args": ["void", "mcp"]
    }
  }
}
```

#### Gemini CLI

In `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "void": {
      "command": "npx",
      "args": ["void", "mcp"]
    }
  }
}
```
