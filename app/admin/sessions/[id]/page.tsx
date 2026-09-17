import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
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
  const isPersonalTraining = formData.get("programme") === "group-personal-training";
  const rpc = isPersonalTraining ? "add_manual_training_booking" : "add_manual_booking";
  const params = isPersonalTraining ? {
    p_slot_id: slotId,
    p_full_name: String(formData.get("fullName") ?? ""),
    p_email: String(formData.get("email") ?? ""),
    p_phone: String(formData.get("phone") ?? ""),
    p_booking_mode: String(formData.get("bookingMode") ?? ""),
    p_payment_type: String(formData.get("paymentType") ?? "payment_due"),
    p_admin_email: admin.email,
  } : {
    p_slot_id: slotId,
    p_full_name: String(formData.get("fullName") ?? ""),
    p_email: String(formData.get("email") ?? ""),
    p_phone: String(formData.get("phone") ?? ""),
    p_baby_name: String(formData.get("babyName") ?? ""),
    p_baby_age_months: Number(formData.get("babyAgeMonths")),
    p_payment_type: String(formData.get("paymentType") ?? "payment_due"),
    p_admin_email: admin.email,
  };
  const { data, error } = await createSupabaseAdmin().rpc(rpc, params);
  if (error) redirect(`/admin/sessions/${slotId}?error=add`);
  if (!data?.ok) redirect(`/admin/sessions/${slotId}?error=${data?.reason === "capacity_unavailable" ? "full" : "add"}`);
  revalidatePath(`/admin/sessions/${slotId}`);
  redirect(`/admin/sessions/${slotId}?result=added`);
}

