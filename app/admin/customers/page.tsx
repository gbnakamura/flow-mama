import { Search } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CustomersPageProps = {
  searchParams: Promise<{ q?: string }>;
};

type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  baby_name: string;
  baby_age_months: number;
};

type BookingRow = {
  customer_id: string;
  slots: { starts_at: string } | Array<{ starts_at: string }> | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" });

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const admin = await requireAdmin();
  const { q = "" } = await searchParams;
  let customers: CustomerRow[] = [];
  let bookings: BookingRow[] = [];

  if (admin.preview) {
    customers = [{ id: "preview", full_name: "Preview customer", email: "mama@example.com", phone: "07123 456789", baby_name: "Mia", baby_age_months: 5 }];
    bookings = [{ customer_id: "preview", slots: { starts_at: "2026-09-21T08:20:00.000Z" } }];
  } else {
    const supabase = createSupabaseAdmin();
    const customerQuery = supabase.from("customers").select("id,full_name,email,phone,baby_name,baby_age_months").order("full_name").limit(300);
    const [{ data: customerRows, error: customerError }, { data: bookingRows, error: bookingError }] = await Promise.all([
      customerQuery,
      supabase.from("bookings").select("customer_id,slots(starts_at)").eq("status", "confirmed"),
    ]);
    if (customerError) throw new Error(`Unable to load customers: ${customerError.message}`);
    if (bookingError) throw new Error(`Unable to load customer bookings: ${bookingError.message}`);
    customers = (customerRows ?? []) as CustomerRow[];
    bookings = (bookingRows ?? []) as BookingRow[];
  }

  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    customers = customers.filter((customer) => `${customer.full_name} ${customer.email} ${customer.phone}`.toLowerCase().includes(needle));
  }

  const activity = new Map<string, { count: number; lastSeen?: string }>();
  for (const booking of bookings) {
    const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
    const current = activity.get(booking.customer_id) ?? { count: 0 };
    current.count += 1;
    if (slot?.starts_at && new Date(slot.starts_at) <= new Date() && (!current.lastSeen || slot.starts_at > current.lastSeen)) current.lastSeen = slot.starts_at;
    activity.set(booking.customer_id, current);
  }

  return (
    <main className="admin-shell">
      <AdminHeader title="Customers" eyebrow="People" />
      <section className="admin-panel">
        <div className="admin-panel-heading admin-panel-heading-split">
          <div><p className="booking-eyebrow">Directory</p><h2>{customers.length} customers</h2></div>
          <form className="admin-search" method="get"><Search size={16} /><input name="q" defaultValue={q} placeholder="Search name, email or phone" /><button>Search</button></form>
        </div>
        <div className="admin-table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Baby</th><th>Classes</th><th>Last session</th></tr></thead><tbody>
          {customers.map((customer) => {
            const customerActivity = activity.get(customer.id);
            return <tr key={customer.id}><td><a className="admin-row-link" href={`/admin/customers/${customer.id}`}>{customer.full_name}</a></td><td>{customer.email}<small>{customer.phone}</small></td><td>{customer.baby_name}, {customer.baby_age_months} months</td><td>{customerActivity?.count ?? 0}</td><td>{customerActivity?.lastSeen ? dateFormatter.format(new Date(customerActivity.lastSeen)) : "—"}</td></tr>;
          })}
          {!customers.length && <tr><td colSpan={5}>No customers match that search.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}
