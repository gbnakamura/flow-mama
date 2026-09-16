import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <img src="/images/logo.svg" alt="Flow Mama" className="booking-logo" />
      <p className="booking-eyebrow">Booking information</p>
      <h1>Terms &amp; Conditions of Service</h1>
      <p>Please read these Terms and Conditions carefully before booking a session with Flow Mama. By booking a session, you agree to be bound by these terms.</p>

      <h2>1. Introduction</h2>
      <p>1.1. These terms apply to all postnatal fitness and social sessions (&quot;Sessions&quot;) provided by Flow Mama (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) to you, the client (&quot;you&quot;, &quot;your&quot;).</p>
      <p>1.2. Flow Mama operates within England and Wales, and these terms are governed by the laws of this jurisdiction.</p>

      <h2>2. Medical Clearance &amp; Health Safety</h2>
      <p>2.1. <strong>The Six-Week Sign-Off:</strong> Postnatal recovery is our priority. By booking a session, you explicitly agree and confirm that you are at least six (6) weeks postpartum and have received explicit clearance from your GP or a qualified medical professional to resume physical exercise. (If you have had a Caesarean section, we strongly advise waiting 10–12 weeks and requiring specific GP clearance).</p>
      <p>2.2. <strong>Health Screening (PAR-Q):</strong> You must complete our digital Physical Activity Readiness Questionnaire (PAR-Q) prior to attending your first Session. If your health circumstances change at any point, it is your responsibility to inform the instructor immediately.</p>
      <p>2.3. <strong>Self-Monitoring:</strong> Flow Mama provides guided postnatal movement. However, you remain solely responsible for your own safety and wellbeing during the Session. You agree to listen to your body, move at your own pace, and stop any exercise that causes pain, dizziness, or discomfort.</p>

      <h2>3. Baby Safety &amp; The &quot;Padded Play Zone&quot;</h2>
      <p>3.1. Flow Mama sessions are designed to integrate babies. We provide a sensory play area (the &quot;Play-Zone&quot;) for babies to use while you exercise.</p>
      <p>3.2. <strong>Parental Responsibility:</strong> We do not provide childcare or supervision. You remain 100% responsible for the safety, behaviour, and wellbeing of your child at all times during the 90-minute Session.</p>
      <p>3.3. <strong>Property:</strong> Flow Mama cannot be held responsible for any damage or loss to personal property (including prams, clothing, or baby equipment) brought into the venue.</p>

      <h2>4. Booking, Payment, and Cancellations</h2>
      <p>4.1. <strong>Booking:</strong> Your mat is only secured once full payment has been received via bank transfer.</p>
      <p>4.2. <strong>Flow Mama Cancellations:</strong> In the unlikely event that we need to cancel a Session (e.g., due to instructor illness or venue closure), you will be notified as soon as possible and offered a session on a rescheduled date.</p>

      <h2>5. Limitation of Liability</h2>
      <p>5.1. Nothing in these terms shall limit or exclude our liability for death or personal injury caused by our negligence, or for any other matter for which it would be unlawful to exclude liability under the laws of England and Wales.</p>
      <p>5.2. Subject to clause 5.1, Flow Mama accepts no liability for any indirect or consequential loss, damage, or injury arising from your participation in the Sessions, provided that the instructor has acted with reasonable skill and care.</p>

      <h2>6. Photography and Privacy</h2>
      <p>6.1. We respect your privacy. No photographs or videos will be taken during the Sessions for promotional purposes without your explicit prior verbal or written consent.</p>
      <p>6.2. Any personal or medical data collected via your booking or health questionnaire form will be stored securely and processed in strictly accordance with the UK General Data Protection Regulation (UK GDPR). We will never share your data with third parties.</p>

      <h2>7. Code of Conduct</h2>
      <p>7.1. Flow Mama is a supportive, non-judgmental &quot;Third Space.&quot; We reserve the right to refuse entry or ask a participant to leave if their behavior is deemed disruptive, unsafe, or inappropriate toward the instructor, the venue, or other members of the village.</p>

      <h2>8. Governing Law and Jurisdiction</h2>
      <p>8.1. These Terms and Conditions shall be governed by and construed in accordance with the laws of England and Wales.</p>
      <p>8.2. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

      <a className="back-link" href="/book"><ArrowLeft aria-hidden="true" size={17} /> Back to booking</a>
    </main>
  );
}