async function addExistingCustomerBooking(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (admin.preview) redirect("/admin?preview=1");
  const slotId = String(formData.get("slotId") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  const isPersonalTraining = formData.get("programme") === "group-personal-training";
  const rpc = isPersonalTraining ? "add_existing_customer_training_booking" : "add_existing_customer_booking";
  const params = {
    p_slot_id: slotId,
    p_customer_id: customerId,
    ...(isPersonalTraining ? { p_booking_mode: String(formData.get("bookingMode") ?? "") } : {}),
    p_payment_type: String(formData.get("paymentType") ?? "payment_due"),
    p_admin_email: admin.email,
  };
  const { data, error } = await createSupabaseAdmin().rpc(rpc, params);
  if (error) redirect(`/admin/sessions/${slotId}?error=add`);
  if (!data?.ok) redirect(`/admin/sessions/${slotId}?error=${data?.reason === "capacity_unavailable" ? "full" : "add"}`);
  revalidatePath(`/admin/sessions/${slotId}`);
  redirect(`/admin/sessions/${slotId}?result=added`);
}

async function cancelSession(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const slotId = String(formData.get("slotId") ?? "");
  if (admin.preview) redirect(`/admin/sessions/${slotId}?error=cancel`);
  if (formData.get("confirm") !== "yes") redirect(`/admin/sessions/${slotId}?error=confirm`);

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("slots").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", slotId);
  if (error) redirect(`/admin/sessions/${slotId}?error=cancel`);
  await supabase.from("admin_audit_log").insert({ admin_email: admin.email, action: "session_cancelled", entity_type: "slot", entity_id: slotId });
  revalidatePath("/admin");
  revalidatePath("/book");
  revalidatePath(`/admin/sessions/${slotId}`);
  redirect(`/admin/sessions/${slotId}?result=cancelled`);
}

async function deleteSession(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const slotId = String(formData.get("slotId") ?? "");
  if (admin.preview) redirect(`/admin/sessions/${slotId}?error=delete`);
  if (formData.get("confirmDelete") !== "yes") redirect(`/admin/sessions/${slotId}?error=confirm-delete`);

  const { data, error } = await createSupabaseAdmin().rpc("delete_empty_session", {
    p_slot_id: slotId,
    p_admin_email: admin.email,
  });
  if (error || !data?.ok) {
    const reason = data?.reason === "session_has_history" ? "delete-history" : "delete";
    redirect(`/admin/sessions/${slotId}?error=${reason}`);
  }

  revalidatePath("/admin");
  revalidatePath("/book");
  revalidatePath("/personal-training");
  redirect("/admin?result=session-deleted");
}

export default async function SessionDetailPage({ params, searchParams }: SessionPageProps) {
  const { id } = await params;
  const message = await searchParams;
  const admin = await requireAdmin();

  if (admin.preview) {
    return <SessionView preview slot={{ id, startsAt: "2026-09-21T08:20:00.000Z", variantName: "Early Flow", capacity: 8, bookedCount: 2, status: "scheduled", programmeSlug: "flow-mama-autumn-2026", allowedBookingModes: [], bookingMode: null }} bookings={[
      { id: "preview-1", name: "Preview customer", email: "mama@example.com", phone: "07123 456789", baby: "Mia, 5 months", payment: "Paid · £96.00", bookingSummary: "6 classes booked", bookingMode: null },
      { id: "preview-2", name: "Manual booking", email: "hello@example.com", phone: "07999 123456", baby: "Leo, 3 months", payment: "Cash", bookingSummary: "Manual booking", bookingMode: null },
    ]} otherSlots={[]} existingCustomers={[
      { id: "preview-customer-1", label: "Anna Taylor — Mia — mama@example.com" },
      { id: "preview-customer-2", label: "Sophie Green — Leo — 07999 123456" },
    ]} message={message} />;
  }

  const supabase = createSupabaseAdmin();
  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("id, starts_at, capacity, booked_count, status, session_variant_id, allowed_booking_modes, booking_mode, session_variants(name,programme_id,programmes(slug))")
    .eq("id", id)
    .single();
  if (slotError || !slot) redirect("/admin");

  let { data: bookingRows, error: bookingError } = await supabase
    .from("bookings")
    .select("id, source, manual_payment_type, baby_name, baby_age_months, booking_mode, customer_id, order_id, customers(full_name,email,phone,baby_name,baby_age_months), orders(total_pence,status,quantity)")
    .eq("slot_id", id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });
  if (bookingError?.code === "42703") {
    const fallback = await supabase
      .from("bookings")
      .select("id, source, manual_payment_type, customer_id, order_id, customers(full_name,email,phone,baby_name,baby_age_months), orders(total_pence,status,quantity)")
      .eq("slot_id", id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });
    bookingRows = (fallback.data ?? []).map((row) => ({ ...row, baby_name: null, baby_age_months: null, booking_mode: null })) as typeof bookingRows;
    bookingError = fallback.error;
  }
  if (bookingError) throw new Error(`Unable to load bookings: ${bookingError.message}`);

  const currentVariant = Array.isArray(slot.session_variants) ? slot.session_variants[0] : slot.session_variants;
  const { data: otherRows } = await supabase
    .from("slots")
    .select("id, starts_at, capacity, booked_count, session_variants!inner(name,programme_id)")
    .neq("id", id)
    .eq("status", "scheduled")
    .eq("session_variants.programme_id", currentVariant && "programme_id" in currentVariant ? currentVariant.programme_id : "")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const { data: customerRows, error: customerError } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, baby_name")
    .order("full_name", { ascending: true })
    .limit(500);
  if (customerError) throw new Error(`Unable to load customers: ${customerError.message}`);

  const variant = currentVariant;
  const programme = variant && "programmes" in variant ? (Array.isArray(variant.programmes) ? variant.programmes[0] : variant.programmes) : null;
  const programmeSlug = programme && "slug" in programme ? String(programme.slug) : "flow-mama-autumn-2026";
  const bookings = (bookingRows ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    return {
      id: row.id,
      name: customer && "full_name" in customer ? String(customer.full_name) : "Unknown customer",
      email: customer && "email" in customer && customer.email ? String(customer.email) : "No email",
      phone: customer && "phone" in customer ? String(customer.phone) : "",
      baby: row.baby_name
        ? `${String(row.baby_name)}, ${String(row.baby_age_months)} months`
        : customer && "baby_name" in customer && customer.baby_name ? `${String(customer.baby_name)}, ${String(customer.baby_age_months)} months` : "",
      payment: row.source === "manual"
        ? String(row.manual_payment_type ?? "manual").replaceAll("_", " ")
        : order && "total_pence" in order ? `${String(order.status)} · £${(Number(order.total_pence) / 100).toFixed(2)}` : "Checkout",
      bookingSummary: row.source === "manual"
        ? "Manual booking"
        : order && "quantity" in order ? `${String(order.quantity)} ${programmeSlug === "group-personal-training" ? "sessions" : "classes"} booked` : "Online booking",
      bookingMode: row.booking_mode ? String(row.booking_mode) : null,
    };
  });
  const otherSlots = (otherRows ?? []).filter((row) => row.booked_count < row.capacity).map((row) => {
    const rowVariant = Array.isArray(row.session_variants) ? row.session_variants[0] : row.session_variants;
    return { id: row.id, label: `${rowVariant && "name" in rowVariant ? String(rowVariant.name) : "Flow Mama"} — ${dateFormatter.format(new Date(row.starts_at))}` };
  });

  const existingCustomers = (customerRows ?? []).map((customer) => ({
    id: customer.id,
    label: [
      customer.full_name,
      customer.baby_name || null,
      customer.email || customer.phone || null,
    ].filter(Boolean).join(" — "),
  }));

  return <SessionView preview={false} slot={{ id: slot.id, startsAt: slot.starts_at, variantName: variant && "name" in variant ? String(variant.name) : "Flow Mama", capacity: slot.capacity, bookedCount: slot.booked_count, status: slot.status, programmeSlug, allowedBookingModes: (slot.allowed_booking_modes ?? []) as string[], bookingMode: slot.booking_mode ? String(slot.booking_mode) : null }} bookings={bookings} otherSlots={programmeSlug === "group-personal-training" ? [] : otherSlots} existingCustomers={existingCustomers} message={message} />;
}

