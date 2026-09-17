-- Allow administrators to permanently delete unused sessions while preserving
-- every session that has ever been referenced by a booking or checkout.

create or replace function public.delete_empty_session(
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
begin
  select * into v_slot
  from public.slots
  where id = p_slot_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'session_not_found');
  end if;

  if exists (select 1 from public.bookings where slot_id = p_slot_id)
    or exists (select 1 from public.order_selections where slot_id = p_slot_id) then
    return jsonb_build_object('ok', false, 'reason', 'session_has_history');
  end if;

  delete from public.slots where id = p_slot_id;

  insert into public.admin_audit_log (
    admin_email,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    lower(p_admin_email),
    'session_deleted',
    'slot',
    p_slot_id::text,
    jsonb_build_object(
      'starts_at', v_slot.starts_at,
      'session_variant_id', v_slot.session_variant_id,
      'status', v_slot.status
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_empty_session(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_empty_session(uuid, text) to service_role;
