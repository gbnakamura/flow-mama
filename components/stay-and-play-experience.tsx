"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, LoaderCircle, LockKeyhole } from "lucide-react";

export function StayAndPlayExperience() {
  const [step, setStep] = useState<"event" | "details" | "confirmed">("event");
  const [waitlisted, setWaitlisted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/stay-and-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlist: true, fullName: fields.get("fullName"), email: fields.get("email"), adults: 1, children: Number(fields.get("children")) }),
      });
      const result = await response.json() as { error?: string; reason?: string; status?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "We couldn't reserve your place. Please try again.");
      }
      setWaitlisted(result.status === "waitlisted");
      setStep("confirmed");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again shortly.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="booking-shell personal-training-booking stay-and-play-booking">
    <header className="booking-header">
      <a className="back-link" href="/"><ArrowLeft aria-hidden="true" size={17} />Back to Flow Mama</a>
      <img src="/images/logo.svg" alt="Flow Mama" className="booking-logo" />
      <span className="secure-note"><LockKeyhole aria-hidden="true" size={15} /> Secure booking</span>
    </header>
    <div className="booking-intro personal-training-intro">
      <p className="booking-eyebrow">Community · Coffee · Cake</p>
      <h1>Flow Mama Charity<br /><em>Stay &amp; Play</em></h1>
      <p className="booking-lede">Supporting Chelsea &amp; Westminster Hospital! Come and join us for a special morning of community, coffee, and cake.</p>
      <div className="pt-price-overview">
        <div><span>Stay &amp; Play</span><strong>Fully booked</strong><small>Join the free waitlist</small></div>
        <div><span>Refreshments &amp; bake sale</span><strong>100%</strong><small>of proceeds go to charity</small></div>
      </div>
    </div>
    <div className="booking-layout">
      <section aria-labelledby="event-heading">
        {step === "event" ? <>
          <div className="section-heading-row"><div><p className="step-label">Monday 2 November 2026</p><h2 id="event-heading">A morning for a brilliant cause</h2></div></div>
          <div className="charity-copy">
            <p>We are opening up the doors at the community centre for a completely free Stay &amp; Play session. Come along, get out of the house, and let the little ones burn off some energy while supporting a brilliant cause.</p>
            <p>My husband has a charity place in the London Marathon to raise money for Chelsea and Westminster Hospital. To support his fundraising, we are hosting a Flow Mama bake sale.</p>
            <h3>What to expect on the day</h3>
            <div className="charity-feature"><h4>✨ The Play Zone</h4><p>Separate, designated play areas for babies and active toddlers, so everyone can explore safely.</p></div>
            <div className="charity-feature"><h4>☕️ Coffee &amp; Treats</h4><p>The session is completely free to attend, but please bring along some change for tea, coffee, and a delicious spread of baked goods available to buy.</p></div>
            <div className="charity-feature"><h4>🤍 100% to Charity</h4><p>Every single penny raised from the refreshments and bake sale will go directly to Chelsea and Westminster Hospital.</p></div>
            <p>Whether you are a regular at our Monday morning classes or you have never been to Flow Mama before, everyone is welcome.</p>
            <p>This event is now fully booked. Join the free waitlist below and Flow Mama can contact you if a place becomes available.</p>
            <p>We cannot wait to see you there! 🤍</p>
          </div>
        </> : step === "details" ? <>
          <button className="change-dates" type="button" onClick={() => setStep("event")}><ArrowLeft aria-hidden="true" size={16} /> Back to the event</button>
          <div className="details-heading"><p className="step-label">Free waitlist</p><h2 id="event-heading">Join the waitlist</h2><p className="details-lede">The event is fully booked. Leave your details so Flow Mama can contact you if a place becomes available. Joining the waitlist does not reserve a ticket.</p></div>
          <form className="details-form" onSubmit={submit}>
            <label>Your name<input name="fullName" required maxLength={150} autoComplete="name" /></label>
            <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
            <p className="details-lede">Each waitlist entry covers one adult and their children. No payment is needed.</p>
            <label>Babies &amp; toddlers coming with you<input name="children" type="number" min={0} max={10} defaultValue={1} required /></label>
            <p className="confirmation-note dark">We’ll use these details to contact you about a waitlist place.</p>
            {error && <p role="alert" className="form-error">{error}</p>}
            <button className="pay-button" disabled={submitting} type="submit">{submitting ? <><LoaderCircle size={18} aria-hidden="true" className="spin" /> Joining the waitlist…</> : "Join the waitlist"}</button>
          </form>
        </> : <div className="booking-empty-state" role="status"><Check aria-hidden="true" size={32} /><h2 id="event-heading">{waitlisted ? "You’re on the waitlist!" : "Your place is booked!"}</h2>{waitlisted ? <p>We’ve saved your details. Flow Mama can contact you if a place becomes available. This is not a confirmed ticket and no payment is needed.</p> : <><p>Your free reservation is confirmed. Save the event details here and join us on Monday 2 November, 10:45am–12:00pm, in Room 2 at Northfields Community Centre.</p><p>Please bring some change for coffee and cake. We cannot wait to see you! 🤍</p></>}</div>}
      </section>
      <aside className="booking-summary" aria-label="Event details">
        <p className="summary-kicker">Your morning with Flow Mama</p>
        <div className="summary-count"><strong>02</strong><span>November 2026</span></div>
        <ul className="selected-list"><li><span>Monday, 2 November</span><small>10:45 AM – 12:00 PM</small></li><li><span>Northfields Community Centre</span><small>Room 2</small></li><li><span>Charity Stay &amp; Play</span><small>Supporting Chelsea &amp; Westminster Hospital</small></li></ul>
        <div className="summary-total"><span>Event status</span><strong>Fully booked</strong></div>
        {step === "event" && <button className="continue-button" type="button" onClick={() => setStep("details")}>Join the waitlist</button>}
        <p className="confirmation-note">Tea, coffee, and baked treats available to buy. Every penny goes to charity.</p>
      </aside>
    </div>
  </main>;
}
