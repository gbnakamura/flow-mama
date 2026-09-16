import "server-only";

import { Resend } from "resend";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export async function sendBookingConfirmation(orderId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn("Booking confirmation skipped because Resend is not configured.");
    return;
  }

  const supabase = createSupabaseAdmin();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, customer_id, programme_id, total_pence")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw new Error(`Unable to load confirmation order: ${orderError?.message}`);

  const [{ data: customer, error: customerError }, { data: programme, error: programmeError }, { data: bookings, error: bookingsError }] = await Promise.all([
    supabase.from("customers").select("full_name, email, baby_name").eq("id", order.customer_id).single(),
    supabase.from("programmes").select("name, location").eq("id", order.programme_id).single(),
    supabase.from("bookings").select("slot_id").eq("order_id", order.id).eq("status", "confirmed"),
  ]);

  if (customerError || !customer) throw new Error(`Unable to load confirmation customer: ${customerError?.message}`);
  if (programmeError || !programme) throw new Error(`Unable to load confirmation programme: ${programmeError?.message}`);
  if (bookingsError) throw new Error(`Unable to load confirmation bookings: ${bookingsError.message}`);

  const slotIds = (bookings ?? []).map((booking) => booking.slot_id);
  const { data: slots, error: slotsError } = await supabase
    .from("slots")
    .select("id, starts_at, session_variants(name)")
    .in("id", slotIds)
    .order("starts_at", { ascending: true });
  if (slotsError) throw new Error(`Unable to load confirmation dates: ${slotsError.message}`);

  const dateItems = (slots ?? []).map((slot) => {
    const variant = Array.isArray(slot.session_variants) ? slot.session_variants[0] : slot.session_variants;
    const variantName = variant && "name" in variant ? String(variant.name) : "Flow Mama";
    return `<li style="margin:0 0 8px"><strong>${escapeHtml(variantName)}</strong> — ${escapeHtml(dateTimeFormatter.format(new Date(slot.starts_at)))}</li>`;
  }).join("");

  const total = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format((order.total_pence ?? 0) / 100);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: customer.email,
    replyTo: process.env.BOOKING_ALERT_EMAIL ?? "amber@flowmamanorthfields.com",
    subject: "Your Flow Mama classes are confirmed",
    html: `
      <div style="font-family:Arial,sans-serif;color:#2b2a25;line-height:1.55;max-width:620px;margin:auto">
        <h1 style="font-size:28px">You’re booked in, ${escapeHtml(customer.full_name)}!</h1>
        <p>We can’t wait to welcome you and ${escapeHtml(customer.baby_name)} to Flow Mama.</p>
        <h2 style="font-size:18px;margin-top:28px">Your classes</h2>
        <ul style="padding-left:20px">${dateItems}</ul>
        <p><strong>Location:</strong> ${escapeHtml(programme.location ?? "Northfields Community Centre, W13 9SS")}</p>
        <p><strong>Total paid:</strong> ${escapeHtml(total)}</p>
        <p style="margin-top:30px">Questions or changes? Reply to this email and Amber will help.</p>
      </div>
    `,
  });
  if (error) throw new Error(`Resend rejected the confirmation: ${error.message}`);
}

export async function sendCapacityUnavailableNotice(orderId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const alertEmail = process.env.BOOKING_ALERT_EMAIL ?? "amber@flowmamanorthfields.com";
  if (!apiKey || !from) return;

  const supabase = createSupabaseAdmin();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, quantity, customer_id")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw new Error(`Unable to load unavailable order: ${orderError?.message}`);

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("full_name, email")
    .eq("id", order.customer_id)
    .single();
  if (customerError || !customer) throw new Error(`Unable to load unavailable customer: ${customerError?.message}`);

  const resend = new Resend(apiKey);
  const safeName = escapeHtml(customer.full_name);
  const customerSend = resend.emails.send({
    from,
    to: customer.email,
    replyTo: alertEmail,
    subject: "A Flow Mama class became unavailable",
    html: `<div style="font-family:Arial,sans-serif;color:#2b2a25;line-height:1.55;max-width:620px;margin:auto"><h1>We’re sorry, ${safeName}</h1><p>One of your selected Flow Mama classes filled while you were completing payment, so none of the ${order.quantity} classes were booked and your card authorisation has been cancelled.</p><p>Please return to the booking page to choose from the remaining dates, or reply to this email and Amber will help.</p></div>`,
  });
  const amberSend = resend.emails.send({
    from,
    to: alertEmail,
    subject: "Flow Mama booking could not be allocated",
    html: `<div style="font-family:Arial,sans-serif;color:#2b2a25;line-height:1.55"><p><strong>${safeName}</strong> (${escapeHtml(customer.email)}) tried to book ${order.quantity} classes, but at least one place was no longer available.</p><p>The card authorisation was cancelled. Order: ${escapeHtml(order.id)}</p></div>`,
  });
  const results = await Promise.all([customerSend, amberSend]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`Resend rejected an availability notice: ${failed.error.message}`);
}
