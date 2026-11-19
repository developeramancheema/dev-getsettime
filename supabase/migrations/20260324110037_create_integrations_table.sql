-- Third-party integrations (Google Calendar, Zoom, etc.).
create table if not exists public.integrations (
  id bigint generated always as identity not null,
  workspace_id bigint null references public.workspaces (id) on delete cascade,
  provider text not null,
  provider_user_id text null,
  credentials jsonb null,
  config jsonb null,
  created_at timestamp with time zone null default now(),
  constraint integrations_pkey primary key (id)
);

create index if not exists idx_integrations_workspace_provider
  on public.integrations (workspace_id, provider);

alter table public.integrations enable row level security;
