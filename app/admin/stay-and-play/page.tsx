import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { RemoveCharityReservationForm } from "@/components/remove-charity-reservation-form";
import { AdminHeader } from "@/components/admin-header";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function removeReservation(formData: FormData) {
  "use server";
  const { preview } = await requireAdmin();
  if (preview) return;
  const parsed = z.uuid().safeParse(formData.get("reservationId"));
  if (!parsed.success) redirect("/admin/stay-and-play?error=remove");
  const { error } = await createSupabaseAdmin().from(formData.get("waitlist") === "true" ? "charity_waitlist" : "charity_reservations").delete()
    .eq("id", parsed.data).eq("event_slug", "stay-and-play-2026-11-02");
  if (error) redirect("/admin/stay-and-play?error=remove");
  revalidatePath("/admin/stay-and-play");
  redirect("/admin/stay-and-play?removed=1");
}

export default async function CharityReservationsPage({ searchParams }: {
  searchParams: Promise<{ removed?: string; error?: string }>;
}) {
  const message = await searchParams;
  const { preview } = await requireAdmin();
  const result = preview ? { data: [], error: null } : await createSupabaseAdmin()
    .from("charity_reservations").select("id, full_name, email, children")
    .eq("event_slug", "stay-and-play-2026-11-02").order("created_at");
  if (result.error) throw new Error("Unable to load Stay & Play reservations.");
  const reservations = result.data ?? [];
  const waitlistResult = preview ? { data: [], error: null } : await createSupabaseAdmin()
    .from("charity_waitlist").select("id, full_name, email, children")
    .eq("event_slug", "stay-and-play-2026-11-02").order("created_at");
  if (waitlistResult.error) throw new Error("Unable to load the Stay & Play waitlist.");
  const waitlist = waitlistResult.data ?? [];
  return <main className="admin-shell">
    <AdminHeader title="Stay & Play reservations" active="charity" />
    {message.removed === "1" && <p className="admin-success" role="status">Entry removed. Confirmed reservations release their ticket.</p>}
    {message.error && <p className="form-error" role="alert">Unable to remove the reservation. Please try again.</p>}
    <p>Monday 2 November 2026 · 10:45am–12:00pm · Northfields Community Centre, Room 2</p>
    <p><strong>{reservations.length} / 15 tickets booked</strong> · {reservations.reduce((total, row) => total + row.children, 0)} babies and toddlers expected</p>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Children</th><th>Actions</th></tr></thead><tbody>
      {reservations.map((row) => <tr key={row.id}><td>{row.full_name}</td><td>{row.email}</td><td>{row.children}</td><td><RemoveCharityReservationForm reservationId={row.id} name={row.full_name} disabled={preview} action={removeReservation} /></td></tr>)}
      {!reservations.length && <tr><td colSpan={4}>No reservations yet.</td></tr>}
    </tbody></table></div>
    <h2>Waitlist · {waitlist.length}</h2>
    <p>Listed in signup order. Contact people directly if a place becomes available; waitlist entries do not hold tickets.</p>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Children</th><th>Actions</th></tr></thead><tbody>
      {waitlist.map((row) => <tr key={row.id}><td>{row.full_name}</td><td>{row.email}</td><td>{row.children}</td><td><RemoveCharityReservationForm reservationId={row.id} name={row.full_name} disabled={preview} action={removeReservation} waitlist /></td></tr>)}
      {!waitlist.length && <tr><td colSpan={4}>No waitlist signups yet.</td></tr>}
    </tbody></table></div>
  </main>;
}
