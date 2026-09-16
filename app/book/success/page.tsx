import { Check } from "lucide-react";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;

  return (
    <main className="status-page">
      <img src="/images/logo.svg" alt="Flow Mama" className="status-logo" />
      <div className="status-icon"><Check aria-hidden="true" size={34} strokeWidth={2.5} /></div>
      <p className="booking-eyebrow">Payment received</p>
      <h1>We’re confirming<br /><em>your classes.</em></h1>
      <p>You’ll receive an email with all your booked dates shortly. If a class filled while you were paying, your card authorisation will be cancelled automatically.</p>
      {sessionId && <p className="status-reference">Booking reference: {sessionId.slice(-12)}</p>}
      <a href="/" className="status-button">Return to Flow Mama</a>
    </main>
  );
}
