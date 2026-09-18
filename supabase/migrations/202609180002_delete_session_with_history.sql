-- Permit an authenticated administrator (through the service-role-only RPC) to
-- delete a session and its attendance links while retaining customer, order and
-- payment records for accounting and support history.

create or replace function public.delete_session(
  p_slot_id uuid,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots%rowtype;
  v_booking_count integer;
  v_selection_count integer;
begin
  select * into v_slot
  from public.slots
  where id = p_slot_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'session_not_found');
  end if;

  select count(*) into v_booking_count
  from public.bookings
  where slot_id = p_slot_id;

  select count(*) into v_selection_count
  from public.order_selections
  where slot_id = p_slot_id;

  delete from public.bookings where slot_id = p_slot_id;
  delete from public.order_selections where slot_id = p_slot_id;
  delete from public.slots where id = p_slot_id;

  insert into public.admin_audit_log (
    admin_email,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    lower(p_admin_email),
    'session_deleted_with_history',
    'slot',
    p_slot_id::text,
    jsonb_build_object(
      'starts_at', v_slot.starts_at,
      'session_variant_id', v_slot.session_variant_id,
      'status', v_slot.status,
      'booking_records_removed', v_booking_count,
      'checkout_selections_removed', v_selection_count
    )
  );

  return jsonb_build_object(
    'ok', true,
    'booking_records_removed', v_booking_count,
    'checkout_selections_removed', v_selection_count
  );
end;
$$;

revoke all on function public.delete_session(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_session(uuid, text) to service_role;
