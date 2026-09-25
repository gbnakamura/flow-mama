import { Banknote, CalendarCheck2, ReceiptText } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { AdminProgrammeFilter } from "@/components/admin-programme-filter";
import { adminProgrammeLabel, parseAdminProgrammeFilter, programmeMatchesFilter } from "@/lib/admin/programme-filter";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type BookingsPageProps = {
  searchParams: Promise<{ programme?: string }>;
};

type BookingRow = {
  id: string;
  created_at: string;
  order_id: string | null;
  customer_id: string;
  slot_id: string;
  source: string;
  manual_payment_type: string | null;
  status: string;
  baby_name: string | null;
  baby_age_months: number | null;
  booking_mode: string | null;
  customers: {
    full_name: string;
    email: string | null;
    phone: string;
  } | Array<{
    full_name: string;
    email: string | null;
    phone: string;
  }> | null;
  orders: {
    status: string;
    unit_price_pence: number | null;
    total_pence: number | null;
    refunded_pence: number;
    quantity: number;
  } | Array<{
    status: string;
    unit_price_pence: number | null;
    total_pence: number | null;
    refunded_pence: number;
    quantity: number;
  }> | null;
  slots: {
    starts_at: string;
    session_variants: {
      name: string;
      programmes: { slug: string } | Array<{ slug: string }> | null;
    } | Array<{
      name: string;
      programmes: { slug: string } | Array<{ slug: string }> | null;
    }> | null;
  } | Array<{
    starts_at: string;
    session_variants: {
      name: string;
      programmes: { slug: string } | Array<{ slug: string }> | null;
    } | Array<{
      name: string;
      programmes: { slug: string } | Array<{ slug: string }> | null;
    }> | null;
  }> | null;
};

const previewBookings: BookingRow[] = [
  {
    id: "preview-booking-1",
    created_at: "2026-09-18T10:15:00.000Z",
    order_id: "preview-order-1",
    customer_id: "preview-customer-1",
    slot_id: "preview-slot-1",
    source: "checkout",
    manual_payment_type: null,
    status: "confirmed",
    baby_name: "Mia",
    baby_age_months: 5,
    booking_mode: null,
    customers: { full_name: "Anna Taylor", email: "mama@example.com", phone: "07123 456789" },
    orders: { status: "paid", unit_price_pence: 1600, total_pence: 9600, refunded_pence: 0, quantity: 6 },
    slots: { starts_at: "2026-09-28T08:20:00.000Z", session_variants: { name: "Early Flow", programmes: { slug: "flow-mama-autumn-2026" } } },
  },
  {
    id: "preview-booking-2",
    created_at: "2026-09-19T14:40:00.000Z",
    order_id: null,
    customer_id: "preview-customer-2",
    slot_id: "preview-slot-2",
    source: "manual",
    manual_payment_type: "bank_transfer",
    status: "confirmed",
    baby_name: null,
    baby_age_months: null,
    booking_mode: "one_to_one",
    customers: { full_name: "Sophie Green", email: "sophie@example.com", phone: "07999 123456" },
    orders: null,
    slots: { starts_at: "2026-09-29T08:00:00.000Z", session_variants: { name: "Personal Training", programmes: { slug: "group-personal-training" } } },
  },
];

const sessionDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const bookedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function first<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function bookingAmountPence(booking: BookingRow) {
  if (booking.source === "manual") return null;
  const order = first(booking.orders);
  if (!order) return null;
  if (order.unit_price_pence !== null) return order.unit_price_pence;
  if (booking.booking_mode === "one_to_one") return 5000;
  if (booking.booking_mode === "group") return 3000;
  return order.total_pence !== null && order.quantity > 0 ? Math.round(order.total_pence / order.quantity) : null;
}

