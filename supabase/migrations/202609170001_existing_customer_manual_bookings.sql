-- Allow admins to add a saved customer to a session without re-entering their details.

create or replace function public.add_existing_customer_booking(
  p_slot_id uuid,
  p_customer_id uuid,
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
  v_booking_id uuid;
begin
  if p_payment_type not in ('complimentary', 'bank_transfer', 'cash', 'payment_due') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_payment_type');
  end if;

  if not exists (select 1 from public.customers where id = p_customer_id) then
    return jsonb_build_object('ok', false, 'reason', 'customer_not_found');
  end if;

  select * into v_slot
  from public.slots
  where id = p_slot_id
  for update;

  if not found or v_slot.status <> 'scheduled' or v_slot.booked_count >= v_slot.capacity then
    return jsonb_build_object('ok', false, 'reason', 'capacity_unavailable');
  end if;

  insert into public.bookings (
    slot_id, customer_id, source, manual_payment_type, status
  ) values (
    p_slot_id, p_customer_id, 'manual', p_payment_type, 'confirmed'
  ) returning id into v_booking_id;

  update public.slots
  set booked_count = booked_count + 1, updated_at = now()
  where id = p_slot_id;

  insert into public.admin_audit_log (admin_email, action, entity_type, entity_id, details)
  values (
    lower(p_admin_email),
    'existing_customer_booking_added',
    'booking',
    v_booking_id::text,
    jsonb_build_object(
      'slot_id', p_slot_id,
      'customer_id', p_customer_id,
      'payment_type', p_payment_type
    )
  );

  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

revoke all on function public.add_existing_customer_booking(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.add_existing_customer_booking(uuid, uuid, text, text) to service_role;
