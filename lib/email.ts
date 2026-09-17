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

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const sessionDayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
});

const sessionDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
});

const moneyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
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
    .select("id, starts_at, ends_at, session_variants(name)")
    .in("id", slotIds)
    .order("starts_at", { ascending: true });
  if (slotsError) throw new Error(`Unable to load confirmation dates: ${slotsError.message}`);

  const sessions = (slots ?? []).map((slot) => {
    const variant = Array.isArray(slot.session_variants) ? slot.session_variants[0] : slot.session_variants;
    const variantName = variant && "name" in variant ? String(variant.name) : "Flow Mama";
    const startsAt = new Date(slot.starts_at);
    const endsAt = new Date(slot.ends_at);
    const date = dateFormatter.format(startsAt);
    const time = `${timeFormatter.format(new Date(slot.starts_at))}–${timeFormatter.format(new Date(slot.ends_at))}`;
    return {
      className: variantName,
      dayLabel: sessionDayFormatter.format(startsAt),
      date: sessionDateFormatter.format(startsAt),
      fullDate: date,
      time,
      startsAt,
      endsAt,
    };
  });

  const classCount = sessions.length;
  const total = moneyFormatter.format((order.total_pence ?? 0) / 100);
  const pricePerClass = moneyFormatter.format(classCount ? (order.total_pence ?? 0) / 100 / classCount : 0);
  const termEndDate = sessions.length ? sessions.at(-1)?.date ?? "" : "";
  const firstName = customer.full_name.trim().split(/\s+/)[0] || customer.full_name;
  const babyName = customer.baby_name?.trim();
  const location = programme.location ?? "Northfields Community Centre, W13 9SS";
  const venueName = `Room 2, ${location.replace(/^Room 2,\s*/i, "")}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  const sessionRows = sessions.map((session) => `
    <tr>
      <td style="padding:12px 0;border-top:1px solid #EAD9BE;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3A2E22;" width="60%">
        <strong>${escapeHtml(session.dayLabel)} ${escapeHtml(session.date)}</strong><br>
        <span style="color:#7A6C5B;font-size:13px;">${escapeHtml(session.className)}</span>
      </td>
      <td align="right" style="padding:12px 0;border-top:1px solid #EAD9BE;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7A6C5B;" width="40%">
        ${escapeHtml(session.time)}
      </td>
    </tr>
  `).join("");
  const babyWelcome = babyName
    ? `I am very much looking forward to meeting you and ${escapeHtml(babyName)} for our new term.`
    : "I am very much looking forward to meeting you both for our new term.";
  const plainTextSessions = sessions
    .map((session) => `${session.fullDate} — ${session.className}, ${session.time}`)
    .join("\n");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: customer.email,
    replyTo: process.env.BOOKING_ALERT_EMAIL ?? "amber@flowmamanorthfields.com",
    subject: "Your Flow Mama classes are confirmed",
    text: `Hi ${firstName},

Thank you so much for completing your booking. ${babyName ? `I am very much looking forward to meeting you and ${babyName} for our new term.` : "I am very much looking forward to meeting you both for our new term."}

YOUR SESSIONS
${plainTextSessions}

${classCount} classes × ${pricePerClass}
Total paid: ${total}

THE VENUE
${venueName}
There is a covered buggy park outside to park your buggy safely. Limited parking spaces are also available outside the community centre.

On entering the building, go through the first door on the left and make your way through the kitchen area to the door at the end. Once through this door, walk down the corridor and you will find Room 2.

WHAT TO BRING
- A water bottle for yourself.
- Your usual baby changing bag.
- Optional: Bring a familiar blanket or favorite toy to place in the padded play zone to help your little one feel right at home.

Note: I provide all the yoga mats and props, so no need to lug yours around!

IMPORTANT: YOUR HEALTH SCREENING FORM
Because my number one priority is your safe postnatal recovery, my insurance requires every mama to fill out a quick health questionnaire before stepping onto the mat. Please fill this out before our first session so I can tailor the movements to support you perfectly.

See you soon,
Amber

