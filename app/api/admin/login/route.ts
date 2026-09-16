import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({ email: z.email().trim().toLowerCase() });

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const allowedEmail = (process.env.ADMIN_EMAIL ?? "amber@flowmamanorthfields.com").toLowerCase();
  if (parsed.data.email !== allowedEmail) {
    return NextResponse.json({ error: "This email does not have admin access." }, { status: 403 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: `${appUrl}/auth/callback?next=/admin` },
    });
    if (error) throw error;
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Admin magic link failed", error);
    return NextResponse.json({ error: "We couldn't send the sign-in email." }, { status: 503 });
  }
}
