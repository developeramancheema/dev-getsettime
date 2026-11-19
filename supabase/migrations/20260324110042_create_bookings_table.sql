-- Base bookings table. Later migrations add provider/department/contact,
-- reminders, public_code, timezones, series_id, etc.
create table if not exists public.bookings (
  id bigint generated always as identity not null,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  event_type_id bigint not null references public.event_types (id),
  host_user_id uuid null references auth.users (id),
  invitee_name text not null,
  invitee_email text null,
  invitee_phone text not null,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  status text not null default 'confirmed',
  location jsonb null,
  payment_id bigint null references public.payments (id),
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint bookings_pkey primary key (id)
);

create index if not exists idx_bookings_workspace_id
  on public.bookings (workspace_id);

create index if not exists idx_bookings_workspace_start_at
  on public.bookings (workspace_id, start_at);

create index if not exists idx_bookings_event_type_id
  on public.bookings (event_type_id);

alter table public.bookings enable row level security;

drop policy if exists "Users can view bookings from their workspace" on public.bookings;
create policy "Users can view bookings from their workspace"
  on public.bookings for select
  using (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );

drop policy if exists "Users can create bookings for their workspace" on public.bookings;
create policy "Users can create bookings for their workspace"
  on public.bookings for insert
  with check (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );

drop policy if exists "Users can update bookings in their workspace" on public.bookings;
create policy "Users can update bookings in their workspace"
  on public.bookings for update
  using (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );

drop policy if exists "Users can delete bookings from their workspace" on public.bookings;
create policy "Users can delete bookings from their workspace"
  on public.bookings for delete
  using (
    workspace_id = (auth.jwt() -> 'user_metadata' ->> 'workspace_id')::bigint
  );
