import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { lookupKeyForQuantity, priceForQuantity } from "@/lib/stripe-price";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { checkoutSchema } from "@/lib/validation/checkout";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Online payments are being connected. Please try again shortly." },
      { status: 503 },
    );
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your details and try again." },
      { status: 400 },
    );
  }

  const productId = process.env.STRIPE_FLOW_MAMA_PRODUCT_ID;
  const appUrl = process.env.APP_URL;
  if (!productId || !appUrl) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const input = parsed.data;
  const supabase = createSupabaseAdmin();
  const stripe = getStripe();

  const { data: availableRows, error: availabilityError } = await supabase
    .from("public_availability")
    .select("id, programme_slug, available")
    .in("id", input.slotIds);

  if (availabilityError) {
    console.error("Checkout availability lookup failed", availabilityError);
    return NextResponse.json({ error: "We couldn't confirm availability." }, { status: 503 });
  }

  if (
    availableRows?.length !== input.slotIds.length ||
    availableRows.some((row) => !row.available) ||
    new Set(availableRows.map((row) => row.programme_slug)).size !== 1
  ) {
    return NextResponse.json(
      { error: "One of those classes is no longer available. Please choose your dates again." },
      { status: 409 },
    );
  }

  const programmeSlug = availableRows[0]?.programme_slug;
  const { data: programme, error: programmeError } = await supabase
    .from("programmes")
    .select("id")
    .eq("slug", programmeSlug)
    .single();

  if (programmeError || !programme) {
    return NextResponse.json({ error: "This programme is unavailable." }, { status: 503 });
  }

  let orderId: string | undefined;

  try {
    const product = await stripe.products.retrieve(productId);
    if (!product.active) throw new Error("Stripe product is not active.");

    const lookupKey = lookupKeyForQuantity(input.slotIds.length);
    const matchingPrices = await stripe.prices.list({
      product: product.id,
      lookup_keys: [lookupKey],
      active: true,
      type: "one_time",
      limit: 1,
    });
    const price = matchingPrices.data[0];
    if (!price) throw new Error(`Stripe price ${lookupKey} was not found.`);

    if (!price.active || price.currency !== "gbp" || price.type !== "one_time") {
      throw new Error("Stripe price must be an active one-time GBP price.");
    }

    const pricing = priceForQuantity(price, input.slotIds.length);
    const emailNormalized = input.customer.email.toLowerCase();
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          full_name: input.customer.fullName,
          email: input.customer.email,
          email_normalized: emailNormalized,
          phone: input.customer.phone,
          baby_name: input.customer.babyName,
          baby_age_months: input.customer.babyAgeMonths,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email_normalized" },
      )
      .select("id")
      .single();

    if (customerError || !customer) throw new Error(`Unable to save customer: ${customerError?.message}`);

    const now = new Date().toISOString();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        programme_id: programme.id,
        customer_id: customer.id,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        quantity: input.slotIds.length,
        unit_price_pence: pricing.unitPricePence,
        total_pence: pricing.totalPence,
        eligibility_confirmed_at: now,
        terms_accepted_at: now,
      })
      .select("id")
      .single();

    if (orderError || !order) throw new Error(`Unable to create order: ${orderError?.message}`);
    orderId = order.id;

    const { error: selectionError } = await supabase.from("order_selections").insert(
      input.slotIds.map((slotId) => ({ order_id: order.id, slot_id: slotId })),
    );
    if (selectionError) throw new Error(`Unable to save selections: ${selectionError.message}`);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customer.email,
      line_items: [{ price: price.id, quantity: input.slotIds.length }],
      payment_method_types: ["card", "link"],
      success_url: `${appUrl}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/book?checkout=cancelled`,
      metadata: { order_id: order.id },
      payment_intent_data: {
        capture_method: "manual",
        receipt_email: input.customer.email,
        metadata: { order_id: order.id },
      },
    } satisfies Stripe.Checkout.SessionCreateParams);

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    const { error: updateError } = await supabase
      .from("orders")
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    if (updateError) throw new Error(`Unable to attach checkout session: ${updateError.message}`);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Checkout creation failed", error);
    if (orderId) {
      await supabase
        .from("orders")
        .update({ status: "payment_failed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
    }
    return NextResponse.json(
      { error: "We couldn't start secure checkout. Please try again." },
      { status: 503 },
    );
  }
}
