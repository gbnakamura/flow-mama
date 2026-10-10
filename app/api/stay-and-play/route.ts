import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

const schema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.email().trim().max(254),
  adults: z.literal(1),
  children: z.number().int().min(0).max(10),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your name, email, and attendee numbers." }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Free bookings will open shortly. Please check back soon." }, { status: 503 });
  const input = parsed.data;
  const { data, error } = await createSupabaseAdmin().rpc("reserve_charity_stay_and_play", {
    p_full_name: input.fullName, p_email: input.email.toLowerCase(), p_adults: input.adults, p_children: input.children,
  });
  if (error) {
    console.error("Charity reservation failed", error.code);
    return NextResponse.json({ error: "We couldn't reserve your place. Please try again shortly." }, { status: 503 });
  }
  if (!data?.ok) return NextResponse.json({ error: data?.reason === "full" ? "All 15 free tickets have been booked. Please contact Flow Mama for any cancellations." : "Free bookings will open shortly. Please check back soon." }, { status: 409 });
  return NextResponse.json({ confirmed: true });
}
