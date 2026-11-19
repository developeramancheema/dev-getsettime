-- Base workspaces table (columns added later by ensure_workspaces_user_id,
-- add_workspaces_type, add_profession_id_to_workspaces, claim_free_signup…).
create table if not exists public.workspaces (
  id bigint generated always as identity not null,
  name text not null,
  slug text not null,
  logo_url text null,
  billing_customer_id text null,
  created_at timestamp with time zone not null default now(),
  embed_link text null,
  constraint workspaces_pkey primary key (id)
);

create unique index if not exists idx_workspaces_slug_unique on public.workspaces (slug);

alter table public.workspaces enable row level security;
