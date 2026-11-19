-- Legacy memberships link (one row per user/workspace). Present in live schema.
create table if not exists public.memberships (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  role text null,
  created_at timestamp with time zone null default now(),
  constraint memberships_pkey primary key (id),
  constraint memberships_user_id_key unique (user_id),
  constraint memberships_workspace_id_key unique (workspace_id)
);

alter table public.memberships enable row level security;
