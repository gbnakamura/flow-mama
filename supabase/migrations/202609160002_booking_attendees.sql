-- Allow one parent/contact email to hold more than one place in the same session.
-- Baby details live on each booking so siblings retain their own roster details.

alter table public.bookings
  add column if not exists baby_name text,
  add column if not exists baby_age_months integer check (baby_age_months is null or baby_age_months between 0 and 60);

update public.bookings b
set
  baby_name = c.baby_name,
  baby_age_months = c.baby_age_months
from public.customers c
where c.id = b.customer_id
  and b.baby_name is null;

drop index if exists public.bookings_customer_active_slot_unique;

create or replace function public.copy_booking_baby_details()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.baby_name is null or new.baby_age_months is null then
    select c.baby_name, c.baby_age_months
    into new.baby_name, new.baby_age_months
    from public.customers c
    where c.id = new.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_copy_baby_details on public.bookings;
create trigger bookings_copy_baby_details
before insert on public.bookings
for each row execute function public.copy_booking_baby_details();

alter table public.customers
  alter column email drop not null,
  alter column email_normalized drop not null;

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

  if nullif(trim(p_email), '') is null then
    insert into public.customers (
      full_name, email, email_normalized, phone, baby_name, baby_age_months
    ) values (
      trim(p_full_name), null, null, trim(p_phone), trim(p_baby_name), p_baby_age_months
    ) returning id into v_customer_id;
  else
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
  end if;

  insert into public.bookings (
    slot_id, customer_id, source, manual_payment_type, status, baby_name, baby_age_months
  ) values (
    p_slot_id, v_customer_id, 'manual', p_payment_type, 'confirmed', trim(p_baby_name), p_baby_age_months
  ) returning id into v_booking_id;

  update public.slots set booked_count = booked_count + 1, updated_at = now() where id = p_slot_id;

  insert into public.admin_audit_log (admin_email, action, entity_type, entity_id, details)
  values (lower(p_admin_email), 'manual_booking_added', 'booking', v_booking_id::text, jsonb_build_object('slot_id', p_slot_id, 'payment_type', p_payment_type));

  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

grant execute on function public.add_manual_booking(uuid, text, text, text, text, integer, text, text) to service_role;
