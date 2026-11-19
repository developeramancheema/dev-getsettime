-- Weekly availability windows per user/workspace (present in live schema).
create table if not exists public.availability (
  id bigint generated always as identity not null,
  workspace_id bigint null references public.workspaces (id) on delete cascade,
  user_id uuid null references auth.users (id) on delete cascade,
  weekday bigint not null,
  from_time time without time zone not null,
  to_time time without time zone not null,
  created_at timestamp with time zone not null default now(),
  constraint availability_pkey primary key (id)
);

create index if not exists idx_availability_workspace_user
  on public.availability (workspace_id, user_id);

alter table public.availability enable row level security;
