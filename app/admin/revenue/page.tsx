import { AdminHeader } from "@/components/admin-header";
import { AdminProgrammeFilter } from "@/components/admin-programme-filter";
import { adminProgrammeLabel, parseAdminProgrammeFilter, programmeMatchesFilter } from "@/lib/admin/programme-filter";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RevenuePageProps = {
  searchParams: Promise<{ range?: string; from?: string; to?: string; programme?: string }>;
};

type RevenueOrder = {
  id: string;
  created_at: string;
  total_pence: number | null;
  refunded_pence: number;
  status: string;
  programmeSlug: string;
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
  const programme = parseAdminProgrammeFilter(params.programme);
  const bounds = dateBounds(range, params.from, params.to);
  let orders: RevenueOrder[] = [];

  if (admin.preview) {
    orders = [
      { id: "preview", created_at: new Date().toISOString(), total_pence: 9600, refunded_pence: 0, status: "paid", programmeSlug: "flow-mama-autumn-2026" },
      { id: "preview-pt", created_at: new Date().toISOString(), total_pence: 3000, refunded_pence: 0, status: "paid", programmeSlug: "group-personal-training" },
    ];
  } else {
    const { data, error } = await createSupabaseAdmin()
      .from("orders")
      .select("id,created_at,total_pence,refunded_pence,status,programmes(slug)")
      .in("status", ["paid", "partially_refunded", "refunded"])
      .gte("created_at", bounds.start.toISOString())
      .lte("created_at", bounds.end.toISOString())
      .order("created_at");
    if (error) throw new Error(`Unable to load revenue: ${error.message}`);
    orders = (data ?? []).map((order) => {
      const programmeRow = Array.isArray(order.programmes) ? order.programmes[0] : order.programmes;
      return {
        id: order.id,
        created_at: order.created_at,
        total_pence: order.total_pence,
        refunded_pence: order.refunded_pence,
        status: order.status,
        programmeSlug: programmeRow && "slug" in programmeRow ? String(programmeRow.slug) : "flow-mama-autumn-2026",
      };
    });
  }

  orders = orders.filter((order) => programmeMatchesFilter(order.programmeSlug, programme));

  const gross = orders.reduce((sum, order) => sum + (order.total_pence ?? 0), 0);
  const refunds = orders.reduce((sum, order) => sum + order.refunded_pence, 0);
  const net = gross - refunds;
  const weeks = new Map<string, { flowMama: number; personalTraining: number }>();
  for (const order of orders) {
    const week = startOfWeek(order.created_at);
    const current = weeks.get(week) ?? { flowMama: 0, personalTraining: 0 };
    const value = (order.total_pence ?? 0) - order.refunded_pence;
    if (order.programmeSlug === "group-personal-training") current.personalTraining += value;
    else current.flowMama += value;
    weeks.set(week, current);
  }
  const chart = Array.from(weeks, ([week, values]) => ({ week, ...values }));
  const maxValue = Math.max(...chart.flatMap((entry) => [entry.flowMama, entry.personalTraining]), 1);
  const programmeSuffix = programme === "all" ? "" : `&programme=${programme}`;

  return (
    <main className="admin-shell">
      <AdminHeader title="Revenue" eyebrow="Reporting" active="revenue" programme={programme} />
      <div className="admin-programme-filter-bar"><AdminProgrammeFilter basePath="/admin/revenue" value={programme} preserve={{ range, from: params.from, to: params.to }} /></div>
      <div className="admin-filter-bar">
        <div className="admin-range-links"><a className={range === "7" ? "active" : ""} href={`?range=7${programmeSuffix}`}>7 days</a><a className={range === "30" ? "active" : ""} href={`?range=30${programmeSuffix}`}>30 days</a><a className={range === "90" ? "active" : ""} href={`?range=90${programmeSuffix}`}>90 days</a></div>
        <form method="get"><input type="hidden" name="range" value="custom" />{programme !== "all" && <input type="hidden" name="programme" value={programme} />}<label>From<input type="date" name="from" defaultValue={params.from} required /></label><label>To<input type="date" name="to" defaultValue={params.to} required /></label><button>Apply</button></form>
      </div>
      <section className="admin-stats">
        <article><span>Net revenue</span><strong>£{(net / 100).toFixed(2)}</strong></article>
        <article><span>Payments</span><strong>{orders.length}</strong></article>
        <article><span>Refunded</span><strong>£{(refunds / 100).toFixed(2)}</strong></article>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading admin-panel-heading-split"><div><p className="booking-eyebrow">Revenue</p><h2>Revenue by week</h2></div>{programme === "all" && <div className="revenue-legend"><span><i className="flow-mama" />Flow Mama</span><span><i className="personal-training" />Personal training</span></div>}</div>
        {chart.length ? <div className="revenue-chart" aria-label="Weekly revenue chart">{chart.map((entry) => {
          const weekTotal = entry.flowMama + entry.personalTraining;
          return <div className="revenue-bar-column" key={entry.week}><strong>£{(weekTotal / 100).toFixed(0)}</strong><div className="revenue-bar-track">{programme !== "personal-training" && <span className="flow-mama" title={`Flow Mama £${(entry.flowMama / 100).toFixed(2)}`} style={{ height: `${entry.flowMama ? Math.max(8, (entry.flowMama / maxValue) * 100) : 0}%` }} />}{programme !== "flow-mama" && <span className="personal-training" title={`Personal training £${(entry.personalTraining / 100).toFixed(2)}`} style={{ height: `${entry.personalTraining ? Math.max(8, (entry.personalTraining / maxValue) * 100) : 0}%` }} />}</div><small>{shortDate.format(new Date(entry.week))}</small></div>;
        })}</div> : <p className="admin-empty">No paid orders in this period.</p>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><p className="booking-eyebrow">Payments</p><h2>Orders in this period</h2></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Programme</th><th>Gross</th><th>Refunded</th><th>Net</th><th>Status</th></tr></thead><tbody>
          {orders.map((order) => <tr key={order.id}><td>{shortDate.format(new Date(order.created_at))}</td><td>{adminProgrammeLabel(order.programmeSlug)}</td><td>£{((order.total_pence ?? 0) / 100).toFixed(2)}</td><td>£{(order.refunded_pence / 100).toFixed(2)}</td><td>£{(((order.total_pence ?? 0) - order.refunded_pence) / 100).toFixed(2)}</td><td><span className="admin-badge">{order.status.replaceAll("_", " ")}</span></td></tr>)}
          {!orders.length && <tr><td colSpan={6}>No paid orders match these filters.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}
