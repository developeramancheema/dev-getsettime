-- Auth-linked user profile (present in live schema).
create table if not exists public.users_profile (
  id uuid not null references auth.users (id) on delete cascade,
  full_name text null,
  avatar_url text null,
  time_zone text null default 'UTC',
  locale text null default 'en',
  phone text null,
  email text null,
  created_at timestamp with time zone null default now(),
  user_metadata text null,
  constraint users_profile_pkey primary key (id)
);

alter table public.users_profile enable row level security;
