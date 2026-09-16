import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type SessionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string; error?: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

async function removeBooking(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (admin.preview) redirect("/admin?preview=1");
  const bookingId = String(formData.get("bookingId") ?? "");
  const slotId = String(formData.get("slotId") ?? "");
  const { data, error } = await createSupabaseAdmin().rpc("remove_booking", { p_booking_id: bookingId, p_admin_email: admin.email });
  if (error || !data?.ok) redirect(`/admin/sessions/${slotId}?error=remove`);
  revalidatePath(`/admin/sessions/${slotId}`);
  redirect(`/admin/sessions/${slotId}?result=removed`);
}

async function moveBooking(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (admin.preview) redirect("/admin?preview=1");
  const bookingId = String(formData.get("bookingId") ?? "");
  const slotId = String(formData.get("slotId") ?? "");
  const targetSlotId = String(formData.get("targetSlotId") ?? "");
  const { data, error } = await createSupabaseAdmin().rpc("move_booking", { p_booking_id: bookingId, p_new_slot_id: targetSlotId, p_admin_email: admin.email });
  if (error || !data?.ok) redirect(`/admin/sessions/${slotId}?error=move`);
  revalidatePath(`/admin/sessions/${slotId}`);
  redirect(`/admin/sessions/${slotId}?result=moved`);
}

async function addManualBooking(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (admin.preview) redirect("/admin?preview=1");
  const slotId = String(formData.get("slotId") ?? "");
  const { data, error } = await createSupabaseAdmin().rpc("add_manual_booking", {
    p_slot_id: slotId,
    p_full_name: String(formData.get("fullName") ?? ""),
    p_email: String(formData.get("email") ?? ""),
    p_phone: String(formData.get("phone") ?? ""),
    p_baby_name: String(formData.get("babyName") ?? ""),
    p_baby_age_months: Number(formData.get("babyAgeMonths")),
    p_payment_type: String(formData.get("paymentType") ?? "payment_due"),
    p_admin_email: admin.email,
  });
  if (error || !data?.ok) redirect(`/admin/sessions/${slotId}?error=add`);
  revalidatePath(`/admin/sessions/${slotId}`);
  redirect(`/admin/sessions/${slotId}?result=added`);
}

export default async function SessionDetailPage({ params, searchParams }: SessionPageProps) {
  const { id } = await params;
  const message = await searchParams;
  const admin = await requireAdmin();

  if (admin.preview) {
    return <SessionView preview slot={{ id, startsAt: "2026-09-21T08:20:00.000Z", variantName: "Early Flow", capacity: 8, bookedCount: 2 }} bookings={[
      { id: "preview-1", name: "Preview customer", email: "mama@example.com", phone: "07123 456789", baby: "Mia, 5 months", payment: "Paid · £96.00" },
      { id: "preview-2", name: "Manual booking", email: "hello@example.com", phone: "07999 123456", baby: "Leo, 3 months", payment: "Cash" },
    ]} otherSlots={[]} message={message} />;
  }

  const supabase = createSupabaseAdmin();
  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("id, starts_at, capacity, booked_count, session_variant_id, session_variants(name)")
    .eq("id", id)
    .single();
  if (slotError || !slot) redirect("/admin");

  const [{ data: bookingRows }, { data: otherRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, source, manual_payment_type, customer_id, order_id, customers(full_name,email,phone,baby_name,baby_age_months), orders(total_pence,status)")
      .eq("slot_id", id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true }),
    supabase
      .from("slots")
      .select("id, starts_at, capacity, booked_count, session_variants(name)")
      .neq("id", id)
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
  ]);

  const variant = Array.isArray(slot.session_variants) ? slot.session_variants[0] : slot.session_variants;
  const bookings = (bookingRows ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    return {
      id: row.id,
      name: customer && "full_name" in customer ? String(customer.full_name) : "Unknown customer",
      email: customer && "email" in customer ? String(customer.email) : "",
      phone: customer && "phone" in customer ? String(customer.phone) : "",
      baby: customer && "baby_name" in customer ? `${String(customer.baby_name)}, ${String(customer.baby_age_months)} months` : "",
      payment: row.source === "manual"
        ? String(row.manual_payment_type ?? "manual").replaceAll("_", " ")
        : order && "total_pence" in order ? `${String(order.status)} · £${(Number(order.total_pence) / 100).toFixed(2)}` : "Checkout",
    };
  });
  const otherSlots = (otherRows ?? []).filter((row) => row.booked_count < row.capacity).map((row) => {
    const rowVariant = Array.isArray(row.session_variants) ? row.session_variants[0] : row.session_variants;
    return { id: row.id, label: `${rowVariant && "name" in rowVariant ? String(rowVariant.name) : "Flow Mama"} — ${dateFormatter.format(new Date(row.starts_at))}` };
  });

  return <SessionView preview={false} slot={{ id: slot.id, startsAt: slot.starts_at, variantName: variant && "name" in variant ? String(variant.name) : "Flow Mama", capacity: slot.capacity, bookedCount: slot.booked_count }} bookings={bookings} otherSlots={otherSlots} message={message} />;
}

