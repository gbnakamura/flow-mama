import { NextResponse } from "next/server";
import { giftPacks, giftVoucherSchema } from "@/lib/gift-vouchers";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const parsed = giftVoucherSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please choose a pack and enter the recipient’s name and a valid email." }, { status: 400 });
  if (!isSupabaseConfigured() || !process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) {
    return NextResponse.json({ error: "Payments are unavailable in this preview. No payment has been taken. Please try again when online payments are connected." }, { status: 503 });
  }
  const input = parsed.data;
  const pack = giftPacks.find((pack) => pack.classes === input.classes)!;
  const supabase = createSupabaseAdmin();
  let voucherId: string | undefined;
  try {
    const { data: voucher, error } = await supabase.from("gift_vouchers").insert({
      class_count: pack.classes, total_pence: pack.pricePence,
      recipient_name: input.recipientName, recipient_email: input.recipientEmail,
    }).select("id").single();
    if (error || !voucher) throw new Error("Unable to save gift voucher");
    voucherId = voucher.id;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"],
      line_items: [{ quantity: 1, price_data: {
        currency: "gbp", unit_amount: pack.pricePence,
        product_data: { name: `Flow Mama gift voucher — ${pack.classes} class pack` },
      } }],
      metadata: { gift_voucher_id: voucher.id },
      payment_intent_data: { metadata: { gift_voucher_id: voucher.id } },
      success_url: `${process.env.APP_URL}/gift-vouchers/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/gift-vouchers?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Missing checkout URL");
    const { error: updateError } = await supabase.from("gift_vouchers").update({ stripe_checkout_session_id: session.id }).eq("id", voucher.id);
    if (updateError) {
      await getStripe().checkout.sessions.expire(session.id);
      throw new Error("Unable to attach gift voucher checkout");
    }
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Gift voucher checkout failed", error);
    if (voucherId) await supabase.from("gift_vouchers").update({ status: "payment_failed" }).eq("id", voucherId).eq("status", "pending");
    return NextResponse.json({ error: "We couldn’t start secure checkout. Please try again." }, { status: 503 });
  }
}
