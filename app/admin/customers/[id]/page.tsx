import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type CustomerPageProps = { params: Promise<{ id: string }> };

type OrderRow = { id: string; created_at: string; quantity: number; total_pence: number | null; refunded_pence: number; status: string };
type BookingRow = {
  id: string;
  status: string;
  source: string;
  baby_name: string | null;
  baby_age_months: number | null;
  slots: { starts_at: string; session_variants: { name: string } | Array<{ name: string }> | null } | Array<{ starts_at: string; session_variants: { name: string } | Array<{ name: string }> | null }> | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" });

export default async function CustomerPage({ params }: CustomerPageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  if (admin.preview) {
    return <CustomerView customer={{ full_name: "Preview customer", email: "mama@example.com", phone: "07123 456789", baby_name: "Mia", baby_age_months: 5 }} orders={[]} bookings={[]} />;
  }

  const supabase = createSupabaseAdmin();
  const [{ data: customer }, { data: orderRows }] = await Promise.all([
    supabase.from("customers").select("full_name,email,phone,baby_name,baby_age_months").eq("id", id).single(),
    supabase.from("orders").select("id,created_at,quantity,total_pence,refunded_pence,status").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (!customer) redirect("/admin/customers");

  let { data: bookingRows, error: bookingError } = await supabase.from("bookings").select("id,status,source,baby_name,baby_age_months,slots(starts_at,session_variants(name))").eq("customer_id", id).order("created_at", { ascending: false });
  if (bookingError?.code === "42703") {
    const fallback = await supabase.from("bookings").select("id,status,source,slots(starts_at,session_variants(name))").eq("customer_id", id).order("created_at", { ascending: false });
    bookingRows = (fallback.data ?? []).map((row) => ({ ...row, baby_name: null, baby_age_months: null })) as typeof bookingRows;
    bookingError = fallback.error;
  }
  if (bookingError) throw new Error(`Unable to load customer bookings: ${bookingError.message}`);

  return <CustomerView customer={customer} orders={(orderRows ?? []) as OrderRow[]} bookings={(bookingRows ?? []) as BookingRow[]} />;
}

function CustomerView({ customer, orders, bookings }: {
  customer: { full_name: string; email: string | null; phone: string; baby_name: string; baby_age_months: number };
  orders: OrderRow[];
  bookings: BookingRow[];
}) {
  const now = new Date();
  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  const upcoming = confirmed.filter((booking) => {
    const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
    return slot && new Date(slot.starts_at) >= now;
  });
  const past = confirmed.filter((booking) => {
    const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
    return slot && new Date(slot.starts_at) < now;
  });
  const totalSpent = orders.filter((order) => ["paid", "partially_refunded", "refunded"].includes(order.status)).reduce((sum, order) => sum + (order.total_pence ?? 0) - order.refunded_pence, 0);
  const babies = Array.from(new Map(bookings.filter((booking) => booking.baby_name).map((booking) => [booking.baby_name!.toLowerCase(), `${booking.baby_name}, ${booking.baby_age_months} months`])).values());

  const bookingRows = (rows: BookingRow[]) => rows.length ? rows.map((booking) => {
    const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
    const variant = slot && (Array.isArray(slot.session_variants) ? slot.session_variants[0] : slot.session_variants);
    return <tr key={booking.id}><td>{slot ? dateTimeFormatter.format(new Date(slot.starts_at)) : "Unknown date"}</td><td>{variant?.name ?? "Flow Mama"}</td><td><span className="admin-badge">{booking.source}</span></td></tr>;
  }) : <tr><td colSpan={3}>No sessions to show.</td></tr>;

  return (
    <main className="admin-shell">
      <AdminHeader title={customer.full_name} eyebrow="Customer profile" active="customers" />
      <section className="admin-stats admin-stats-four">
        <article><span>Total spent</span><strong>£{(totalSpent / 100).toFixed(2)}</strong></article>
        <article><span>Classes booked</span><strong>{confirmed.length}</strong></article>
        <article><span>Upcoming</span><strong>{upcoming.length}</strong></article>
        <article><span>Past classes</span><strong>{past.length}</strong></article>
      </section>
      <section className="admin-detail-grid">
        <article className="admin-panel admin-contact-card"><div className="admin-panel-heading"><p className="booking-eyebrow">Contact</p><h2>{customer.email ?? "No email address"}</h2></div><dl><div><dt>Phone</dt><dd>{customer.phone}</dd></div><div><dt>{babies.length > 1 ? "Babies" : "Baby"}</dt><dd>{babies.length ? babies.join(" · ") : `${customer.baby_name}, ${customer.baby_age_months} months`}</dd></div></dl></article>
        <section className="admin-panel"><div className="admin-panel-heading"><p className="booking-eyebrow">Next up</p><h2>Upcoming bookings</h2></div><div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Session</th><th>Source</th></tr></thead><tbody>{bookingRows(upcoming)}</tbody></table></div></section>
      </section>
      <section className="admin-panel"><div className="admin-panel-heading"><p className="booking-eyebrow">History</p><h2>Past bookings</h2></div><div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Session</th><th>Source</th></tr></thead><tbody>{bookingRows(past)}</tbody></table></div></section>
      <section className="admin-panel"><div className="admin-panel-heading"><p className="booking-eyebrow">Payments</p><h2>Payment history</h2></div><div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        {orders.map((order) => <tr key={order.id}><td>{dateFormatter.format(new Date(order.created_at))}</td><td>{order.quantity} Flow Mama classes</td><td>£{(((order.total_pence ?? 0) - order.refunded_pence) / 100).toFixed(2)}</td><td><span className="admin-badge">{order.status.replaceAll("_", " ")}</span></td></tr>)}
        {!orders.length && <tr><td colSpan={4}>No online payments yet.</td></tr>}
      </tbody></table></div></section>
    </main>
  );
}