type SessionViewProps = {
  preview: boolean;
  slot: { id: string; startsAt: string; variantName: string; capacity: number; bookedCount: number };
  bookings: Array<{ id: string; name: string; email: string; phone: string; baby: string; payment: string }>;
  otherSlots: Array<{ id: string; label: string }>;
  message: { result?: string; error?: string };
};

function SessionView({ preview, slot, bookings, otherSlots, message }: SessionViewProps) {
  return (
    <main className="admin-shell">
      <div className="session-page-heading">
        <a href="/admin" className="back-link"><ArrowLeft size={17} /> Dashboard</a>
        <p className="booking-eyebrow">Session roster</p>
        <h1>{slot.variantName}</h1>
        <p>{dateFormatter.format(new Date(slot.startsAt))} · {slot.bookedCount}/{slot.capacity} booked</p>
      </div>
      {preview && <p className="admin-demo-note">Preview data — actions become available after Supabase is connected.</p>}
      {message.result && <p className="admin-success">Booking {message.result} successfully.</p>}
      {message.error && <p className="form-error">That change could not be completed. The destination may now be full.</p>}

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">Attendees</p><h2>Current roster</h2></div></div>
        {bookings.length ? <div className="roster-list">{bookings.map((booking) => (
          <article className="roster-card" key={booking.id}>
            <div><h3>{booking.name}</h3><p>{booking.email} · {booking.phone}</p><small>{booking.baby}</small></div>
            <span className="admin-badge">{booking.payment}</span>
            <div className="roster-actions">
              <form action={moveBooking}><input type="hidden" name="bookingId" value={booking.id} /><input type="hidden" name="slotId" value={slot.id} /><select name="targetSlotId" required disabled={preview || !otherSlots.length}><option value="">Move to…</option>{otherSlots.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select><button disabled={preview || !otherSlots.length}>Move</button></form>
              <form action={removeBooking}><input type="hidden" name="bookingId" value={booking.id} /><input type="hidden" name="slotId" value={slot.id} /><button className="danger-button" disabled={preview}>Remove</button></form>
            </div>
          </article>
        ))}</div> : <p className="admin-empty">No one is booked into this session yet.</p>}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">Manual exception</p><h2><UserPlus size={20} /> Add a booking</h2></div></div>
        <form className="manual-booking-form" action={addManualBooking}>
          <input type="hidden" name="slotId" value={slot.id} />
          <label>Name<input required name="fullName" disabled={preview} /></label>
          <label>Email<input required type="email" name="email" disabled={preview} /></label>
          <label>Phone<input required name="phone" disabled={preview} /></label>
          <label>Baby’s name<input required name="babyName" disabled={preview} /></label>
          <label>Baby’s age (months)<input required type="number" min="0" max="60" name="babyAgeMonths" disabled={preview} /></label>
          <label>Payment<select name="paymentType" disabled={preview}><option value="payment_due">Payment due</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="complimentary">Complimentary</option></select></label>
          <button className="pay-button" disabled={preview || slot.bookedCount >= slot.capacity}>Add to session</button>
        </form>
      </section>
    </main>
  );
}