function paymentLabel(booking: BookingRow) {
  if (booking.source === "manual") {
    return (booking.manual_payment_type ?? "manual").replaceAll("_", " ");
  }
  const order = first(booking.orders);
  const amount = bookingAmountPence(booking);
  return order
    ? `${amount === null ? "Online" : `£${(amount / 100).toFixed(2)}`} · ${order.status.replaceAll("_", " ")}`
    : "Online booking";
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const admin = await requireAdmin();
  const { programme: programmeParam } = await searchParams;
  const programme = parseAdminProgrammeFilter(programmeParam);
  let bookings = previewBookings;

  if (!admin.preview) {
    const { data, error } = await createSupabaseAdmin()
      .from("bookings")
      .select("id,created_at,order_id,customer_id,slot_id,source,manual_payment_type,status,baby_name,baby_age_months,booking_mode,customers(full_name,email,phone),orders(status,unit_price_pence,total_pence,refunded_pence,quantity),slots(starts_at,session_variants(name,programmes(slug)))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to load bookings: ${error.message}`);
    bookings = (data ?? []) as BookingRow[];
  }

  const visibleBookings = bookings.filter((booking) => {
    const slot = first(booking.slots);
    const variant = first(slot?.session_variants ?? null);
    const programmeRow = first(variant?.programmes ?? null);
    return programmeMatchesFilter(programmeRow?.slug ?? "flow-mama-autumn-2026", programme);
  });
  const paidOrders = new Map<string, { total: number; refunded: number }>();
  for (const booking of visibleBookings) {
    const order = first(booking.orders);
    if (booking.order_id && order && ["paid", "partially_refunded", "refunded"].includes(order.status)) {
      paidOrders.set(booking.order_id, { total: order.total_pence ?? 0, refunded: order.refunded_pence });
    }
  }
  const receivedPence = Array.from(paidOrders.values()).reduce((sum, order) => sum + order.total - order.refunded, 0);
  const manualPayments = visibleBookings.filter((booking) => booking.source === "manual" && ["bank_transfer", "cash"].includes(booking.manual_payment_type ?? "")).length;

  return (
    <main className="admin-shell">
      <AdminHeader title="Payments & bookings" eyebrow="Reservations" active="bookings" programme={programme} />
      {admin.preview && <p className="admin-demo-note">Preview data — connect Supabase to see live bookings.</p>}
      <div className="admin-programme-filter-bar"><AdminProgrammeFilter basePath="/admin/bookings" value={programme} /></div>

      <section className="admin-stats" aria-label="Payment summary">
        <article><Banknote /><span>Net online payments received</span><strong>£{(receivedPence / 100).toFixed(2)}</strong></article>
        <article><ReceiptText /><span>Paid online orders</span><strong>{paidOrders.size}</strong></article>
        <article><CalendarCheck2 /><span>Manual payments recorded</span><strong>{manualPayments}</strong></article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <p className="booking-eyebrow">All bookings</p>
          <h2>{visibleBookings.length} {visibleBookings.length === 1 ? "booking" : "bookings"}</h2>
          <p>See what was paid, who booked, and the exact class each payment relates to. Manual bookings show their recorded payment method.</p>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Session</th><th>Customer</th><th>Attendee</th><th>Booked</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {visibleBookings.map((booking) => {
                const customer = first(booking.customers);
                const slot = first(booking.slots);
                const variant = first(slot?.session_variants ?? null);
                const programmeRow = first(variant?.programmes ?? null);
                const programmeSlug = programmeRow?.slug ?? "flow-mama-autumn-2026";
                const attendee = booking.booking_mode
                  ? booking.booking_mode === "one_to_one" ? "1:1" : "Group"
                  : booking.baby_name ? `${booking.baby_name}, ${booking.baby_age_months} months` : "—";

                return (
                  <tr key={booking.id}>
                    <td><a className="admin-row-link" href={`/admin/sessions/${booking.slot_id}`}>{slot ? sessionDateFormatter.format(new Date(slot.starts_at)) : "Unknown session"}</a><small>{variant?.name ?? "Flow Mama"} · {adminProgrammeLabel(programmeSlug)}</small></td>
                    <td><a className="admin-row-link" href={`/admin/customers/${booking.customer_id}`}>{customer?.full_name ?? "Unknown customer"}</a><small>{customer?.email ?? customer?.phone ?? "No contact details"}</small></td>
                    <td>{attendee}</td>
                    <td>{bookedDateFormatter.format(new Date(booking.created_at))}<small>{booking.source === "manual" ? "Added manually" : "Online checkout"}</small></td>
                    <td>{paymentLabel(booking)}</td>
                    <td><span className={booking.status === "confirmed" ? "admin-badge" : "admin-badge sold"}>{booking.status.replaceAll("_", " ")}</span></td>
                  </tr>
                );
              })}
              {!visibleBookings.length && <tr><td colSpan={6}>No bookings match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
