create extension if not exists pgcrypto;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  slug text not null unique,
  name text not null,
  location text,
  timezone text not null default 'Europe/London',
  booking_cutoff_time time not null default '21:00',
  booking_cutoff_days integer not null default 1 check (booking_cutoff_days >= 0),
  stripe_product_id text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_variants (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  slug text not null,
  name text not null,
  default_capacity integer not null check (default_capacity > 0),
  created_at timestamptz not null default now(),
  unique (programme_id, slug)
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  session_variant_id uuid not null references public.session_variants(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  booked_count integer not null default 0 check (booked_count >= 0 and booked_count <= capacity),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (session_variant_id, starts_at)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  email_normalized text not null unique,
  phone text not null,
  baby_name text not null,
  baby_age_months integer not null check (baby_age_months between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_product_id text not null,
  stripe_price_id text,
  quantity integer not null check (quantity > 0),
  unit_price_pence integer check (unit_price_pence is null or unit_price_pence >= 0),
  total_pence integer check (total_pence is null or total_pence >= 0),
  refunded_pence integer not null default 0 check (refunded_pence >= 0),
  status text not null default 'pending' check (
    status in (
      'pending', 'authorized', 'allocated_pending_capture', 'paid',
      'capacity_unavailable', 'payment_failed', 'cancelled',
      'partially_refunded', 'refunded'
    )
  ),
  eligibility_confirmed_at timestamptz not null,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_selections (
  order_id uuid not null references public.orders(id) on delete cascade,
  slot_id uuid not null references public.slots(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (order_id, slot_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict,
  slot_id uuid not null references public.slots(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  source text not null check (source in ('checkout', 'manual')),
  manual_payment_type text check (
    manual_payment_type is null or manual_payment_type in ('complimentary', 'bank_transfer', 'cash', 'payment_due')
  ),
  status text not null default 'confirmed' check (status in ('confirmed', 'removed', 'moved')),
  moved_to_booking_id uuid references public.bookings(id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index bookings_order_slot_unique
  on public.bookings(order_id, slot_id)
  where order_id is not null;

create unique index bookings_customer_active_slot_unique
  on public.bookings(customer_id, slot_id)
  where status = 'confirmed';

create table public.stripe_events (
  id text primary key,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.admin_users (
  email_normalized text primary key,
  created_at timestamptz not null default now()
);

create index slots_starts_at_idx on public.slots(starts_at);
create index slots_variant_idx on public.slots(session_variant_id);
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_programme_idx on public.orders(programme_id, created_at desc);
create index bookings_slot_idx on public.bookings(slot_id, status);
create index bookings_customer_idx on public.bookings(customer_id, created_at desc);

create or replace view public.public_availability
with (security_invoker = true)
as
select
  s.id,
  p.slug as programme_slug,
  v.name as variant_name,
  s.starts_at,
  s.ends_at,
  (
    s.status = 'scheduled'
    and p.status = 'published'
    and s.booked_count < s.capacity
    and (now() at time zone p.timezone) <
      ((s.starts_at at time zone p.timezone)::date - p.booking_cutoff_days + p.booking_cutoff_time)
  ) as available
from public.slots s
join public.session_variants v on v.id = s.session_variant_id
join public.programmes p on p.id = v.programme_id
where s.starts_at > now()
  and p.status = 'published';

create or replace function public.allocate_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_expected integer;
  v_updated integer;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'order_not_found');
  end if;

  if v_order.status in ('allocated_pending_capture', 'paid') then
    return jsonb_build_object('ok', true, 'reason', 'already_allocated');
  end if;

  if v_order.status <> 'authorized' then
    return jsonb_build_object('ok', false, 'reason', 'order_not_authorized');
  end if;

  perform 1
  from public.slots s
  join public.order_selections os on os.slot_id = s.id
  where os.order_id = p_order_id
  order by s.id
  for update of s;

  select count(*) into v_expected
  from public.order_selections
  where order_id = p_order_id;

  if v_expected = 0 or v_expected <> v_order.quantity then
    return jsonb_build_object('ok', false, 'reason', 'invalid_selection_count');
  end if;

  if exists (
    select 1
    from public.slots s
    join public.order_selections os on os.slot_id = s.id
    join public.session_variants v on v.id = s.session_variant_id
    join public.programmes p on p.id = v.programme_id
    where os.order_id = p_order_id
      and (
        s.status <> 'scheduled'
        or s.booked_count >= s.capacity
        or v.programme_id <> v_order.programme_id
        or (now() at time zone p.timezone) >=
          ((s.starts_at at time zone p.timezone)::date - p.booking_cutoff_days + p.booking_cutoff_time)
      )
  ) then
    update public.orders
    set status = 'capacity_unavailable', updated_at = now()
    where id = p_order_id;

    return jsonb_build_object('ok', false, 'reason', 'capacity_unavailable');
  end if;

  insert into public.bookings (order_id, slot_id, customer_id, source, status)
  select p_order_id, os.slot_id, v_order.customer_id, 'checkout', 'confirmed'
  from public.order_selections os
  where os.order_id = p_order_id
  on conflict (order_id, slot_id) where order_id is not null do nothing;

  update public.slots s
  set booked_count = booked_count + 1, updated_at = now()
  from public.order_selections os
  where os.order_id = p_order_id
    and os.slot_id = s.id
    and not exists (
      select 1 from public.bookings b
      where b.order_id = p_order_id
        and b.slot_id = s.id
        and b.created_at < now() - interval '5 seconds'
    );

  get diagnostics v_updated = row_count;

  if v_updated <> v_expected then
    raise exception 'allocation_count_mismatch';
  end if;

  update public.orders
  set status = 'allocated_pending_capture', updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'reason', 'allocated');
end;
$$;

create or replace function public.release_order_allocation(p_order_id uuid, p_status text default 'payment_failed')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('payment_failed', 'cancelled') then
    raise exception 'invalid_release_status';
  end if;

  perform 1 from public.orders where id = p_order_id for update;

  perform 1
  from public.slots s
  join public.bookings b on b.slot_id = s.id
  where b.order_id = p_order_id and b.status = 'confirmed'
  order by s.id
  for update of s;

  update public.slots s
  set booked_count = greatest(0, booked_count - 1), updated_at = now()
  from public.bookings b
  where b.order_id = p_order_id
    and b.status = 'confirmed'
    and b.slot_id = s.id;

  update public.bookings
  set status = 'removed', removed_at = now(), updated_at = now()
  where order_id = p_order_id and status = 'confirmed';

  update public.orders
  set status = p_status, updated_at = now()
  where id = p_order_id and status <> 'paid';
end;
$$;

create or replace function public.add_manual_booking(
  p_slot_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_baby_name text,
  p_baby_age_months integer,
  p_payment_type text,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots%rowtype;
  v_customer_id uuid;
  v_booking_id uuid;
begin
  if p_payment_type not in ('complimentary', 'bank_transfer', 'cash', 'payment_due') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_payment_type');
  end if;

  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found or v_slot.status <> 'scheduled' or v_slot.booked_count >= v_slot.capacity then
    return jsonb_build_object('ok', false, 'reason', 'capacity_unavailable');
  end if;

  insert into public.customers (
    full_name, email, email_normalized, phone, baby_name, baby_age_months
  ) values (
    trim(p_full_name), trim(p_email), lower(trim(p_email)), trim(p_phone), trim(p_baby_name), p_baby_age_months
  )
  on conflict (email_normalized) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    baby_name = excluded.baby_name,
    baby_age_months = excluded.baby_age_months,
    updated_at = now()
  returning id into v_customer_id;

  insert into public.bookings (
    slot_id, customer_id, source, manual_payment_type, status
  ) values (
    p_slot_id, v_customer_id, 'manual', p_payment_type, 'confirmed'
  ) returning id into v_booking_id;

  update public.slots set booked_count = booked_count + 1, updated_at = now() where id = p_slot_id;

  insert into public.admin_audit_log (admin_email, action, entity_type, entity_id, details)
  values (lower(p_admin_email), 'manual_booking_added', 'booking', v_booking_id::text, jsonb_build_object('slot_id', p_slot_id, 'payment_type', p_payment_type));

  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

create or replace function public.remove_booking(
  p_booking_id uuid,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'booking_not_found'); end if;
  if v_booking.status <> 'confirmed' then return jsonb_build_object('ok', true, 'reason', 'already_removed'); end if;

  perform 1 from public.slots where id = v_booking.slot_id for update;
  update public.bookings set status = 'removed', removed_at = now(), updated_at = now() where id = p_booking_id;
  update public.slots set booked_count = greatest(0, booked_count - 1), updated_at = now() where id = v_booking.slot_id;

  insert into public.admin_audit_log (admin_email, action, entity_type, entity_id, details)
  values (lower(p_admin_email), 'booking_removed', 'booking', p_booking_id::text, jsonb_build_object('slot_id', v_booking.slot_id));

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.move_booking(
  p_booking_id uuid,
  p_new_slot_id uuid,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_target public.slots%rowtype;
  v_new_booking_id uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.status <> 'confirmed' then
    return jsonb_build_object('ok', false, 'reason', 'booking_not_found');
  end if;
  if v_booking.slot_id = p_new_slot_id then
    return jsonb_build_object('ok', false, 'reason', 'same_slot');
  end if;

  perform 1 from public.slots where id in (v_booking.slot_id, p_new_slot_id) order by id for update;
  select * into v_target from public.slots where id = p_new_slot_id;
  if not found or v_target.status <> 'scheduled' or v_target.booked_count >= v_target.capacity then
    return jsonb_build_object('ok', false, 'reason', 'capacity_unavailable');
  end if;

  if v_booking.order_id is not null then
    insert into public.order_selections (order_id, slot_id)
    values (v_booking.order_id, p_new_slot_id)
    on conflict do nothing;
  end if;

  insert into public.bookings (order_id, slot_id, customer_id, source, manual_payment_type, status)
  values (v_booking.order_id, p_new_slot_id, v_booking.customer_id, v_booking.source, v_booking.manual_payment_type, 'confirmed')
  returning id into v_new_booking_id;

  update public.bookings set status = 'moved', moved_to_booking_id = v_new_booking_id, updated_at = now() where id = p_booking_id;
  update public.slots set booked_count = greatest(0, booked_count - 1), updated_at = now() where id = v_booking.slot_id;
  update public.slots set booked_count = booked_count + 1, updated_at = now() where id = p_new_slot_id;

  insert into public.admin_audit_log (admin_email, action, entity_type, entity_id, details)
  values (lower(p_admin_email), 'booking_moved', 'booking', p_booking_id::text, jsonb_build_object('from_slot_id', v_booking.slot_id, 'to_slot_id', p_new_slot_id, 'new_booking_id', v_new_booking_id));

  return jsonb_build_object('ok', true, 'booking_id', v_new_booking_id);
end;
$$;

alter table public.businesses enable row level security;
alter table public.programmes enable row level security;
alter table public.session_variants enable row level security;
alter table public.slots enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_selections enable row level security;
alter table public.bookings enable row level security;
alter table public.stripe_events enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where email_normalized = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create policy "Admin read businesses" on public.businesses for select to authenticated using (public.is_admin());
create policy "Admin manage programmes" on public.programmes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage variants" on public.session_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage slots" on public.slots for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin read customers" on public.customers for select to authenticated using (public.is_admin());
create policy "Admin read orders" on public.orders for select to authenticated using (public.is_admin());
create policy "Admin read selections" on public.order_selections for select to authenticated using (public.is_admin());
create policy "Admin manage bookings" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin read audit log" on public.admin_audit_log for select to authenticated using (public.is_admin());

revoke all on function public.allocate_order(uuid) from public, anon, authenticated;
revoke all on function public.release_order_allocation(uuid, text) from public, anon, authenticated;
revoke all on function public.add_manual_booking(uuid, text, text, text, text, integer, text, text) from public, anon, authenticated;
revoke all on function public.remove_booking(uuid, text) from public, anon, authenticated;
revoke all on function public.move_booking(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.allocate_order(uuid) to service_role;
grant execute on function public.release_order_allocation(uuid, text) to service_role;
grant execute on function public.add_manual_booking(uuid, text, text, text, text, integer, text, text) to service_role;
grant execute on function public.remove_booking(uuid, text) to service_role;
grant execute on function public.move_booking(uuid, uuid, text) to service_role;
