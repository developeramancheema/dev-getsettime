-- Generic audit log table (present in live schema; activity_events is the newer app feed).
create table if not exists public.audit_logs (
  id bigint generated always as identity not null,
  workspace_id bigint null,
  user_id uuid null,
  action text null,
  object_type text null,
  object_id text null,
  details jsonb null,
  created_at timestamp with time zone null default now(),
  constraint audit_logs_pkey primary key (id)
);

create index if not exists idx_audit_logs_workspace_created
  on public.audit_logs (workspace_id, created_at desc);

alter table public.audit_logs enable row level security;
