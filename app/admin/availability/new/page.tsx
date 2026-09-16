import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { z } from "zod";
import { AdminHeader } from "@/components/admin-header";
import { requireAdmin } from "@/lib/auth/admin";
import { datesForWeekday, londonLocalToIso } from "@/lib/dates";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type NewAvailabilityProps = {
  searchParams: Promise<{ result?: string; count?: string; error?: string }>;
};

const recurrenceSchema = z.object({
  sessionName: z.string().trim().min(2).max(80),
  weekday: z.coerce.number().int().min(0).max(6),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(1).max(100),
  location: z.string().trim().min(2).max(180),
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

  const supabase = createSupabaseAdmin();
  const { data: programme, error: programmeError } = await supabase
    .from("programmes")
    .select("id")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (programmeError || !programme) redirect("/admin/availability/new?error=programme");

  const sessionSlug = slugify(parsed.data.sessionName);
  const { data: variant, error: variantError } = await supabase
    .from("session_variants")
    .upsert({
      programme_id: programme.id,
      slug: sessionSlug,
      name: parsed.data.sessionName,
      default_capacity: parsed.data.capacity,
    }, { onConflict: "programme_id,slug" })
    .select("id")
    .single();
  if (variantError || !variant) redirect("/admin/availability/new?error=session");

  await supabase.from("programmes").update({ location: parsed.data.location, updated_at: new Date().toISOString() }).eq("id", programme.id);

  const slots = dates.map((date) => ({
    session_variant_id: variant.id,
    starts_at: londonLocalToIso(date, parsed.data.startTime),
    ends_at: londonLocalToIso(date, parsed.data.endTime),
    capacity: parsed.data.capacity,
    status: "scheduled",
  }));
  const { error: slotError } = await supabase.from("slots").upsert(slots, {
    onConflict: "session_variant_id,starts_at",
    ignoreDuplicates: true,
  });
  if (slotError) redirect("/admin/availability/new?error=save");

  await supabase.from("admin_audit_log").insert({
    admin_email: admin.email,
    action: "recurring_availability_created",
    entity_type: "session_variant",
    entity_id: variant.id,
    details: { dates, capacity: parsed.data.capacity, start_time: parsed.data.startTime, end_time: parsed.data.endTime },
  });

  revalidatePath("/admin");
  revalidatePath("/book");
  redirect(`/admin/availability/new?result=created&count=${dates.length}`);
}

export default async function NewAvailabilityPage({ searchParams }: NewAvailabilityProps) {
  const admin = await requireAdmin();
  const message = await searchParams;
  const supabase = admin.preview ? null : createSupabaseAdmin();
  const { data: programme } = supabase
    ? await supabase.from("programmes").select("name,location").eq("status", "published").order("created_at", { ascending: false }).limit(1).single()
    : { data: { name: "Flow Mama Autumn 2026", location: "Northfields Community Centre, W13 9SS" } };

  return (
    <main className="admin-shell">
      <AdminHeader title="Publish new dates" eyebrow="Availability" />
      {message.result && <p className="admin-success">Created {message.count} recurring sessions successfully.</p>}
      {message.error && <p className="form-error">We couldn’t create those sessions. Check the dates and times, then try again.</p>}

      <section className="admin-panel admin-form-panel">
        <div className="admin-panel-heading">
          <div><p className="booking-eyebrow">Recurring schedule</p><h2><CalendarPlus size={21} /> Add a series of sessions</h2></div>
          <p>Create one session every week between the chosen dates. Existing matching dates will not be duplicated.</p>
        </div>
        <form className="admin-form-grid" action={createRecurringAvailability}>
          <label>Business<input value="Flow Mama" disabled /></label>
          <label>Programme<input value={programme?.name ?? "Flow Mama"} disabled /></label>
          <label>Session name<input required name="sessionName" placeholder="Early Flow" disabled={admin.preview} /></label>
          <label>Day of week<select name="weekday" defaultValue="1" disabled={admin.preview}><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option></select></label>
          <label>First possible date<input required type="date" name="startDate" disabled={admin.preview} /></label>
          <label>Continue through<input required type="date" name="endDate" disabled={admin.preview} /></label>
          <label>Start time<input required type="time" name="startTime" disabled={admin.preview} /></label>
          <label>End time<input required type="time" name="endTime" disabled={admin.preview} /></label>
          <label>Capacity<input required type="number" name="capacity" min="1" max="100" defaultValue="8" disabled={admin.preview} /></label>
          <label className="admin-form-wide">Location<input required name="location" defaultValue={programme?.location ?? "Northfields Community Centre, W13 9SS"} disabled={admin.preview} /></label>
          <div className="admin-form-note admin-form-wide"><strong>Pricing stays in Stripe.</strong><span>The £22 / £16 / £14 tiers remain attached to the existing Flow Mama product, so publishing dates here does not change what customers pay.</span></div>
          <button className="pay-button admin-form-wide" disabled={admin.preview}>Create recurring sessions</button>
        </form>
      </section>
    </main>
  );
}
