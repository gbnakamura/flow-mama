-- Shared personal-training slots can be offered for group bookings, 1:1 bookings, or both.

alter table public.customers
  alter column baby_name drop not null,
  alter column baby_age_months drop not null;

alter table public.slots
  add column if not exists allowed_booking_modes text[],
  add column if not exists booking_mode text,
  drop constraint if exists slots_allowed_booking_modes_check,
  drop constraint if exists slots_booking_mode_check,
  add constraint slots_allowed_booking_modes_check check (
    allowed_booking_modes is null or (
      cardinality(allowed_booking_modes) > 0
      and allowed_booking_modes <@ array['group', 'one_to_one']::text[]
    )
  ),
  add constraint slots_booking_mode_check check (booking_mode is null or booking_mode in ('group', 'one_to_one'));

alter table public.order_selections
  add column if not exists booking_mode text,
  drop constraint if exists order_selections_booking_mode_check,
  add constraint order_selections_booking_mode_check check (booking_mode is null or booking_mode in ('group', 'one_to_one'));

alter table public.bookings
  add column if not exists booking_mode text,
  drop constraint if exists bookings_booking_mode_check,
  add constraint bookings_booking_mode_check check (booking_mode is null or booking_mode in ('group', 'one_to_one'));

insert into public.programmes (
  id, business_id, slug, name, timezone,
  booking_cutoff_time, booking_cutoff_days, status
)
values (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  'group-personal-training',
  'Personal Training',
  'Europe/London',
  '21:00',
  1,
  'published'
)
on conflict (id) do update set
  name = excluded.name,
  booking_cutoff_time = excluded.booking_cutoff_time,
  booking_cutoff_days = excluded.booking_cutoff_days,
  status = excluded.status,
  updated_at = now();

insert into public.session_variants (id, programme_id, slug, name, default_capacity)
values (
  '00000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000011',
  'personal-training',
  'Personal Training',
  3
)
on conflict (id) do update set name = excluded.name, default_capacity = excluded.default_capacity;

insert into public.slots (
  id, session_variant_id, starts_at, ends_at, capacity, allowed_booking_modes
)
values (
  '00000000-0000-4000-8000-000000000117',
  '00000000-0000-4000-8000-000000000022',
  '2026-09-25 09:00:00 Europe/London',
  '2026-09-25 10:00:00 Europe/London',
  3,
  array['group', 'one_to_one']::text[]
)
on conflict (id) do update set
  ends_at = excluded.ends_at,
  capacity = excluded.capacity,
  allowed_booking_modes = excluded.allowed_booking_modes,
  updated_at = now();

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
    and not (s.booking_mode = 'one_to_one' and s.booked_count > 0)
    and (now() at time zone p.timezone) <
      ((s.starts_at at time zone p.timezone)::date - p.booking_cutoff_days + p.booking_cutoff_time)
  ) as available,
  s.capacity,
  s.booked_count,
  s.allowed_booking_modes,
  s.booking_mode
