-- Invite tokens for bookings (present in live schema).
create table if not exists public.booking_invitations (
  id bigint generated always as identity not null,
  booking_id bigint not null references public.bookings (id) on delete cascade,
  token text not null,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  constraint booking_invitations_pkey primary key (id),
  constraint booking_invitations_token_key unique (token)
);

create index if not exists idx_booking_invitations_booking_id
  on public.booking_invitations (booking_id);

alter table public.booking_invitations enable row level security;
