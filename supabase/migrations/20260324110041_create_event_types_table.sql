-- Base event_types (extra columns added by add_event_types_status,
-- add_event_types_form_fields, update_event_types_assignments_and_booking_pattern).
create table if not exists public.event_types (
  id bigint generated always as identity not null,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id),
  title text not null,
  slug text not null,
  duration_minutes bigint not null,
  buffer_before bigint null default 0,
  buffer_after bigint null default 0,
  location_type text null,
  location_value jsonb null,
  is_public boolean null default true,
  settings jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint event_types_pkey primary key (id)
);

create index if not exists idx_event_types_workspace_id
  on public.event_types (workspace_id);

create index if not exists idx_event_types_workspace_slug
  on public.event_types (workspace_id, slug);

alter table public.event_types enable row level security;

drop policy if exists "Users can view event_types from their workspace" on public.event_types;
create policy "Users can view event_types from their workspace"
  on public.event_types for select
  using (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
    or is_public = true
  );

drop policy if exists "Users can create event_types for their workspace" on public.event_types;
create policy "Users can create event_types for their workspace"
  on public.event_types for insert
  with check (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );

drop policy if exists "Users can update event_types in their workspace" on public.event_types;
create policy "Users can update event_types in their workspace"
  on public.event_types for update
  using (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );

drop policy if exists "Users can delete event_types from their workspace" on public.event_types;
create policy "Users can delete event_types from their workspace"
  on public.event_types for delete
  using (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );
