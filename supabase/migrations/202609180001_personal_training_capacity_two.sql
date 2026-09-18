-- Personal Training group sessions now have a maximum capacity of two.
-- Grandfather any already-over-capacity session at its current booking count so
-- existing customer records remain valid while preventing further bookings.

update public.session_variants v
set default_capacity = 2
from public.programmes p
where v.programme_id = p.id
  and p.slug = 'group-personal-training';

update public.slots s
set
  capacity = greatest(s.booked_count, 2),
  updated_at = now()
from public.session_variants v
join public.programmes p on p.id = v.programme_id
where s.session_variant_id = v.id
  and p.slug = 'group-personal-training';
