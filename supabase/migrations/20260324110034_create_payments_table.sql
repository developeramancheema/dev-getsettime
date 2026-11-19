-- Payments (referenced by bookings.payment_id). Present in live schema.
create table if not exists public.payments (
  id bigint generated always as identity not null,
  workspace_id bigint null references public.workspaces (id) on delete set null,
  stripe_payment_intent_id text null,
  amount_cents bigint null,
  currency text null,
  status text null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint payments_pkey primary key (id)
);

create index if not exists idx_payments_workspace_id on public.payments (workspace_id);

alter table public.payments enable row level security;
