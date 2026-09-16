import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const allowedEmail = (process.env.ADMIN_EMAIL ?? "amber@flowmamanorthfields.com").toLowerCase();
  if (parsed.data.email !== allowedEmail) {
    return NextResponse.json({ error: "This email does not have admin access." }, { status: 403 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) throw error;
    return NextResponse.json({ signedIn: true });
  } catch (error) {
    console.error("Admin password sign-in failed", error);
    return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  }
}