from public.slots s
join public.session_variants v on v.id = s.session_variant_id
join public.programmes p on p.id = v.programme_id
where s.starts_at > now() and p.status = 'published';

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
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'order_not_found'); end if;
  if v_order.status in ('allocated_pending_capture', 'paid') then return jsonb_build_object('ok', true, 'reason', 'already_allocated'); end if;
  if v_order.status <> 'authorized' then return jsonb_build_object('ok', false, 'reason', 'order_not_authorized'); end if;

  perform 1 from public.slots s
  join public.order_selections os on os.slot_id = s.id
  where os.order_id = p_order_id order by s.id for update of s;

  select count(*) into v_expected from public.order_selections where order_id = p_order_id;
  if v_expected = 0 or v_expected <> v_order.quantity then return jsonb_build_object('ok', false, 'reason', 'invalid_selection_count'); end if;

  if exists (
    select 1
    from public.slots s
    join public.order_selections os on os.slot_id = s.id
    join public.session_variants v on v.id = s.session_variant_id
    join public.programmes p on p.id = v.programme_id
    where os.order_id = p_order_id and (
      s.status <> 'scheduled'
      or s.booked_count >= s.capacity
      or v.programme_id <> v_order.programme_id
      or (now() at time zone p.timezone) >= ((s.starts_at at time zone p.timezone)::date - p.booking_cutoff_days + p.booking_cutoff_time)
      or (p.slug = 'group-personal-training' and (
        os.booking_mode is null
        or s.allowed_booking_modes is null
        or not (os.booking_mode = any(s.allowed_booking_modes))
        or (s.booking_mode is not null and s.booking_mode <> os.booking_mode)
        or (os.booking_mode = 'one_to_one' and s.booked_count > 0)
      ))
      or (p.slug <> 'group-personal-training' and os.booking_mode is not null)
    )
  ) then
    update public.orders set status = 'capacity_unavailable', updated_at = now() where id = p_order_id;
    return jsonb_build_object('ok', false, 'reason', 'capacity_unavailable');
  end if;

  insert into public.bookings (order_id, slot_id, customer_id, source, status, booking_mode)
  select p_order_id, os.slot_id, v_order.customer_id, 'checkout', 'confirmed', os.booking_mode
  from public.order_selections os where os.order_id = p_order_id
  on conflict (order_id, slot_id) where order_id is not null do nothing;

  update public.slots s
  set booked_count = booked_count + 1,
      booking_mode = coalesce(s.booking_mode, os.booking_mode),
      updated_at = now()
  from public.order_selections os
  where os.order_id = p_order_id and os.slot_id = s.id;
  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then raise exception 'allocation_count_mismatch'; end if;

  update public.orders set status = 'allocated_pending_capture', updated_at = now() where id = p_order_id;
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
  if p_status not in ('payment_failed', 'cancelled') then raise exception 'invalid_release_status'; end if;
  perform 1 from public.orders where id = p_order_id for update;
  perform 1 from public.slots s join public.bookings b on b.slot_id = s.id
  where b.order_id = p_order_id and b.status = 'confirmed' order by s.id for update of s;

  update public.slots s
  set booked_count = greatest(0, s.booked_count - 1),
      booking_mode = case when greatest(0, s.booked_count - 1) = 0 then null else s.booking_mode end,
      updated_at = now()
  from public.bookings b
  where b.order_id = p_order_id and b.status = 'confirmed' and b.slot_id = s.id;

  update public.bookings set status = 'removed', removed_at = now(), updated_at = now()
  where order_id = p_order_id and status = 'confirmed';
  update public.orders set status = p_status, updated_at = now() where id = p_order_id and status <> 'paid';
end;
$$;

