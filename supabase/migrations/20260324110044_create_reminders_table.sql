-- Scheduled reminder jobs for bookings (present in live schema).
create table if not exists public.reminders (
  id bigint generated always as identity not null,
  booking_id bigint null references public.bookings (id) on delete cascade,
  send_at timestamp with time zone null,
  channel text null,
  status text null default 'pending',
  payload jsonb null,
  created_at timestamp with time zone null default now(),
  constraint reminders_pkey primary key (id)
);

create index if not exists idx_reminders_booking_id on public.reminders (booking_id);
create index if not exists idx_reminders_send_at_status on public.reminders (send_at, status);

alter table public.reminders enable row level security;
