import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isBeforePersonalTrainingCutoff } from "@/lib/personal-training-booking";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { personalTrainingCheckoutSchema } from "@/lib/validation/personal-training-checkout";

const pricesByMode = {
  group: { envName: "STRIPE_GROUP_PT_PRICE_ID", expectedAmount: 3000 },
  one_to_one: { envName: "STRIPE_ONE_TO_ONE_PRICE_ID", expectedAmount: 5000 },
} as const;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Online payments are being connected. Please try again shortly." }, { status: 503 });

  const parsed = personalTrainingCheckoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });

  const appUrl = process.env.APP_URL;
  const priceIds = {
    group: process.env.STRIPE_GROUP_PT_PRICE_ID,
    one_to_one: process.env.STRIPE_ONE_TO_ONE_PRICE_ID,
  };
  if (!appUrl || !priceIds.group || !priceIds.one_to_one) return NextResponse.json({ error: "Personal training payments are not configured yet." }, { status: 503 });

  const input = parsed.data;
  const supabase = createSupabaseAdmin();
  const stripe = getStripe();
  const slotIds = input.selections.map((selection) => selection.slotId);
  const { data: rows, error: availabilityError } = await supabase
    .from("public_availability")
    .select("id, programme_slug, starts_at, available, allowed_booking_modes, booking_mode, capacity, booked_count")
    .in("id", slotIds);

  if (availabilityError) return NextResponse.json({ error: "We couldn't confirm availability." }, { status: 503 });
  if (rows?.length !== slotIds.length || rows.some((row) => row.programme_slug !== "group-personal-training" || !row.available || !isBeforePersonalTrainingCutoff(row.starts_at))) {
    return NextResponse.json({ error: "One of those sessions is no longer available. Please choose again." }, { status: 409 });
  }

  for (const selection of input.selections) {
    const slot = rows.find((row) => row.id === selection.slotId);
    const allowed = (slot?.allowed_booking_modes ?? []) as string[];
    if (!slot || !allowed.includes(selection.bookingMode) || (slot.booking_mode && slot.booking_mode !== selection.bookingMode) || (selection.bookingMode === "one_to_one" && slot.booked_count > 0)) {
      return NextResponse.json({ error: "One of those training options is no longer available. Please choose again." }, { status: 409 });
    }
  }

  const { data: programme, error: programmeError } = await supabase.from("programmes").select("id").eq("slug", "group-personal-training").single();
  if (programmeError || !programme) return NextResponse.json({ error: "Personal training is unavailable." }, { status: 503 });

  let orderId: string | undefined;
  try {
    const requiredModes = Array.from(new Set(input.selections.map((selection) => selection.bookingMode)));
    const priceEntries = await Promise.all(requiredModes.map(async (mode) => {
      const price = await stripe.prices.retrieve(priceIds[mode]!);
      const expected = pricesByMode[mode];
      if (!price.active || price.currency !== "gbp" || price.type !== "one_time" || price.billing_scheme !== "per_unit" || price.unit_amount !== expected.expectedAmount || typeof price.product !== "string") {
        throw new Error(`${expected.envName} must be an active one-time GBP price at the configured amount.`);
      }
      return [mode, price] as const;
    }));
    const priceMap = Object.fromEntries(priceEntries) as Partial<Record<(typeof requiredModes)[number], Stripe.Price>>;
    const productIds = new Set(priceEntries.map(([, price]) => String(price.product)));
    if (productIds.size !== 1) throw new Error("Personal training prices must belong to the same Stripe product.");

    const emailNormalized = input.customer.email.toLowerCase();
    const { data: customer, error: customerError } = await supabase.from("customers").upsert({
      full_name: input.customer.fullName,
      email: input.customer.email,
      email_normalized: emailNormalized,
      phone: input.customer.phone,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email_normalized" }).select("id").single();
    if (customerError || !customer) throw new Error(`Unable to save customer: ${customerError?.message}`);

    const totalPence = input.selections.reduce((sum, selection) => sum + pricesByMode[selection.bookingMode].expectedAmount, 0);
    const oneMode = requiredModes.length === 1 ? requiredModes[0] : null;
    const now = new Date().toISOString();
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      programme_id: programme.id,
      customer_id: customer.id,
      stripe_product_id: Array.from(productIds)[0],
      stripe_price_id: oneMode ? priceMap[oneMode]?.id : null,
      quantity: input.selections.length,
      unit_price_pence: oneMode ? pricesByMode[oneMode].expectedAmount : null,
      total_pence: totalPence,
      eligibility_confirmed_at: now,
      terms_accepted_at: now,
    }).select("id").single();
    if (orderError || !order) throw new Error(`Unable to create order: ${orderError?.message}`);
    orderId = order.id;

    const { error: selectionError } = await supabase.from("order_selections").insert(input.selections.map((selection) => ({
      order_id: order.id,
      slot_id: selection.slotId,
      booking_mode: selection.bookingMode,
    })));
    if (selectionError) throw new Error(`Unable to save selections: ${selectionError.message}`);

    const lineItems = requiredModes.map((mode) => ({
      price: priceMap[mode]!.id,
      quantity: input.selections.filter((selection) => selection.bookingMode === mode).length,
    }));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customer.email,
      line_items: lineItems,
      payment_method_types: ["card", "link"],
      success_url: `${appUrl}/personal-training/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/personal-training?checkout=cancelled`,
      metadata: { order_id: order.id, programme: "group-personal-training" },
      payment_intent_data: { capture_method: "manual", receipt_email: input.customer.email, metadata: { order_id: order.id } },
    } satisfies Stripe.Checkout.SessionCreateParams);
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    const { error: updateError } = await supabase.from("orders").update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (updateError) throw new Error(`Unable to attach checkout session: ${updateError.message}`);
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Personal training checkout creation failed", error);
    if (orderId) await supabase.from("orders").update({ status: "payment_failed", updated_at: new Date().toISOString() }).eq("id", orderId);
    return NextResponse.json({ error: "We couldn't start secure checkout. Please try again." }, { status: 503 });
  }
}
