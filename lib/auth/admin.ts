import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const configured = isSupabaseConfigured() && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured && process.env.NODE_ENV !== "production") {
    return { email: process.env.ADMIN_EMAIL ?? "amber@flowmamanorthfields.com", preview: true };
  }
  if (!configured) redirect("/admin/login");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : "";
  const allowed = (process.env.ADMIN_EMAIL ?? "amber@flowmamanorthfields.com").toLowerCase();
  if (error || email !== allowed) redirect("/admin/login");

  const admin = createSupabaseAdmin();
  const { data: listedAdmin } = await admin
    .from("admin_users")
    .select("email_normalized")
    .eq("email_normalized", email)
    .maybeSingle();
  if (!listedAdmin) redirect("/admin/login");

  return { email, preview: false };
}
