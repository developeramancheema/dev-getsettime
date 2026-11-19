# Supabase Migrations

SQL migrations for the GetSetTime schema. Filenames follow the Supabase CLI format:

`YYYYMMDDHHMMSS_description.sql`

Source of truth for the live shape: `docs/DB Backups/Nov 2026/full-db-schema.sql`.

## Missing-table baselines (added from full-db-schema)

These tables existed in the live DB but had no CREATE migration before:

| Migration | Table(s) |
|---|---|
| `…_create_workspaces_table.sql` | `workspaces` |
| `…_create_configurations_table.sql` | `configurations` |
| `…_create_memberships_table.sql` | `memberships` |
| `…_create_users_profile_table.sql` | `users_profile` |
| `…_create_payments_table.sql` | `payments` |
| `…_create_subscriptions_table.sql` | `subscriptions` |
| `…_create_workflows_table.sql` | `workflows` |
| `…_create_integrations_table.sql` | `integrations` |
| `…_create_audit_logs_table.sql` | `audit_logs` |
| `…_create_availability_table.sql` | `availability` |
| `…_create_availability_overrides_table.sql` | `availability_overrides` |
| `…_create_event_types_table.sql` | `event_types` |
| `…_create_bookings_table.sql` | `bookings` |
| `…_create_booking_invitations_table.sql` | `booking_invitations` |
| `…_create_reminders_table.sql` | `reminders` |

Base CREATEs include only original columns. Later `add_*` / `update_*` migrations remain idempotent (`IF NOT EXISTS`) and apply the rest.

Circular FKs (`workspaces.profession_id`, `workspaces.claimed_code_id`) are intentionally deferred to later migrations.

## Running with Yarn / Supabase CLI

```bash
# from repo root (after: yarn add -D supabase && npx supabase init)
yarn supabase start
yarn supabase db reset          # apply all migrations locally
yarn supabase db push           # push to a linked remote project
yarn supabase migration new <name>
```

Suggested root `package.json` scripts:

```json
{
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:push": "supabase db push",
  "db:link": "supabase link --project-ref"
}
```

## Important: rename vs existing remotes

If a remote project already recorded the **old** descriptive filenames in `supabase_migrations.schema_migrations`, renaming files will desync history. Prefer:

1. **Local / new environments:** `supabase db reset`
2. **Existing remotes:** repair history (`supabase migration repair`) or apply only the new CREATE files manually once, without replaying renamed history

## Timestamp naming

Timestamps come from each file’s **LastWriteTime** (`CreationTime` is unreliable — most files share a clone date of 28-Sep-26).

Rules:

1. **Historical files** → `yyyyMMddHHmmss` from `LastWriteTime` (41 kept exact)
2. **New baseline CREATEs** (added 19-Nov-26) → synthetic stamps starting 15 minutes before the earliest historical file (`20260324110030`…), so they run before dependent `ALTER`s
3. **FK safety** → only bump a stamp (+1s) when a hard dependency would otherwise run out of order, or to resolve same-second collisions

Examples: `create_activity_events` → `20260602124950_…`, `create_date_exceptions` → `20260715195030_…`.
