create table public.charity_waitlist (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null references public.charity_events(slug),
  full_name text not null,
  email text not null,
  adults integer not null check (adults = 1),
  children integer not null check (children between 0 and 10),
  created_at timestamptz not null default now(),
  unique (event_slug, email)
);
alter table public.charity_waitlist enable row level security;

create function public.submit_charity_stay_and_play(p_full_name text, p_email text, p_adults integer, p_children integer, p_waitlist boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_event public.charity_events%rowtype; v_result jsonb;
begin
  select * into v_event from public.charity_events where slug = 'stay-and-play-2026-11-02' for update;
  if not found or v_event.capacity is null or now() >= v_event.starts_at then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if p_full_name is null or p_email is null or p_adults is null or p_children is null or p_waitlist is null
    or p_adults <> 1 or p_children not between 0 and 10
    or length(trim(p_full_name)) not between 2 and 150 or length(trim(p_email)) not between 3 and 254 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if exists (select 1 from public.charity_reservations where event_slug = v_event.slug and email = lower(trim(p_email))) then
    return jsonb_build_object('ok', true, 'status', 'confirmed');
  end if;
  if p_waitlist then
    insert into public.charity_waitlist (event_slug, full_name, email, adults, children)
      values (v_event.slug, trim(p_full_name), lower(trim(p_email)), p_adults, p_children)
      on conflict (event_slug, email) do nothing;
    return jsonb_build_object('ok', true, 'status', 'waitlisted');
  end if;
  v_result := public.reserve_charity_stay_and_play(p_full_name, p_email, p_adults, p_children);
  if (v_result->>'ok')::boolean then
    delete from public.charity_waitlist where event_slug = v_event.slug and email = lower(trim(p_email));
    return jsonb_build_object('ok', true, 'status', 'confirmed');
  end if;
  return v_result;
end;
$$;
revoke all on function public.submit_charity_stay_and_play(text, text, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.submit_charity_stay_and_play(text, text, integer, integer, boolean) to service_role;