type SessionViewProps = {
  preview: boolean;
  slot: { id: string; startsAt: string; variantName: string; capacity: number; bookedCount: number; status: string; programmeSlug: string; allowedBookingModes: string[]; bookingMode: string | null };
  bookings: Array<{ id: string; name: string; email: string; phone: string; baby: string; payment: string; bookingSummary: string; bookingMode: string | null }>;
  otherSlots: Array<{ id: string; label: string }>;
  existingCustomers: Array<{ id: string; label: string }>;
  message: { result?: string; error?: string };
};

function SessionView({ preview, slot, bookings, otherSlots, existingCustomers, message }: SessionViewProps) {
  const isPersonalTraining = slot.programmeSlug === "group-personal-training";
  const bookingModeOptions = slot.bookingMode ? [slot.bookingMode] : slot.allowedBookingModes;
  return (
    <main className="admin-shell">
      <AdminHeader title="Session details" eyebrow="Schedule" />
      <div className="session-page-heading">
        <a href="/admin" className="back-link"><ArrowLeft size={17} /> All sessions</a>
        <p className="booking-eyebrow">Session roster</p>
        <h1>{slot.variantName}</h1>
        <p>{dateFormatter.format(new Date(slot.startsAt))} · {slot.bookedCount}/{slot.capacity} booked{slot.bookingMode ? ` · ${slot.bookingMode === "one_to_one" ? "1:1" : "Group"}` : ""} · <span className={slot.status === "cancelled" ? "admin-status-cancelled" : ""}>{slot.status}</span></p>
      </div>
      {preview && <p className="admin-demo-note">Preview data — actions become available after Supabase is connected.</p>}
      {message.result && <p className="admin-success">Booking {message.result} successfully.</p>}
      {message.error && <p className="form-error">{
        message.error === "full" ? "That class is now full."
          : message.error === "add" ? "The booking could not be added. Please check the details and try again."
          : message.error === "delete-history" ? "This session has booking history and cannot be permanently deleted. Cancel it instead so the customer and payment records remain intact."
          : message.error === "confirm-delete" ? "Confirm that you understand permanent deletion cannot be undone."
          : message.error === "delete" ? "The session could not be deleted. It may already have booking or checkout history."
          : "That change could not be completed. The destination may now be full."
      }</p>}

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">Attendees</p><h2>Current roster</h2></div></div>
        {bookings.length ? <div className="roster-list">{bookings.map((booking) => (
          <article className="roster-card" key={booking.id}>
            <div><h3>{booking.name}</h3><p>{booking.email} · {booking.phone}</p><small>{[booking.baby, booking.bookingMode === "one_to_one" ? "1:1 training" : booking.bookingMode === "group" ? "Group training" : null, booking.bookingSummary].filter(Boolean).join(" · ")}</small></div>
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
        <div className="manual-booking-subsection">
          <h3>Choose an existing customer</h3>
          <p>{isPersonalTraining ? "Reuse the customer’s saved contact details without entering them again." : "Reuse saved contact and baby details without entering them again."}</p>
          {existingCustomers.length ? (
            <form className="manual-booking-form manual-booking-form-existing" action={addExistingCustomerBooking}>
              <input type="hidden" name="slotId" value={slot.id} />
              <input type="hidden" name="programme" value={slot.programmeSlug} />
              <label>Customer<select required name="customerId" disabled={preview}><option value="">Select a customer…</option>{existingCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.label}</option>)}</select></label>
              {isPersonalTraining && <label>Training type<select required name="bookingMode" disabled={preview}>{bookingModeOptions.map((mode) => <option key={mode} value={mode}>{mode === "one_to_one" ? "1:1 training" : "Group training"}</option>)}</select></label>}
              <label>Payment<select name="paymentType" disabled={preview}><option value="payment_due">Payment due</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="complimentary">Complimentary</option></select></label>
              <button className="pay-button" disabled={preview || slot.bookedCount >= slot.capacity || slot.status === "cancelled"}>Add existing customer</button>
            </form>
          ) : <p className="admin-empty">No saved customers yet. Add the first customer below.</p>}
        </div>
        <div className="manual-booking-divider"><span>or add someone new</span></div>
        <form className="manual-booking-form" action={addManualBooking}>
          <input type="hidden" name="slotId" value={slot.id} />
          <input type="hidden" name="programme" value={slot.programmeSlug} />
          <label>Name<input required name="fullName" disabled={preview} /></label>
          <label>Email (optional)<input type="email" name="email" disabled={preview} /></label>
          <label>Phone<input required name="phone" disabled={preview} /></label>
          {!isPersonalTraining && <label>Baby’s name<input required name="babyName" disabled={preview} /></label>}
          {!isPersonalTraining && <label>Baby’s age (months)<input required type="number" min="0" max="60" name="babyAgeMonths" disabled={preview} /></label>}
          {isPersonalTraining && <label>Training type<select required name="bookingMode" disabled={preview}>{bookingModeOptions.map((mode) => <option key={mode} value={mode}>{mode === "one_to_one" ? "1:1 training" : "Group training"}</option>)}</select></label>}
          <label>Payment<select name="paymentType" disabled={preview}><option value="payment_due">Payment due</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="complimentary">Complimentary</option></select></label>
          <button className="pay-button" disabled={preview || slot.bookedCount >= slot.capacity || slot.status === "cancelled"}>Add to session</button>
        </form>
      </section>

      {slot.status !== "cancelled" && <section className="admin-panel admin-danger-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">Session management</p><h2>Cancel this entire session</h2></div><p>This removes the session from public booking. Existing attendees remain listed so you can move or refund them individually.</p></div>
        <form action={cancelSession}><input type="hidden" name="slotId" value={slot.id} /><label><input required type="checkbox" name="confirm" value="yes" /> I understand that refunds are handled separately in Stripe.</label><button className="danger-button" disabled={preview}>Cancel session</button></form>
      </section>}

      <section className="admin-panel admin-danger-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">Permanent deletion</p><h2>Delete this session</h2></div><p>Use this for test or accidental sessions. A session with any booking or checkout history cannot be deleted and must be cancelled instead.</p></div>
        <form action={deleteSession}>
          <input type="hidden" name="slotId" value={slot.id} />
          <label><input required type="checkbox" name="confirmDelete" value="yes" /> I understand this permanently deletes the session and cannot be undone.</label>
          <button className="danger-button" disabled={preview || slot.bookedCount > 0}>Delete session</button>
        </form>
      </section>
    </main>
  );
}
