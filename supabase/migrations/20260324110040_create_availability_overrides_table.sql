-- Date-specific availability overrides (present in live schema).
create table if not exists public.availability_overrides (
  id bigint generated always as identity not null,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  ranges jsonb not null,
  type text not null default 'override',
  created_at timestamp with time zone null,
  constraint availability_overrides_pkey primary key (id)
);

create index if not exists idx_availability_overrides_workspace_user_date
  on public.availability_overrides (workspace_id, user_id, date);

alter table public.availability_overrides enable row level security;
