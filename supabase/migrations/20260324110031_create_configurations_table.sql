-- Per-workspace settings (JSON blob used across signup, settings, embed, bookings).
create table if not exists public.configurations (
  id bigint generated always as identity not null,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  settings jsonb null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  constraint configurations_pkey primary key (id)
);

create unique index if not exists idx_configurations_workspace_id_unique
  on public.configurations (workspace_id);

create index if not exists idx_configurations_workspace_id
  on public.configurations (workspace_id);

alter table public.configurations enable row level security;

drop policy if exists "Users can view configurations from their workspace" on public.configurations;
create policy "Users can view configurations from their workspace"
  on public.configurations for select
  using (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );

drop policy if exists "Users can insert configurations for their workspace" on public.configurations;
create policy "Users can insert configurations for their workspace"
  on public.configurations for insert
  with check (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );

drop policy if exists "Users can update configurations in their workspace" on public.configurations;
create policy "Users can update configurations in their workspace"
  on public.configurations for update
  using (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );
