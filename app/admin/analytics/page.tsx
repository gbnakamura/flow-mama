import { MousePointerClick, ShoppingBag } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { AdminTrafficChart } from "@/components/admin-traffic-chart";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isVercelAnalyticsConfigured, loadVercelAnalytics, type WebAnalytics } from "@/lib/data/vercel-analytics";

export const dynamic = "force-dynamic";

type AnalyticsPageProps = {
  searchParams: Promise<{ range?: string }>;
};

const shortDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" });

function dateRange(days: number) {
  const until = new Date();
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - days + 1);
  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
    sinceDate: new Date(`${since.toISOString().slice(0, 10)}T00:00:00.000Z`),
    untilDate: new Date(`${until.toISOString().slice(0, 10)}T23:59:59.999Z`),
  };
}

function readablePath(path?: string) {
  if (!path || path === "/") return "Home page";
  return path.replaceAll("-", " ").replace(/^\//, "").replaceAll("/", " › ");
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const days = params.range === "7" ? 7 : 30;
  const range = dateRange(days);
  const configured = isVercelAnalyticsConfigured();
  let analytics: WebAnalytics | null = null;
  let analyticsError = false;
  let bookings = 0;

  if (configured) {
    try {
      analytics = await loadVercelAnalytics(range.since, range.until);
    } catch (error) {
      analyticsError = true;
      console.error("Unable to load Vercel Analytics", error);
    }
  }

  if (admin.preview) {
    bookings = 2;
  } else {
    const { count, error } = await createSupabaseAdmin()
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "partially_refunded"])
      .gte("created_at", range.sinceDate.toISOString())
      .lte("created_at", range.untilDate.toISOString());
    if (error) throw new Error(`Unable to load booking count: ${error.message}`);
    bookings = count ?? 0;
  }

  const conversion = analytics?.visitors ? (bookings / analytics.visitors) * 100 : 0;
  const maxDevice = Math.max(...(analytics?.devices.map((entry) => entry.visitors) ?? []), 1);
  const dailyByDate = new Map(analytics?.daily.map((entry) => [entry.timestamp?.slice(0, 10), entry]));
  const chartPoints = Array.from({ length: days }, (_, index) => {
    const date = new Date(range.sinceDate);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const entry = dailyByDate.get(key);
    return { date: key, visitors: entry?.visitors ?? 0, pageviews: entry?.pageviews ?? 0 };
  });

  return (
    <main className="admin-shell">
      <AdminHeader title="Site analytics" eyebrow="Reporting" active="analytics" />
      <div className="admin-filter-bar admin-analytics-filter">
        <div className="admin-range-links">
          <a className={days === 7 ? "active" : ""} href="?range=7">7 days</a>
          <a className={days === 30 ? "active" : ""} href="?range=30">30 days</a>
        </div>
        <p>{shortDate.format(range.sinceDate)} – {shortDate.format(range.untilDate)}</p>
      </div>

      {!configured && (
        <section className="admin-panel admin-analytics-setup">
          <div className="admin-panel-heading">
            <p className="booking-eyebrow">One final connection</p>
            <h2>Add the Vercel reporting token</h2>
            <p>Analytics collection is installed. Add a Vercel access token named <code>VERCEL_ANALYTICS_TOKEN</code> to this project’s environment variables to show live traffic here.</p>
          </div>
        </section>
      )}

      {analyticsError && <p className="admin-demo-note">Vercel Analytics could not be reached. Check that the reporting token can access this project.</p>}

      <section className="admin-stats analytics-business-stats" aria-label="Booking summary">
        <article><ShoppingBag /><span>Paid bookings</span><strong>{bookings.toLocaleString("en-GB")}</strong></article>
        <article><MousePointerClick /><span>Bookings per 100 visitors</span><strong>{analytics ? conversion.toFixed(1) : "—"}</strong></article>
      </section>

      {analytics && (
        <>
          <AdminTrafficChart points={chartPoints} visitors={analytics.visitors} pageviews={analytics.pageviews} />

          <div className="analytics-detail-grid">
            <section className="admin-panel">
              <div className="admin-panel-heading"><p className="booking-eyebrow">Content</p><h2>Most visited pages</h2></div>
              <div className="admin-table-wrap"><table><thead><tr><th>Page</th><th>Visitors</th><th>Views</th></tr></thead><tbody>
                {analytics.pages.map((entry) => <tr key={entry.requestPath}><td><strong>{readablePath(entry.requestPath)}</strong><small>{entry.requestPath}</small></td><td>{entry.visitors.toLocaleString("en-GB")}</td><td>{entry.pageviews.toLocaleString("en-GB")}</td></tr>)}
                {!analytics.pages.length && <tr><td colSpan={3}>No page data in this period.</td></tr>}
              </tbody></table></div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-heading"><p className="booking-eyebrow">Discovery</p><h2>Top referrers</h2></div>
              <div className="admin-table-wrap"><table><thead><tr><th>Source</th><th>Visitors</th></tr></thead><tbody>
                {analytics.referrers.map((entry, index) => <tr key={`${entry.referrerHostname ?? "direct"}-${index}`}><td>{entry.referrerHostname || "Direct or unknown"}</td><td>{entry.visitors.toLocaleString("en-GB")}</td></tr>)}
                {!analytics.referrers.length && <tr><td colSpan={2}>No referral data in this period.</td></tr>}
              </tbody></table></div>
            </section>
          </div>

          <section className="admin-panel">
            <div className="admin-panel-heading"><p className="booking-eyebrow">Devices</p><h2>How visitors browse</h2></div>
            <div className="analytics-device-list">
              {analytics.devices.map((entry, index) => (
                <div className="analytics-device-row" key={`${entry.deviceType ?? "unknown"}-${index}`}>
                  <span>{entry.deviceType || "Unknown"}</span>
                  <div><i style={{ width: `${Math.max(3, (entry.visitors / maxDevice) * 100)}%` }} /></div>
                  <strong>{entry.visitors.toLocaleString("en-GB")}</strong>
                </div>
              ))}
              {!analytics.devices.length && <p className="admin-empty">No device data in this period.</p>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
