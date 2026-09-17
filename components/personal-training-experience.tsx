"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, LockKeyhole } from "lucide-react";
import type { PersonalTrainingAvailabilitySlot, PersonalTrainingBookingMode } from "@/lib/types";

type Props = { slots: PersonalTrainingAvailabilitySlot[] };
type CustomerForm = { fullName: string; email: string; phone: string };

const emptyCustomer: CustomerForm = { fullName: "", email: "", phone: "" };
const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" });
const dayFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });

function priceFor(mode: PersonalTrainingBookingMode) {
  return mode === "one_to_one" ? 50 : 30;
}

function modeLabel(mode: PersonalTrainingBookingMode) {
  return mode === "one_to_one" ? "1:1 training" : "Group training";
}

export function PersonalTrainingExperience({ slots }: Props) {
  const sessions = useMemo(() => slots.map((slot) => ({
    ...slot,
    date: dateFormatter.format(new Date(slot.startsAt)),
    day: dayFormatter.format(new Date(slot.startsAt)),
    month: monthFormatter.format(new Date(slot.startsAt)),
    time: `${timeFormatter.format(new Date(slot.startsAt))}–${timeFormatter.format(new Date(slot.endsAt))}`,
  })), [slots]);
  const [selected, setSelected] = useState<Record<string, PersonalTrainingBookingMode>>({});
  const [step, setStep] = useState<"dates" | "details">("dates");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSessions = sessions.filter((session) => selected[session.id]);
  const total = selectedSessions.reduce((sum, session) => sum + priceFor(selected[session.id]), 0);

  function choose(slotId: string, mode: PersonalTrainingBookingMode) {
    setSelected((current) => {
      const next = { ...current };
      if (next[slotId] === mode) delete next[slotId];
      else next[slotId] = mode;
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/personal-training/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: Object.entries(selected).map(([slotId, bookingMode]) => ({ slotId, bookingMode })),
          customer,
          termsAccepted,
        }),
      });
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error ?? "We couldn't start checkout. Please try again.");
      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="booking-shell personal-training-booking">
      <header className="booking-header">
        <a className="back-link" href="/"><ArrowLeft aria-hidden="true" size={17} />Back to Flow Mama</a>
        <img src="/images/logo.svg" alt="Flow Mama" className="booking-logo" />
        <span className="secure-note"><LockKeyhole aria-hidden="true" size={15} /> Secure booking</span>
      </header>

      <div className="booking-intro personal-training-intro">
        <p className="booking-eyebrow">Personal training · Northfields</p>
        <h1>Choose the sessions<br /><em>that work for you.</em></h1>
        <p className="booking-lede">Book a place in a small group or reserve the whole session for one-to-one training. Group bookings will only go ahead if more than 2 people are signed up. Confirmation emails will be sent 3 days in advance and refunds will be processed immediately if cancelled.</p>
        <div className="pt-price-overview" aria-label="Personal training prices">
          <div><span>Group training</span><strong>£30</strong><small>per person, per session</small></div>
          <div><span>1:1 training</span><strong>£50</strong><small>per session</small></div>
        </div>
      </div>

      <div className="booking-layout">
        <section aria-labelledby={step === "dates" ? "dates-heading" : "details-heading"}>
          {step === "dates" ? <>
            <div className="section-heading-row"><div><p className="step-label">Step 1 of 2</p><h2 id="dates-heading">Select your sessions</h2></div><p className="cutoff-note">Bookings close 72 hours before each session</p></div>
            {sessions.length ? <div className="session-list pt-session-list">{sessions.map((session) => {
              const selectedMode = selected[session.id];
              const groupAvailable = session.available && session.allowedBookingModes.includes("group") && (!session.bookingMode || session.bookingMode === "group") && session.spacesRemaining > 0;
              const oneToOneAvailable = session.available && session.allowedBookingModes.includes("one_to_one") && !session.bookingMode && session.spacesRemaining > 0;
              return <article className={`session-row pt-session-row${selectedMode ? " is-selected" : ""}${!groupAvailable && !oneToOneAvailable ? " is-sold-out" : ""}`} key={session.id}>
                <span className="date-tile" aria-hidden="true"><span>{session.day}</span><small>{session.month}</small></span>
                <span className="session-details"><strong>{session.date}</strong><span>{session.time}</span>{session.allowedBookingModes.includes("group") && session.bookingMode !== "one_to_one" && <small>{session.spacesRemaining} group {session.spacesRemaining === 1 ? "spot" : "spots"} remaining</small>}</span>
                <span className="pt-mode-options">
                  {session.allowedBookingModes.includes("group") && <button type="button" disabled={!groupAvailable} className={selectedMode === "group" ? "is-selected" : ""} onClick={() => choose(session.id, "group")}><span>{selectedMode === "group" && <Check size={14} />}Group</span><strong>£30</strong></button>}
                  {session.allowedBookingModes.includes("one_to_one") && <button type="button" disabled={!oneToOneAvailable} className={selectedMode === "one_to_one" ? "is-selected" : ""} onClick={() => choose(session.id, "one_to_one")}><span>{selectedMode === "one_to_one" && <Check size={14} />}1:1</span><strong>£50</strong></button>}
                </span>
              </article>;
            })}</div> : <div className="booking-empty-state"><h3>New dates are coming soon</h3><p>Please check back shortly or email amber@flowmamanorthfields.com.</p></div>}
          </> : <>
            <button className="change-dates" type="button" onClick={() => setStep("dates")}><ArrowLeft aria-hidden="true" size={16} /> Change selected sessions</button>
            <div className="details-heading"><p className="step-label">Step 2 of 2</p><h2 id="details-heading">A few details before payment</h2><p className="details-lede">We’ll use these to manage your booking.</p></div>
            <form className="details-form" onSubmit={submit}>
              <label>Your name<input required autoComplete="name" value={customer.fullName} onChange={(event) => setCustomer({ ...customer, fullName: event.target.value })} /></label>
              <div className="form-pair"><label>Email<input required type="email" autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label><label>Phone number<input required type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label></div>
              <label className="consent-row"><input required type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>I agree to the Flow Mama <a href="/terms" target="_blank">Terms &amp; Conditions</a>, including the cancellation and refund policy.</span></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="pay-button" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" aria-hidden="true" size={18} /> Opening secure checkout…</> : `Continue to payment · £${total.toFixed(2)}`}</button>
              <p className="confirmation-note dark">Your card is only charged after all selected sessions are confirmed.</p>
            </form>
          </>}
        </section>

        <aside className="booking-summary" aria-label="Booking summary">
          <p className="summary-kicker">Your booking</p>
          <div className="summary-count"><strong>{selectedSessions.length}</strong><span>{selectedSessions.length === 1 ? "session selected" : "sessions selected"}</span></div>
          {selectedSessions.length ? <ul className="selected-list">{selectedSessions.map((session) => <li key={session.id}><span>{session.date}</span><small>{session.time} · {modeLabel(selected[session.id])}</small></li>)}</ul> : <p className="empty-summary">Choose at least one session to continue.</p>}
          <div className="summary-total"><span>Total</span><strong>£{total.toFixed(2)}</strong></div>
          {step === "dates" && <button className="continue-button" disabled={!selectedSessions.length} type="button" onClick={() => setStep("details")}>Continue to your details</button>}
          <p className="confirmation-note">Places are confirmed once payment is complete.</p>
        </aside>
      </div>
    </main>
  );
}
