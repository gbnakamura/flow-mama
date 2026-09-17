import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendBookingConfirmation, sendCapacityUnavailableNotice } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  }

  const stripe = getStripe();
  const supabase = createSupabaseAdmin();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("stripe_events").insert({
    id: event.id,
    event_type: event.type,
  });

  if (insertError?.code === "23505") {
    const { data: previous } = await supabase
      .from("stripe_events")
      .select("status")
      .eq("id", event.id)
      .single();

    if (previous?.status !== "failed") return NextResponse.json({ received: true });

    await supabase
      .from("stripe_events")
      .update({ status: "processing", error_message: null, processed_at: null })
      .eq("id", event.id);
  } else if (insertError) {
    console.error("Unable to record Stripe event", insertError);
    return NextResponse.json({ error: "Unable to record event." }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await fulfilCheckout(event.data.object, event.id);
    } else if (event.type === "charge.refunded") {
      await recordRefund(event.data.object);
    }

    await supabase
      .from("stripe_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), error_message: null })
      .eq("id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    console.error(`Stripe webhook ${event.id} failed`, error);
    await supabase
      .from("stripe_events")
      .update({ status: "failed", error_message: message.slice(0, 1000) })
      .eq("id", event.id);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

async function fulfilCheckout(session: Stripe.Checkout.Session, eventId: string) {
  const orderId = session.metadata?.order_id;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;
  if (!orderId || !paymentIntentId) throw new Error("Checkout metadata is incomplete.");

  const stripe = getStripe();
  const supabase = createSupabaseAdmin();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status, programmes(slug)")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw new Error(`Order not found: ${orderError?.message}`);
  if (order.status === "paid") return;

  let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "requires_capture" && paymentIntent.status !== "succeeded") {
    throw new Error(`Unexpected payment status: ${paymentIntent.status}`);
  }

  const { error: authorizationError } = await supabase
    .from("orders")
    .update({
      status: "authorized",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (authorizationError) throw new Error(`Unable to authorize order: ${authorizationError.message}`);

  const { data: allocation, error: allocationError } = await supabase.rpc("allocate_order", {
    p_order_id: orderId,
  });

  if (allocationError || !allocation?.ok) {
    if (paymentIntent.status === "requires_capture") {
      await stripe.paymentIntents.cancel(paymentIntentId, {}, { idempotencyKey: `cancel-${orderId}` });
    }
    await supabase
      .from("orders")
      .update({ status: "capacity_unavailable", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    try {
      await sendCapacityUnavailableNotice(orderId);
    } catch (error) {
      console.error(`Capacity notice failed for order ${orderId}`, error);
    }
    return;
  }

  try {
    if (paymentIntent.status === "requires_capture") {
      paymentIntent = await stripe.paymentIntents.capture(
        paymentIntentId,
        {},
        { idempotencyKey: `capture-${orderId}-${eventId}` },
      );
    }
    if (paymentIntent.status !== "succeeded") throw new Error(`Capture status: ${paymentIntent.status}`);

    const { error: paidError } = await supabase
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (paidError) throw new Error(`Unable to mark order paid: ${paidError.message}`);
  } catch (error) {
    await supabase.rpc("release_order_allocation", { p_order_id: orderId, p_status: "payment_failed" });
    throw error;
  }

  const programme = Array.isArray(order.programmes) ? order.programmes[0] : order.programmes;
  if (programme?.slug !== "group-personal-training") {
    try {
      await sendBookingConfirmation(orderId);
    } catch (error) {
      console.error(`Confirmation email failed for order ${orderId}`, error);
    }
  }
}

async function recordRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const supabase = createSupabaseAdmin();
  await supabase
    .from("orders")
    .update({
      refunded_pence: charge.amount_refunded,
      status: charge.refunded ? "refunded" : "partially_refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntentId);
}
