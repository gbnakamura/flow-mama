import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <img src="/images/logo.svg" alt="Flow Mama" className="booking-logo" />
      <p className="booking-eyebrow">Booking information</p>
      <h1>Terms &amp; Conditions</h1>
      <p>These terms apply to Flow Mama class bookings. By booking, you confirm that the information you provide is accurate and that you agree to these terms.</p>

      <h2>Bookings and payment</h2>
      <p>Your places are confirmed only after successful payment and you receive a confirmation email. Bookings close at 9pm on the evening before each class. Availability may change while you complete payment; if a selected place is no longer available, the card authorisation will be cancelled.</p>

      <h2>Participation</h2>
      <p>You are responsible for deciding whether a class is suitable for you and for following any advice provided by your healthcare professional. Please tell Amber about relevant injuries, symptoms or changes before participating and stop if you feel unwell or uncomfortable.</p>

      <h2>Cancellations, changes and refunds</h2>
      <p>If you cannot attend, contact Amber as soon as possible. Moving a booking to another available date or providing a refund is at Amber’s discretion and is not guaranteed. Removing a class from a booking does not automatically issue a refund.</p>
      <p>If Flow Mama cancels a session, Amber will contact affected customers and arrange either a move to another available date or an appropriate refund.</p>

      <h2>Class changes</h2>
      <p>Flow Mama may make reasonable changes to class times, location or delivery when necessary. Customers will be contacted when a material change affects their booking.</p>

      <h2>Contact</h2>
      <p>For booking questions or changes, email <a href="mailto:amber@flowmamanorthfields.com">amber@flowmamanorthfields.com</a>.</p>

      <a className="back-link" href="/book"><ArrowLeft aria-hidden="true" size={17} /> Back to booking</a>
    </main>
  );
}
