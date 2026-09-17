import { CalendarDays, CreditCard, Users } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { AdminProgrammeFilter } from "@/components/admin-programme-filter";
import { adminFilterLabel, adminProgrammeLabel, parseAdminProgrammeFilter, programmeMatchesFilter } from "@/lib/admin/programme-filter";
import { requireAdmin } from "@/lib/auth/admin";
import { loadAdminDashboard, type AdminOrder, type AdminSlot } from "@/lib/data/admin-dashboard";

export const dynamic = "force-dynamic";

const demoSlots: AdminSlot[] = [
  { id: "demo-1", startsAt: "2026-09-21T08:20:00.000Z", variantName: "Early Flow", capacity: 8, bookedCount: 5, status: "scheduled", bookingMode: null, allowedBookingModes: [], programmeSlug: "flow-mama-autumn-2026" },
  { id: "demo-2", startsAt: "2026-09-21T10:00:00.000Z", variantName: "Late Flow", capacity: 8, bookedCount: 8, status: "scheduled", bookingMode: null, allowedBookingModes: [], programmeSlug: "flow-mama-autumn-2026" },
  { id: "demo-3", startsAt: "2026-09-25T08:00:00.000Z", variantName: "Personal Training", capacity: 3, bookedCount: 2, status: "scheduled", bookingMode: "group", allowedBookingModes: ["group", "one_to_one"], programmeSlug: "group-personal-training" },
];

const demoOrders: AdminOrder[] = [
  { id: "demo-order-1", createdAt: new Date().toISOString(), customerName: "Preview booking", email: "mama@example.com", quantity: 6, totalPence: 9600, refundedPence: 0, status: "paid", programmeSlug: "flow-mama-autumn-2026" },
  { id: "demo-order-2", createdAt: new Date().toISOString(), customerName: "PT preview", email: "training@example.com", quantity: 1, totalPence: 3000, refundedPence: 0, status: "paid", programmeSlug: "group-personal-training" },
];

const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

type AdminPageProps = {
  searchParams: Promise<{ programme?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const admin = await requireAdmin();
  const configured = !admin.preview;
  const { programme: programmeParam } = await searchParams;
  const programme = parseAdminProgrammeFilter(programmeParam);

  const { slots, orders } = configured ? await loadAdminDashboard() : { slots: demoSlots, orders: demoOrders };
  const filteredSlots = slots.filter((slot) => programmeMatchesFilter(slot.programmeSlug, programme));
  const filteredOrders = orders.filter((order) => programmeMatchesFilter(order.programmeSlug, programme));
  const upcoming = filteredSlots.filter((slot) => new Date(slot.startsAt) > new Date());
  const scheduled = upcoming.filter((slot) => slot.status === "scheduled");
  const booked = scheduled.reduce((sum, slot) => sum + slot.bookedCount, 0);
  const revenue = filteredOrders.filter((order) => ["paid", "partially_refunded"].includes(order.status)).reduce((sum, order) => sum + order.totalPence - order.refundedPence, 0);
  const filterLabel = adminFilterLabel(programme);

  return (
    <main className="admin-shell">
      <AdminHeader title="Bookings at a glance" programme={programme} />
      {!configured && <p className="admin-demo-note">Preview data — connect Supabase to enable live bookings and secure sign-in.</p>}
      <div className="admin-programme-filter-bar"><AdminProgrammeFilter basePath="/admin" value={programme} /></div>

      <section className="admin-stats" aria-label="Booking summary">
        <article><CalendarDays /><span>Upcoming sessions · {filterLabel}</span><strong>{scheduled.length}</strong></article>
        <article><Users /><span>Places booked · {filterLabel}</span><strong>{booked}</strong></article>
        <article><CreditCard /><span>Paid revenue · {filterLabel}</span><strong>£{(revenue / 100).toFixed(2)}</strong></article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">Schedule</p><h2>Upcoming sessions</h2></div></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Session</th><th>Booked</th><th>Spaces</th><th>Status</th></tr></thead><tbody>
          {upcoming.map((slot) => <tr key={slot.id}><td><a className="admin-row-link" href={`/admin/sessions/${slot.id}`}>{dateFormatter.format(new Date(slot.startsAt))}</a></td><td>{slot.variantName}<small>{adminProgrammeLabel(slot.programmeSlug)}{slot.allowedBookingModes.length > 0 ? ` · ${slot.bookingMode === "one_to_one" ? "Locked to 1:1" : slot.bookingMode === "group" ? "Locked to group" : slot.allowedBookingModes.length === 2 ? "Group + 1:1" : slot.allowedBookingModes[0] === "one_to_one" ? "1:1 only" : "Group only"}` : ""}</small></td><td>{slot.bookedCount} / {slot.bookingMode === "one_to_one" ? 1 : slot.capacity}</td><td>{slot.bookingMode === "one_to_one" ? 0 : Math.max(0, slot.capacity - slot.bookedCount)}</td><td><span className={slot.status === "cancelled" || slot.bookedCount >= slot.capacity || slot.bookingMode === "one_to_one" ? "admin-badge sold" : "admin-badge"}>{slot.status === "cancelled" ? "Cancelled" : slot.bookingMode === "one_to_one" ? "1:1 booked" : slot.bookedCount >= slot.capacity ? "Full" : slot.bookingMode === "group" ? "Group open" : "Open"}</span></td></tr>)}
          {!upcoming.length && <tr><td colSpan={5}>No upcoming sessions match this filter.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="booking-eyebrow">History</p><h2>Recent orders</h2></div></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Customer</th><th>Booked</th><th>Classes</th><th>Total</th><th>Status</th></tr></thead><tbody>
          {filteredOrders.map((order) => <tr key={order.id}><td><strong>{order.customerName}</strong><small>{order.email}</small></td><td>{dateFormatter.format(new Date(order.createdAt))}</td><td>{order.quantity}<small>{adminProgrammeLabel(order.programmeSlug)}</small></td><td>£{(order.totalPence / 100).toFixed(2)}</td><td><span className="admin-badge">{order.status.replaceAll("_", " ")}</span></td></tr>)}
          {!filteredOrders.length && <tr><td colSpan={5}>No recent orders match this filter.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}
