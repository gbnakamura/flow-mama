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
    and (s.booking_mode = 'one_to_one' and s.booked_count > 0) is not true
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
