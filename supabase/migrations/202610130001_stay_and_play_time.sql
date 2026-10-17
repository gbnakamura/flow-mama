-- Move Stay & Play to 10:45am; reservations close when the event begins.
update public.charity_events
set starts_at = '2026-11-02 10:45:00+00'
where slug = 'stay-and-play-2026-11-02';
