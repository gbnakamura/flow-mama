import { redirect } from "next/navigation";
import { CalendarDays, CreditCard, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { loadAdminDashboard, type AdminOrder, type AdminSlot } from "@/lib/data/admin-dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const demoSlots: AdminSlot[] = [
  { id: "demo-1", startsAt: "2026-09-21T08:20:00.000Z", variantName: "Early Flow", capacity: 8, bookedCount: 5, status: "scheduled" },
  { id: "demo-2", startsAt: "2026-09-21T10:00:00.000Z", variantName: "Late Flow", capacity: 8, bookedCount: 8, status: "scheduled" },
  { id: "demo-3", startsAt: "2026-09-28T08:20:00.000Z", variantName: "Early Flow", capacity: 8, bookedCount: 2, status: "scheduled" },
];

const demoOrders: AdminOrder[] = [
  { id: "demo-order-1", createdAt: new Date().toISOString(), customerName: "Preview booking", email: "mama@example.com", quantity: 6, totalPence: 9600, status: "paid" },
];

const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function AdminPage() {
  const admin = await requireAdmin();
  const configured = !admin.preview;

  const { slots, orders } = configured ? await loadAdminDashboard() : { slots: demoSlots, orders: demoOrders };
  const upcoming = slots.filter((slot) => slot.status === "scheduled");
  const booked = upcoming.reduce((sum, slot) => sum + slot.bookedCount, 0);
  const revenue = orders.filter((order) => ["paid", "partially_refunded"].includes(order.status)).reduce((sum, order) => sum + order.totalPence, 0);

  async function signOut() {
    "use server";
    if (configured) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    }
    redirect("/admin/login");
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <img src="/images/logo.svg" alt="Flow Mama" />
        <div><p>Admin</p><h1>Bookings at a glance</h1></div>
        <form action={signOut}><button type="submit">Sign out</button></form>
      </header>
      {!configured && <p className="admin-demo-note">Preview data — connect Supabase to enable live bookings and secure sign-in.</p>}

      <section className="admin-stats" aria-label="Booking summary">
        <article><CalendarDays /><span>Upcoming classes</span><strong>{upcoming.length}</strong></article>
        <article><Users /><span>Places booked</span><strong>{booked}</strong></article>
        <article><CreditCard /><span>Paid revenue</span><strong>£{(revenue / 100).toFixed(2)}</strong></article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">Schedule</p><h2>Upcoming classes</h2></div></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Session</th><th>Booked</th><th>Spaces</th><th>Status</th></tr></thead><tbody>
          {upcoming.map((slot) => <tr key={slot.id}><td><a className="admin-row-link" href={`/admin/sessions/${slot.id}`}>{dateFormatter.format(new Date(slot.startsAt))}</a></td><td>{slot.variantName}</td><td>{slot.bookedCount} / {slot.capacity}</td><td>{Math.max(0, slot.capacity - slot.bookedCount)}</td><td><span className={slot.bookedCount >= slot.capacity ? "admin-badge sold" : "admin-badge"}>{slot.bookedCount >= slot.capacity ? "Full" : "Open"}</span></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">History</p><h2>Recent orders</h2></div></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Customer</th><th>Booked</th><th>Classes</th><th>Total</th><th>Status</th></tr></thead><tbody>
          {orders.map((order) => <tr key={order.id}><td><strong>{order.customerName}</strong><small>{order.email}</small></td><td>{dateFormatter.format(new Date(order.createdAt))}</td><td>{order.quantity}</td><td>£{(order.totalPence / 100).toFixed(2)}</td><td><span className="admin-badge">{order.status.replaceAll("_", " ")}</span></td></tr>)}
        </tbody></table></div>
      </section>
    </main>
  );
}