Questions about your booking? Reply to this email or message @flowmamanorthfields on Instagram.`,
    html: `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Your Flow Mama booking is confirmed</title>
        <!--[if mso]><style>table{border-collapse:collapse}.fallback-font{font-family:Georgia,'Times New Roman',serif!important}</style><![endif]-->
        <style>
          body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
          img{border:0;line-height:100%;outline:none;text-decoration:none}
          table{border-collapse:collapse!important}
          body{margin:0;padding:0;width:100%!important;background-color:#F8EFE0}
          @media screen and (max-width:600px){.email-container{width:100%!important}.px-fluid{padding-left:20px!important;padding-right:20px!important}}
        </style>
      </head>
      <body style="margin:0;padding:0;background-color:#F8EFE0;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Your sessions are booked and paid for — everything you need for your first class is inside.</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8EFE0;">
          <tr><td align="center" style="padding:32px 16px;">
            <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFDF8;border-radius:16px;overflow:hidden;">
              <tr><td align="center" style="padding:32px 32px 20px;">
                <img src="https://www.flowmamanorthfields.com/images/logo.svg" width="160" height="51" alt="Flow Mama" style="display:block;width:160px;height:51px;margin:0 auto;border:0;outline:none;text-decoration:none;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7A6C5B;margin-top:4px;">Northfields Community Centre &middot; W13</div>
              </td></tr>
              <tr><td align="center" style="padding:0 32px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#EAF0E6;color:#5F7A58;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;padding:7px 16px;border-radius:999px;">&#10003; Booking confirmed</td></tr></table></td></tr>
              <tr><td class="px-fluid" style="padding:20px 40px 0;font-family:Georgia,'Times New Roman',serif;color:#3A2E22;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thank you so much for completing your booking. ${babyWelcome}</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Whether you are joining us to gently rebuild your overall strength and wellbeing, or just to drink a hot coffee while someone else smiles at your baby, you are exactly where you need to be.</p>
                <p style="margin:0 0 4px;font-size:16px;line-height:1.6;font-weight:bold;">Here is everything you need to know ahead of your first session:</p>
              </td></tr>
              <tr><td class="px-fluid" style="padding:12px 40px 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8EFE0;border-radius:12px;"><tr><td style="padding:20px 22px;font-family:Arial,Helvetica,sans-serif;color:#3A2E22;">
                <div style="font-size:11px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#7A6C5B;margin-bottom:8px;">📍 The Venue</div>
                <div style="font-size:14.5px;line-height:1.6;"><strong>${escapeHtml(venueName)}.</strong> <a href="${escapeHtml(mapsUrl)}" style="color:#E2734A;text-decoration:none;">Open in Google Maps</a><br>There is a covered buggy park outside to park your buggy safely. Limited parking spaces are also available outside the community centre.<br><br>On entering the building, go through the first door on the left and make your way through the kitchen area to the door at the end. Once through this door, walk down the corridor and you will find Room 2.</div>
                <div style="border-top:1px solid #EAD9BE;margin-top:18px;padding-top:18px;">
                  <div style="font-size:14.5px;font-weight:bold;line-height:1.5;margin-bottom:8px;">🎒 What to bring:</div>
                  <ul style="margin:0;padding-left:20px;font-size:14.5px;line-height:1.6;">
                    <li style="margin-bottom:5px;">A water bottle for yourself.</li>
                    <li style="margin-bottom:5px;">Your usual baby changing bag.</li>
                    <li>(Optional) Bring a familiar blanket or favorite toy to place in the padded play zone to help your little one feel right at home.</li>
                  </ul>
                  <div style="font-size:14.5px;line-height:1.6;margin-top:12px;"><strong>Note:</strong> I provide all the yoga mats and props, so no need to lug yours around!</div>
                </div>
                <div style="border-top:1px solid #EAD9BE;margin-top:18px;padding-top:18px;">
                  <div style="font-size:14.5px;font-weight:bold;line-height:1.5;margin-bottom:8px;">📋 IMPORTANT: Your Health Screening Form</div>
                  <div style="font-size:14.5px;line-height:1.6;">Because my number one priority is your safe postnatal recovery, my insurance requires every mama to fill out a quick health questionnaire before stepping onto the mat. Please fill this out before our first session so I can tailor the movements to support you perfectly.</div>
                </div>
              </td></tr></table></td></tr>
              <tr><td class="px-fluid" style="padding:28px 40px 0;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:16px;color:#3A2E22;margin-bottom:4px;">Your sessions this term</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A6C5B;margin-bottom:14px;">${classCount} ${classCount === 1 ? "class" : "classes"}${termEndDate ? ` &middot; through ${escapeHtml(termEndDate)}` : ""}</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${sessionRows}</table>
              </td></tr>
              <tr><td class="px-fluid" style="padding:20px 40px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #3A2E22;">
                <tr><td style="padding:14px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A6C5B;">${classCount} ${classCount === 1 ? "class" : "classes"} &times; ${escapeHtml(pricePerClass)}</td><td align="right" style="padding:14px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A6C5B;">${escapeHtml(total)}</td></tr>
                <tr><td style="padding:2px 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:bold;color:#3A2E22;">Total paid</td><td align="right" style="padding:2px 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:bold;color:#3A2E22;">${escapeHtml(total)}</td></tr>
              </table></td></tr>
              <tr><td class="px-fluid" style="padding:8px 40px 28px;font-family:Georgia,'Times New Roman',serif;color:#3A2E22;"><p style="margin:0;font-size:15px;line-height:1.6;">See you soon,<br>Amber</p></td></tr>
              <tr><td style="padding:22px 40px;background-color:#F8EFE0;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0 0 6px;font-size:12.5px;color:#7A6C5B;text-align:center;">Questions about your booking? Just reply to this email, or message us on Instagram <a href="https://instagram.com/flowmamanorthfields" style="color:#E2734A;text-decoration:none;">@flowmamanorthfields</a>.</p>
                <p style="margin:0;font-size:11.5px;color:#A6987E;text-align:center;">Flow Mama Northfields &middot; Northfields Community Centre, W13 9SS</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
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
