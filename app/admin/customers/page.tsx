import { Search } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { AdminProgrammeFilter } from "@/components/admin-programme-filter";
import { parseAdminProgrammeFilter, programmeMatchesFilter } from "@/lib/admin/programme-filter";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CustomersPageProps = {
  searchParams: Promise<{ q?: string; programme?: string }>;
};

type CustomerRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  baby_name: string | null;
  baby_age_months: number | null;
};

type BookingRow = {
  customer_id: string;
  slots: {
    starts_at: string;
    session_variants: {
      programmes: { slug: string } | Array<{ slug: string }> | null;
    } | Array<{
      programmes: { slug: string } | Array<{ slug: string }> | null;
    }> | null;
  } | Array<{
    starts_at: string;
    session_variants: {
      programmes: { slug: string } | Array<{ slug: string }> | null;
    } | Array<{
      programmes: { slug: string } | Array<{ slug: string }> | null;
    }> | null;
  }> | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" });

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const admin = await requireAdmin();
  const { q = "", programme: programmeParam } = await searchParams;
  const programme = parseAdminProgrammeFilter(programmeParam);
  let customers: CustomerRow[] = [];
  let bookings: BookingRow[] = [];

  if (admin.preview) {
    customers = [{ id: "preview", full_name: "Preview customer", email: "mama@example.com", phone: "07123 456789", baby_name: "Mia", baby_age_months: 5 }];
    bookings = [{ customer_id: "preview", slots: { starts_at: "2026-09-21T08:20:00.000Z", session_variants: { programmes: { slug: "flow-mama-autumn-2026" } } } }];
  } else {
    const supabase = createSupabaseAdmin();
    const customerQuery = supabase.from("customers").select("id,full_name,email,phone,baby_name,baby_age_months").order("full_name").limit(300);
    const [{ data: customerRows, error: customerError }, { data: bookingRows, error: bookingError }] = await Promise.all([
      customerQuery,
      supabase.from("bookings").select("customer_id,slots(starts_at,session_variants(programmes(slug)))").eq("status", "confirmed"),
    ]);
    if (customerError) throw new Error(`Unable to load customers: ${customerError.message}`);
    if (bookingError) throw new Error(`Unable to load customer bookings: ${bookingError.message}`);
    customers = (customerRows ?? []) as CustomerRow[];
    bookings = (bookingRows ?? []) as BookingRow[];
  }

  const activity = new Map<string, { count: number; lastSeen?: string }>();
  for (const booking of bookings) {
    const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
    const variant = slot?.session_variants
      ? (Array.isArray(slot.session_variants) ? slot.session_variants[0] : slot.session_variants)
      : null;
    const programmeRow = variant?.programmes
      ? (Array.isArray(variant.programmes) ? variant.programmes[0] : variant.programmes)
      : null;
    const slug = programmeRow?.slug ?? "flow-mama-autumn-2026";
    if (!programmeMatchesFilter(slug, programme)) continue;
    const current = activity.get(booking.customer_id) ?? { count: 0 };
    current.count += 1;
    if (slot?.starts_at && new Date(slot.starts_at) <= new Date() && (!current.lastSeen || slot.starts_at > current.lastSeen)) current.lastSeen = slot.starts_at;
    activity.set(booking.customer_id, current);
  }

  if (programme !== "all") customers = customers.filter((customer) => activity.has(customer.id));

  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    customers = customers.filter((customer) => `${customer.full_name} ${customer.email ?? ""} ${customer.phone}`.toLowerCase().includes(needle));
  }

  return (
    <main className="admin-shell">
      <AdminHeader title="Customers" eyebrow="People" active="customers" programme={programme} />
      <div className="admin-programme-filter-bar"><AdminProgrammeFilter basePath="/admin/customers" value={programme} preserve={{ q }} /></div>
      <section className="admin-panel">
        <div className="admin-panel-heading admin-panel-heading-split">
          <div><p className="booking-eyebrow">Directory</p><h2>{customers.length} customers</h2></div>
          <form className="admin-search" method="get">{programme !== "all" && <input type="hidden" name="programme" value={programme} />}<Search size={16} /><input name="q" defaultValue={q} placeholder="Search name, email or phone" /><button>Search</button></form>
        </div>
        <div className="admin-table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Baby</th><th>Classes</th><th>Last session</th></tr></thead><tbody>
          {customers.map((customer) => {
            const customerActivity = activity.get(customer.id);
            return <tr key={customer.id}><td><a className="admin-row-link" href={`/admin/customers/${customer.id}`}>{customer.full_name}</a></td><td>{customer.email ?? "No email"}<small>{customer.phone}</small></td><td>{customer.baby_name ? `${customer.baby_name}, ${customer.baby_age_months} months` : "—"}</td><td>{customerActivity?.count ?? 0}</td><td>{customerActivity?.lastSeen ? dateFormatter.format(new Date(customerActivity.lastSeen)) : "—"}</td></tr>;
          })}
          {!customers.length && <tr><td colSpan={5}>No customers match that search.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}
