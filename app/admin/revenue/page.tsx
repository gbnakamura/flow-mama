import { AdminHeader } from "@/components/admin-header";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RevenuePageProps = {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
};

type RevenueOrder = {
  id: string;
  created_at: string;
  total_pence: number | null;
  refunded_pence: number;
  status: string;
};

const shortDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" });

function startOfWeek(value: string) {
  const date = new Date(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function dateBounds(range: string, from?: string, to?: string) {
  const end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999Z`) : new Date();
  if (range === "custom" && from && /^\d{4}-\d{2}-\d{2}$/.test(from)) return { start: new Date(`${from}T00:00:00.000Z`), end };
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  return { start: new Date(end.getTime() - days * 86400000), end };
}

export default async function RevenuePage({ searchParams }: RevenuePageProps) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const range = ["7", "30", "90", "custom"].includes(params.range ?? "") ? params.range! : "30";
  const bounds = dateBounds(range, params.from, params.to);
  let orders: RevenueOrder[] = [];

  if (admin.preview) {
    orders = [{ id: "preview", created_at: new Date().toISOString(), total_pence: 9600, refunded_pence: 0, status: "paid" }];
  } else {
    const { data, error } = await createSupabaseAdmin()
      .from("orders")
      .select("id,created_at,total_pence,refunded_pence,status")
      .in("status", ["paid", "partially_refunded", "refunded"])
      .gte("created_at", bounds.start.toISOString())
      .lte("created_at", bounds.end.toISOString())
      .order("created_at");
    if (error) throw new Error(`Unable to load revenue: ${error.message}`);
    orders = (data ?? []) as RevenueOrder[];
  }

  const gross = orders.reduce((sum, order) => sum + (order.total_pence ?? 0), 0);
  const refunds = orders.reduce((sum, order) => sum + order.refunded_pence, 0);
  const net = gross - refunds;
  const weeks = new Map<string, number>();
  for (const order of orders) {
    const week = startOfWeek(order.created_at);
    weeks.set(week, (weeks.get(week) ?? 0) + (order.total_pence ?? 0) - order.refunded_pence);
  }
  const chart = Array.from(weeks, ([week, value]) => ({ week, value }));
  const maxValue = Math.max(...chart.map((entry) => entry.value), 1);

  return (
    <main className="admin-shell">
      <AdminHeader title="Revenue" eyebrow="Reporting" />
      <div className="admin-filter-bar">
        <div className="admin-range-links"><a className={range === "7" ? "active" : ""} href="?range=7">7 days</a><a className={range === "30" ? "active" : ""} href="?range=30">30 days</a><a className={range === "90" ? "active" : ""} href="?range=90">90 days</a></div>
        <form method="get"><input type="hidden" name="range" value="custom" /><label>From<input type="date" name="from" defaultValue={params.from} required /></label><label>To<input type="date" name="to" defaultValue={params.to} required /></label><button>Apply</button></form>
      </div>
      <section className="admin-stats">
        <article><span>Net revenue</span><strong>£{(net / 100).toFixed(2)}</strong></article>
        <article><span>Payments</span><strong>{orders.length}</strong></article>
        <article><span>Refunded</span><strong>£{(refunds / 100).toFixed(2)}</strong></article>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><p className="booking-eyebrow">Flow Mama</p><h2>Revenue by week</h2></div>
        {chart.length ? <div className="revenue-chart" aria-label="Weekly revenue chart">{chart.map((entry) => <div className="revenue-bar-column" key={entry.week}><strong>£{(entry.value / 100).toFixed(0)}</strong><div className="revenue-bar-track"><span style={{ height: `${Math.max(8, (entry.value / maxValue) * 100)}%` }} /></div><small>{shortDate.format(new Date(entry.week))}</small></div>)}</div> : <p className="admin-empty">No paid orders in this period.</p>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><p className="booking-eyebrow">Payments</p><h2>Orders in this period</h2></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Gross</th><th>Refunded</th><th>Net</th><th>Status</th></tr></thead><tbody>
          {orders.map((order) => <tr key={order.id}><td>{shortDate.format(new Date(order.created_at))}</td><td>£{((order.total_pence ?? 0) / 100).toFixed(2)}</td><td>£{(order.refunded_pence / 100).toFixed(2)}</td><td>£{(((order.total_pence ?? 0) - order.refunded_pence) / 100).toFixed(2)}</td><td><span className="admin-badge">{order.status.replaceAll("_", " ")}</span></td></tr>)}
        </tbody></table></div>
      </section>
    </main>
  );
}