create or replace function public.remove_booking(p_booking_id uuid, p_admin_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'booking_not_found'); end if;
  if v_booking.status <> 'confirmed' then return jsonb_build_object('ok', true, 'reason', 'already_removed'); end if;
  perform 1 from public.slots where id = v_booking.slot_id for update;
  update public.bookings set status = 'removed', removed_at = now(), updated_at = now() where id = p_booking_id;
  update public.slots
  set booked_count = greatest(0, booked_count - 1),
      booking_mode = case when greatest(0, booked_count - 1) = 0 then null else booking_mode end,
      updated_at = now()
  where id = v_booking.slot_id;
  insert into public.admin_audit_log (admin_email, action, entity_type, entity_id, details)
  values (lower(p_admin_email), 'booking_removed', 'booking', p_booking_id::text, jsonb_build_object('slot_id', v_booking.slot_id));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.add_manual_training_booking(
  p_slot_id uuid, p_full_name text, p_email text, p_phone text,
  p_booking_mode text, p_payment_type text, p_admin_email text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slot public.slots%rowtype; v_customer_id uuid; v_booking_id uuid;
begin
  if p_payment_type not in ('complimentary', 'bank_transfer', 'cash', 'payment_due') then return jsonb_build_object('ok', false, 'reason', 'invalid_payment_type'); end if;
  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found or v_slot.status <> 'scheduled' or v_slot.booked_count >= v_slot.capacity
    or p_booking_mode is null or not (p_booking_mode = any(v_slot.allowed_booking_modes))
    or (v_slot.booking_mode is not null and v_slot.booking_mode <> p_booking_mode)
    or (p_booking_mode = 'one_to_one' and v_slot.booked_count > 0)
  then return jsonb_build_object('ok', false, 'reason', 'capacity_unavailable'); end if;

  if nullif(trim(p_email), '') is null then
    insert into public.customers (full_name, email, email_normalized, phone, baby_name, baby_age_months)
    values (trim(p_full_name), null, null, trim(p_phone), null, null) returning id into v_customer_id;
  else
    insert into public.customers (full_name, email, email_normalized, phone, baby_name, baby_age_months)
    values (trim(p_full_name), trim(p_email), lower(trim(p_email)), trim(p_phone), null, null)
    on conflict (email_normalized) do update set full_name = excluded.full_name, email = excluded.email, phone = excluded.phone, updated_at = now()
    returning id into v_customer_id;
  end if;

  insert into public.bookings (slot_id, customer_id, source, manual_payment_type, status, booking_mode)
  values (p_slot_id, v_customer_id, 'manual', p_payment_type, 'confirmed', p_booking_mode) returning id into v_booking_id;
  update public.slots set booked_count = booked_count + 1, booking_mode = coalesce(booking_mode, p_booking_mode), updated_at = now() where id = p_slot_id;
  insert into public.admin_audit_log (admin_email, action, entity_type, entity_id, details)
  values (lower(p_admin_email), 'manual_training_booking_added', 'booking', v_booking_id::text, jsonb_build_object('slot_id', p_slot_id, 'booking_mode', p_booking_mode, 'payment_type', p_payment_type));
  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

create or replace function public.add_existing_customer_training_booking(
  p_slot_id uuid, p_customer_id uuid, p_booking_mode text,
  p_payment_type text, p_admin_email text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slot public.slots%rowtype; v_booking_id uuid;
begin
  if p_payment_type not in ('complimentary', 'bank_transfer', 'cash', 'payment_due') then return jsonb_build_object('ok', false, 'reason', 'invalid_payment_type'); end if;
  if not exists (select 1 from public.customers where id = p_customer_id) then return jsonb_build_object('ok', false, 'reason', 'customer_not_found'); end if;
  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found or v_slot.status <> 'scheduled' or v_slot.booked_count >= v_slot.capacity
    or p_booking_mode is null or not (p_booking_mode = any(v_slot.allowed_booking_modes))
    or (v_slot.booking_mode is not null and v_slot.booking_mode <> p_booking_mode)
    or (p_booking_mode = 'one_to_one' and v_slot.booked_count > 0)
  then return jsonb_build_object('ok', false, 'reason', 'capacity_unavailable'); end if;
  insert into public.bookings (slot_id, customer_id, source, manual_payment_type, status, booking_mode)
  values (p_slot_id, p_customer_id, 'manual', p_payment_type, 'confirmed', p_booking_mode) returning id into v_booking_id;
  update public.slots set booked_count = booked_count + 1, booking_mode = coalesce(booking_mode, p_booking_mode), updated_at = now() where id = p_slot_id;
  insert into public.admin_audit_log (admin_email, action, entity_type, entity_id, details)
  values (lower(p_admin_email), 'existing_customer_training_booking_added', 'booking', v_booking_id::text, jsonb_build_object('slot_id', p_slot_id, 'customer_id', p_customer_id, 'booking_mode', p_booking_mode, 'payment_type', p_payment_type));
  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

revoke all on function public.add_manual_training_booking(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.add_existing_customer_training_booking(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.add_manual_training_booking(uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.add_existing_customer_training_booking(uuid, uuid, text, text, text) to service_role;
