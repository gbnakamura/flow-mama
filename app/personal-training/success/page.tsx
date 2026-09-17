import { Check } from "lucide-react";

type SuccessPageProps = { searchParams: Promise<{ session_id?: string }> };

export default async function PersonalTrainingSuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  return (
    <main className="status-page">
      <img src="/images/logo.svg" alt="Flow Mama" className="status-logo" />
      <div className="status-icon"><Check aria-hidden="true" size={34} strokeWidth={2.5} /></div>
      <p className="booking-eyebrow">Payment received</p>
      <h1>Your training sessions<br /><em>are being confirmed.</em></h1>
      <p>Your places are secured once payment is confirmed. Stripe will send your payment receipt separately.</p>
      {sessionId && <p className="status-reference">Booking reference: {sessionId.slice(-12)}</p>}
      <a href="/" className="status-button">Return to Flow Mama</a>
    </main>
  );
}
