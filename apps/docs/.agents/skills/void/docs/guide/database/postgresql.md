---
outline: deep
---

# PostgreSQL

Void supports PostgreSQL via [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/). You bring the Postgres database, and Void handles connection pooling plus deployment wiring through the same Drizzle-based workflow used for D1.

## What is Hyperdrive?

Hyperdrive is Cloudflare's connection pooling and caching layer for PostgreSQL. It maintains persistent connections from the edge to your database, dramatically reducing connection latency. Instead of establishing a new TCP + TLS connection on every request, your Worker reuses pooled connections through Hyperdrive.

Void manages the Hyperdrive configuration automatically. You only provide the connection string.

## Configuration

### 1. Set the database

Add to your `void.json`:

```json
{
  "database": "pg"
}
```

### 2. Add your connection string

For local development, add `DATABASE_URL` to `.env.local`:

```
DATABASE_URL=postgresql://user:password@host:5432/mydb?sslmode=require
```

This connects directly to your Postgres database during local Vite development.

### 3. Deploy

On your first deploy, the CLI will prompt for your connection string:

```
Your project uses PostgreSQL. Enter your connection string:
> postgresql://user:password@host:5432/mydb?sslmode=require
```

Void provisions a Hyperdrive configuration and stores only the config ID. Your connection string is sent directly to Cloudflare's API and is never stored by Void.
Both `postgres://` and `postgresql://` URLs are supported, including provider-supplied query strings such as `?sslmode=require`.

You can also set the connection string ahead of time with `void db set-url`.

## Schema Definition

With the `postgresql` dialect, import schema helpers from `void/schema-pg` (re-exports from `drizzle-orm/pg-core`):

```ts
// db/schema.ts
import { pgTable, serial, text, timestamp, boolean, doublePrecision } from "void/schema-pg";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

`void gen model` generates PostgreSQL-appropriate code when the dialect is set to `postgresql`.

## Migrations

The migration workflow is the same as D1:

```bash
# Generate migration files from schema changes
void db generate

# Apply pending migrations locally
void db migrate

# Check migration status
void db status
```

The main difference is that PostgreSQL supports **transactional DDL**. Each migration is wrapped in `BEGIN` and `COMMIT`, so a failure rolls back the whole migration instead of leaving the database half-updated.

## Deploy Workflow

When you run `void deploy` with a PostgreSQL project:

1. The app is built
2. Migration files are collected from `db/migrations/`
3. If Hyperdrive hasn't been provisioned yet, you're prompted for the connection string
4. Pending migrations run inside the deployed worker via Hyperdrive
5. The new worker goes live

## Updating the Connection String

To update the connection string for an existing deployment (e.g. migrating to a new database host):

```bash
void db set-url
```

This prompts for the new connection string and updates the Hyperdrive configuration. The change takes effect on the next deploy.
