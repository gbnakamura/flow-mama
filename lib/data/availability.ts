import "server-only";

import { DEMO_AVAILABILITY } from "@/lib/demo-data";
import { isBeforePersonalTrainingCutoff } from "@/lib/personal-training-booking";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { AvailabilitySlot, PersonalTrainingAvailabilitySlot } from "@/lib/types";

type AvailabilityRow = {
  id: string;
  programme_slug: string;
  variant_name: string;
  starts_at: string;
  ends_at: string;
  available: boolean;
  allowed_booking_modes?: Array<"group" | "one_to_one"> | null;
  booking_mode?: "group" | "one_to_one" | null;
  capacity?: number;
  booked_count?: number;
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

export async function listPersonalTrainingAvailability(): Promise<PersonalTrainingAvailabilitySlot[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("public_availability")
    .select("id, programme_slug, variant_name, starts_at, ends_at, available, allowed_booking_modes, booking_mode, capacity, booked_count")
    .eq("programme_slug", "group-personal-training")
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Unable to load personal training availability: ${error.message}`);

  return ((data ?? []) as AvailabilityRow[]).map((row) => ({
    id: row.id,
    programmeSlug: row.programme_slug,
    variantName: row.variant_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    available: row.available && isBeforePersonalTrainingCutoff(row.starts_at),
    allowedBookingModes: row.allowed_booking_modes ?? [],
    bookingMode: row.booking_mode ?? null,
    spacesRemaining: Math.max(0, (row.capacity ?? 0) - (row.booked_count ?? 0)),
  }));
}
