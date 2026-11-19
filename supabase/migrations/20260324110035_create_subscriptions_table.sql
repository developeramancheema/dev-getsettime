-- Legacy Stripe subscriptions table (superseded by workspace_subscriptions for app billing).
create table if not exists public.subscriptions (
  id bigint generated always as identity not null,
  workspace_id bigint null references public.workspaces (id) on delete set null,
  stripe_subscription_id text null,
  plan text null,
  status text null,
  current_period_end timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint subscriptions_pkey primary key (id)
);

create index if not exists idx_subscriptions_workspace_id on public.subscriptions (workspace_id);

alter table public.subscriptions enable row level security;
