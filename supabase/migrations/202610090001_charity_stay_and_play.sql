-- Each of the 15 tickets covers one adult and their children.
create table public.charity_events (
  slug text primary key,
  starts_at timestamptz not null,
  capacity integer check (capacity > 0)
);
create table public.charity_reservations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null references public.charity_events(slug),
  full_name text not null,
  email text not null,
  adults integer not null check (adults = 1),
  children integer not null check (children between 0 and 10),
  created_at timestamptz not null default now(),
  unique (event_slug, email)
);
alter table public.charity_events enable row level security;
alter table public.charity_reservations enable row level security;
insert into public.charity_events (slug, starts_at, capacity) values ('stay-and-play-2026-11-02', '2026-11-02 11:15:00+00', 15);

create function public.reserve_charity_stay_and_play(p_full_name text, p_email text, p_adults integer, p_children integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_event public.charity_events%rowtype; v_count integer; v_existing public.charity_reservations%rowtype;
begin
  select * into v_event from public.charity_events where slug = 'stay-and-play-2026-11-02' for update;
  if not found or v_event.capacity is null or now() >= v_event.starts_at then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if p_full_name is null or p_email is null or p_adults is null or p_children is null or p_adults <> 1 or p_children not between 0 and 10
    or length(trim(p_full_name)) not between 2 and 150 or length(trim(p_email)) not between 3 and 254 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select * into v_existing from public.charity_reservations where event_slug = v_event.slug and email = lower(trim(p_email));
  -- Repeat submissions do not consume additional tickets or modify an existing reservation.
  if found then return jsonb_build_object('ok', true); end if;
  select count(*) into v_count from public.charity_reservations where event_slug = v_event.slug;
  if v_count >= v_event.capacity then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;
  insert into public.charity_reservations (event_slug, full_name, email, adults, children)
    values (v_event.slug, trim(p_full_name), lower(trim(p_email)), p_adults, p_children);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.reserve_charity_stay_and_play(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_charity_stay_and_play(text, text, integer, integer) to service_role;
