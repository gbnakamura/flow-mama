import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CalendarPlus, CalendarDays } from "lucide-react";
import { z } from "zod";
import { AdminHeader } from "@/components/admin-header";
import { requireAdmin } from "@/lib/auth/admin";
import { datesForWeekday, londonLocalToIso } from "@/lib/dates";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type NewAvailabilityProps = {
  searchParams: Promise<{ result?: string; count?: string; type?: string; error?: string }>;
};

const availabilityFields = {
  programmeId: z.uuid(),
  sessionName: z.string().trim().min(2).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(1).max(100),
  location: z.string().trim().min(2).max(180),
  bookingAvailability: z.enum(["both", "group", "one_to_one"]),
};

const availabilitySchema = z.object(availabilityFields);

const recurrenceSchema = availabilitySchema.extend({
  weekday: z.coerce.number().int().min(0).max(6),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

const oneOffSchema = availabilitySchema.extend({
  date: z.iso.date(),
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type AvailabilityInput = z.infer<typeof availabilitySchema>;

async function saveAvailability(
  admin: Awaited<ReturnType<typeof requireAdmin>>,
  input: AvailabilityInput,
  dates: string[],
  auditAction: "one_off_availability_created" | "recurring_availability_created",
) {
  const supabase = createSupabaseAdmin();
  const { data: programme, error: programmeError } = await supabase
    .from("programmes")
    .select("id,slug")
    .eq("id", input.programmeId)
    .eq("status", "published")
    .single();
  if (programmeError || !programme) redirect("/admin/availability/new?error=programme");

  const sessionSlug = slugify(input.sessionName);
  const isPersonalTraining = programme.slug === "group-personal-training";
  const capacity = isPersonalTraining ? 3 : input.capacity;
  const { data: variant, error: variantError } = await supabase
    .from("session_variants")
    .upsert({
      programme_id: programme.id,
      slug: sessionSlug,
      name: input.sessionName,
      default_capacity: capacity,
    }, { onConflict: "programme_id,slug" })
    .select("id")
    .single();
  if (variantError || !variant) redirect("/admin/availability/new?error=session");

  await supabase.from("programmes").update({ location: input.location, updated_at: new Date().toISOString() }).eq("id", programme.id);

  const allowedBookingModes = input.bookingAvailability === "both"
    ? ["group", "one_to_one"]
    : [input.bookingAvailability];
  const slots = dates.map((date) => ({
    session_variant_id: variant.id,
    starts_at: londonLocalToIso(date, input.startTime),
    ends_at: londonLocalToIso(date, input.endTime),
    capacity,
    status: "scheduled",
    allowed_booking_modes: isPersonalTraining ? allowedBookingModes : null,
  }));
  const { error: slotError } = await supabase.from("slots").upsert(slots, {
    onConflict: "session_variant_id,starts_at",
    ignoreDuplicates: true,
  });
  if (slotError) redirect("/admin/availability/new?error=save");

  await supabase.from("admin_audit_log").insert({
    admin_email: admin.email,
    action: auditAction,
    entity_type: "session_variant",
    entity_id: variant.id,
    details: { dates, capacity, start_time: input.startTime, end_time: input.endTime, allowed_booking_modes: isPersonalTraining ? allowedBookingModes : null },
  });

  revalidatePath("/admin");
  revalidatePath("/book");
  revalidatePath("/personal-training");
}

async function createOneOffAvailability(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (admin.preview) redirect("/admin/availability/new?error=preview");

  const parsed = oneOffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.endTime <= parsed.data.startTime) {
    redirect("/admin/availability/new?error=details");
  }

  await saveAvailability(admin, parsed.data, [parsed.data.date], "one_off_availability_created");
  redirect("/admin/availability/new?result=created&type=one-off&count=1");
}

async function createRecurringAvailability(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (admin.preview) redirect("/admin/availability/new?error=preview");

  const parsed = recurrenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.endDate < parsed.data.startDate || parsed.data.endTime <= parsed.data.startTime) {
    redirect("/admin/availability/new?error=details");
  }

  const dates = datesForWeekday(parsed.data.startDate, parsed.data.endDate, parsed.data.weekday);
  if (!dates.length) redirect("/admin/availability/new?error=dates");

  await saveAvailability(admin, parsed.data, dates, "recurring_availability_created");
  redirect(`/admin/availability/new?result=created&type=recurring&count=${dates.length}`);
}

export default async function NewAvailabilityPage({ searchParams }: NewAvailabilityProps) {
  const admin = await requireAdmin();
  const message = await searchParams;
  const supabase = admin.preview ? null : createSupabaseAdmin();
  const { data: programmeRows } = supabase
    ? await supabase.from("programmes").select("id,name,slug,location").eq("status", "published").order("created_at", { ascending: true })
    : { data: [{ id: "00000000-0000-4000-8000-000000000010", name: "Flow Mama Autumn 2026", slug: "flow-mama-autumn-2026", location: "Northfields Community Centre, W13 9SS" }, { id: "00000000-0000-4000-8000-000000000011", name: "Personal Training", slug: "group-personal-training", location: "Northfields" }] };
  const programmes = programmeRows ?? [];
  const defaultProgramme = programmes.find((programme) => programme.slug === "group-personal-training") ?? programmes[0];

  return (
    <main className="admin-shell">
      <AdminHeader title="Publish new dates" eyebrow="Availability" active="availability" />
      {message.result && <p className="admin-success">{message.type === "one-off" ? "Created the one-off session successfully." : `Created ${message.count} recurring sessions successfully.`}</p>}
      {message.error && <p className="form-error">We couldn’t create those sessions. Check the dates and times, then try again.</p>}

      <section className="admin-panel admin-form-panel">
        <div className="admin-panel-heading">
          <div><p className="booking-eyebrow">One-off session</p><h2><CalendarDays size={21} /> Add a single session</h2></div>
          <p>Publish one specific date without creating a weekly series.</p>
        </div>
        <form className="admin-form-grid" action={createOneOffAvailability}>
          <label>Business<input value="Flow Mama" disabled /></label>
          <label>Programme<select required name="programmeId" defaultValue={defaultProgramme?.id} disabled={admin.preview}>{programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}</select></label>
          <label>Session name<input required name="sessionName" defaultValue="Personal Training" placeholder="Early Flow" disabled={admin.preview} /></label>
          <label>Date<input required type="date" name="date" disabled={admin.preview} /></label>
          <label>Start time<input required type="time" name="startTime" disabled={admin.preview} /></label>
          <label>End time<input required type="time" name="endTime" disabled={admin.preview} /></label>
          <label>Capacity (Personal Training is fixed at 3)<input required type="number" name="capacity" min="1" max="100" defaultValue="3" disabled={admin.preview} /></label>
          <label>Personal training availability<select required name="bookingAvailability" defaultValue="both" disabled={admin.preview}><option value="both">Group + 1:1</option><option value="group">Group only</option><option value="one_to_one">1:1 only</option></select></label>
          <label className="admin-form-wide">Location<input required name="location" defaultValue={defaultProgramme?.location ?? "Northfields Community Centre, W13 9SS"} disabled={admin.preview} /></label>
          <div className="admin-form-note admin-form-wide"><strong>Personal training availability</strong><span>For Personal Training dates, capacity is always three. A “Group + 1:1” time locks to whichever type is paid for first. The availability choice is ignored for other Flow Mama programmes.</span></div>
          <button className="pay-button admin-form-wide" disabled={admin.preview}>Create one-off session</button>
        </form>
      </section>

      <section className="admin-panel admin-form-panel">
        <div className="admin-panel-heading">
          <div><p className="booking-eyebrow">Recurring schedule</p><h2><CalendarPlus size={21} /> Add a series of sessions</h2></div>
          <p>Create one session every week between the chosen dates. Existing matching dates will not be duplicated.</p>
        </div>
        <form className="admin-form-grid" action={createRecurringAvailability}>
          <label>Business<input value="Flow Mama" disabled /></label>
          <label>Programme<select required name="programmeId" defaultValue={defaultProgramme?.id} disabled={admin.preview}>{programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}</select></label>
          <label>Session name<input required name="sessionName" defaultValue="Personal Training" placeholder="Early Flow" disabled={admin.preview} /></label>
          <label>Day of week<select name="weekday" defaultValue="1" disabled={admin.preview}><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option></select></label>
          <label>First possible date<input required type="date" name="startDate" disabled={admin.preview} /></label>
          <label>Continue through<input required type="date" name="endDate" disabled={admin.preview} /></label>
          <label>Start time<input required type="time" name="startTime" disabled={admin.preview} /></label>
          <label>End time<input required type="time" name="endTime" disabled={admin.preview} /></label>
          <label>Capacity (Personal Training is fixed at 3)<input required type="number" name="capacity" min="1" max="100" defaultValue="3" disabled={admin.preview} /></label>
          <label>Personal training availability<select required name="bookingAvailability" defaultValue="both" disabled={admin.preview}><option value="both">Group + 1:1</option><option value="group">Group only</option><option value="one_to_one">1:1 only</option></select></label>
          <label className="admin-form-wide">Location<input required name="location" defaultValue={defaultProgramme?.location ?? "Northfields Community Centre, W13 9SS"} disabled={admin.preview} /></label>
          <div className="admin-form-note admin-form-wide"><strong>Personal training availability</strong><span>For Personal Training dates, capacity is always three. A “Group + 1:1” time locks to whichever type is paid for first. The availability choice is ignored for other Flow Mama programmes.</span></div>
          <button className="pay-button admin-form-wide" disabled={admin.preview}>Create recurring sessions</button>
        </form>
      </section>
    </main>
  );
}
