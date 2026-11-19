-- Automation workflows (present in live schema).
create table if not exists public.workflows (
  id bigint generated always as identity not null,
  workspace_id bigint null references public.workspaces (id) on delete cascade,
  name text null,
  trigger jsonb null,
  actions jsonb null,
  enabled boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint workflows_pkey primary key (id)
);

create index if not exists idx_workflows_workspace_id on public.workflows (workspace_id);

alter table public.workflows enable row level security;
