-- Separate from date reservations: vouchers are emailed manually by the owner.
create table public.gift_vouchers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  recipient_email text not null check (char_length(recipient_email) between 3 and 254),
  purchaser_email text,
  class_count integer not null,
  total_pence integer not null,
  refunded_pence integer not null default 0 check (refunded_pence >= 0 and refunded_pence <= total_pence),
  status text not null default 'pending' check (status in ('pending', 'paid', 'payment_failed', 'refunded', 'partially_refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  constraint gift_pack_price check (
    (class_count = 3 and total_pence = 6000) or
    (class_count = 6 and total_pence = 9600) or
    (class_count = 10 and total_pence = 14000)
  )
);
alter table public.gift_vouchers enable row level security;
revoke all on public.gift_vouchers from anon, authenticated;
grant select, insert, update on public.gift_vouchers to service_role;
