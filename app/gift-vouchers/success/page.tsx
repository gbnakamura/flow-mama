import { getStripe } from "@/lib/stripe";
export const dynamic = "force-dynamic";
export default async function GiftVoucherSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: id } = await searchParams;
  let paid = false;
  if (id && id.startsWith("cs_") && process.env.STRIPE_SECRET_KEY) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(id);
      paid = session.payment_status === "paid" && Boolean(session.metadata?.gift_voucher_id);
    } catch { /* Display a neutral status if Stripe cannot confirm payment. */ }
  }
  return <main className="status-page"><img src="/images/logo.svg" alt="Flow Mama" className="status-logo" /><p className="booking-eyebrow">Gift vouchers</p><h1>{paid ? "Thank you for" : "Checking"}<br /><em>{paid ? "a lovely gift." : "your payment."}</em></h1><p>{paid ? "Your payment is complete. Amber will personally email the gift voucher to your recipient." : "We haven’t confirmed a completed payment here. If you completed checkout, please wait for confirmation or contact Amber before paying again."}</p><a href="/" className="status-button">Return to Flow Mama</a></main>;
}
