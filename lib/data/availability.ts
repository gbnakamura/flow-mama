import "server-only";

import { DEMO_AVAILABILITY } from "@/lib/demo-data";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { AvailabilitySlot } from "@/lib/types";

type AvailabilityRow = {
  id: string;
  programme_slug: string;
  variant_name: string;
  starts_at: string;
  ends_at: string;
  available: boolean;
};

export async function listAvailability(
  programmeSlug = "flow-mama-autumn-2026",
): Promise<AvailabilitySlot[]> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "production") return [];
    return DEMO_AVAILABILITY;
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("public_availability")
    .select("id, programme_slug, variant_name, starts_at, ends_at, available")
    .eq("programme_slug", programmeSlug)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Unable to load availability: ${error.message}`);

  return ((data ?? []) as AvailabilityRow[]).map((row) => ({
    id: row.id,
    programmeSlug: row.programme_slug,
    variantName: row.variant_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    available: row.available,
  }));
}
