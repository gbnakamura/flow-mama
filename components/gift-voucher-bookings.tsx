import { createSupabaseAdmin } from "@/lib/supabase/admin";
type Voucher = { id: string; created_at: string; recipient_name: string; recipient_email: string; purchaser_email: string | null; class_count: number; total_pence: number; refunded_pence: number; status: string };
export async function GiftVoucherBookings({ preview }: { preview: boolean }) {
  let vouchers: Voucher[] = [{ id: "sample", created_at: "2026-11-23T12:00:00Z", recipient_name: "Sample recipient", recipient_email: "recipient@example.com", purchaser_email: "buyer@example.com", class_count: 6, total_pence: 9600, refunded_pence: 0, status: "paid" }];
  let unavailable = false;
  if (!preview) {
    const { data, error } = await createSupabaseAdmin().from("gift_vouchers").select("id,created_at,recipient_name,recipient_email,purchaser_email,class_count,total_pence,refunded_pence,status").in("status", ["paid", "partially_refunded", "refunded"]).order("created_at", { ascending: false });
    if (error) { console.error("Unable to load gift vouchers", error); unavailable = true; }
    vouchers = (data ?? []) as Voucher[];
  }
  return <section className="admin-panel"><div className="admin-panel-heading"><p className="booking-eyebrow">Gift vouchers</p><h2>Recipients & purchases</h2><p>Paid gift vouchers appear here, independently of the class filter. Email each paid recipient their voucher manually. Check refund status before sending.</p></div>
    {unavailable ? <p className="admin-demo-note">Gift voucher purchases could not be loaded. Please check the database setup and try again.</p> : <div className="admin-table-wrap"><table><thead><tr><th>Purchased</th><th>Recipient</th><th>Pack</th><th>Payment</th><th>Purchaser</th><th>Status</th></tr></thead><tbody>{vouchers.map((voucher) => <tr key={voucher.id}><td>{new Date(voucher.created_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}<small>{voucher.id}</small></td><td>{voucher.recipient_name}<small><a href={`mailto:${voucher.recipient_email}`}>{voucher.recipient_email}</a></small></td><td>{voucher.class_count} class pack</td><td>£{(voucher.total_pence / 100).toFixed(2)}{voucher.refunded_pence > 0 && <small>£{(voucher.refunded_pence / 100).toFixed(2)} refunded</small>}</td><td>{voucher.purchaser_email ?? "—"}</td><td><span className={voucher.status === "paid" ? "admin-badge" : "admin-badge sold"}>{voucher.status.replaceAll("_", " ")}</span></td></tr>)}{!vouchers.length && <tr><td colSpan={6}>No paid gift vouchers yet.</td></tr>}</tbody></table></div>}
  </section>;
}
