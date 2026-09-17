"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronUp, LoaderCircle, LockKeyhole, ShoppingBag } from "lucide-react";
import type { AvailabilitySlot } from "@/lib/types";

type BookingExperienceProps = {
  slots: AvailabilitySlot[];
};

type CustomerForm = {
  fullName: string;
  email: string;
  phone: string;
  babyName: string;
  babyAgeMonths: string;
};

const emptyCustomer: CustomerForm = {
  fullName: "",
  email: "",
  phone: "",
  babyName: "",
  babyAgeMonths: "",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "long",
});

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function priceFor(quantity: number) {
  if (quantity >= 10) return 14;
  if (quantity >= 6) return 16;
  return 22;
}

function displaySlot(slot: AvailabilitySlot) {
  const startsAt = new Date(slot.startsAt);
  const endsAt = new Date(slot.endsAt);

  return {
    ...slot,
    date: dateFormatter.format(startsAt),
    day: dayFormatter.format(startsAt),
    month: monthFormatter.format(startsAt),
    time: `${timeFormatter.format(startsAt)}–${timeFormatter.format(endsAt)}`,
  };
}

export function BookingExperience({ slots }: BookingExperienceProps) {
  const sessions = useMemo(() => slots.map(displaySlot), [slots]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"dates" | "details">("dates");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const summaryRef = useRef<HTMLElement>(null);

  const unitPrice = priceFor(selected.size);
  const total = selected.size * unitPrice;
  const saving = selected.size * 22 - total;
  const selectedSessions = useMemo(
    () => sessions.filter((session) => selected.has(session.id)),
    [selected, sessions],
  );

  useEffect(() => {
    const summary = summaryRef.current;
    if (!summary || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setSummaryVisible(entry.isIntersecting),
      { threshold: 0.08 },
    );

    observer.observe(summary);
    return () => observer.disconnect();
  }, []);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showSummary() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    summaryRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotIds: Array.from(selected),
          customer: {
            ...customer,
            babyAgeMonths: Number(customer.babyAgeMonths),
          },
          termsAccepted,
        }),
      });
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };

      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error ?? "We couldn't start checkout. Please try again.");
      }

      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="booking-shell">
      <header className="booking-header">
        <a className="back-link" href="/">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to Flow Mama
        </a>
        <img src="/images/logo.svg" alt="Flow Mama" className="booking-logo" />
        <span className="secure-note"><LockKeyhole aria-hidden="true" size={15} /> Secure booking</span>
      </header>

      <div className="booking-intro">
        <p className="booking-eyebrow">Autumn term · Northfields</p>
        <h1>Choose the mornings<br /><em>that work for you.</em></h1>
        <p className="booking-lede">Select any mix of Early and Late Flow. Your price updates automatically as you add dates.</p>
        <div className="pricing-overview" aria-label="Price per class">
          <p>Price per class</p>
          <div className="pricing-tiers">
            <div className={selected.size >= 1 && selected.size <= 5 ? "is-current" : ""}>
              <span>1–5 classes</span>
              <strong>£22</strong>
              <small>per class</small>
            </div>
            <div className={selected.size >= 6 && selected.size <= 9 ? "is-current" : ""}>
              <span>6–9 classes</span>
              <strong>£16</strong>
              <small>per class</small>
            </div>
            <div className={selected.size >= 10 ? "is-current" : ""}>
              <span>10+ classes</span>
              <strong>£14</strong>
              <small>per class</small>
            </div>
          </div>
        </div>
      </div>

      <div className="booking-layout">
        <section aria-labelledby={step === "dates" ? "dates-heading" : "details-heading"}>
          {step === "dates" ? (
            <>
              <div className="section-heading-row">
                <div>
                  <p className="step-label">Step 1 of 2</p>
                  <h2 id="dates-heading">Select your classes</h2>
                </div>
                <p className="cutoff-note">Bookings close at 9pm the night before</p>
              </div>

              {sessions.length ? (
                <div className="session-list">
                  {sessions.map((session) => {
                    const isSelected = selected.has(session.id);
                    return (
                      <label
                        className={`session-row${isSelected ? " is-selected" : ""}${!session.available ? " is-sold-out" : ""}`}
                        key={session.id}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!session.available}
                          onChange={() => toggle(session.id)}
                          aria-label={`${session.variantName} on ${session.date}, ${session.time}`}
                        />
                        <span className="date-tile" aria-hidden="true">
                          <span>{session.day}</span>
                          <small>{session.month}</small>
                        </span>
                        <span className="session-details">
                          <strong>{session.variantName}</strong>
                          <span>{session.time}</span>
                        </span>
                        <span className={`availability${session.available ? "" : " sold-out"}`}>
                          {session.available ? "Available" : "Sold out"}
                        </span>
                        <span className="check-mark" aria-hidden="true">
                          {isSelected && <Check size={16} strokeWidth={3} />}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="booking-empty-state">
                  <h3>New dates are coming soon</h3>
                  <p>Please check back shortly or email amber@flowmamanorthfields.com.</p>
                </div>
              )}
            </>
          ) : (
            <>
              <button className="change-dates" type="button" onClick={() => setStep("dates")}>
                <ArrowLeft aria-hidden="true" size={16} /> Change selected dates
              </button>
              <div className="details-heading">
                <p className="step-label">Step 2 of 2</p>
                <h2 id="details-heading">A few details before payment</h2>
                <p className="details-lede">We’ll use these to manage your booking and send your confirmation.</p>
              </div>

              <form className="details-form" onSubmit={submit}>
                <label>
                  Your name
                  <input required autoComplete="name" value={customer.fullName} onChange={(event) => setCustomer({ ...customer, fullName: event.target.value })} />
                </label>
                <div className="form-pair">
                  <label>
                    Email
                    <input required type="email" autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
                  </label>
                  <label>
                    Phone number
                    <input required type="tel" autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
                  </label>
                </div>
                <div className="form-pair">
                  <label>
                    Baby’s name
                    <input required value={customer.babyName} onChange={(event) => setCustomer({ ...customer, babyName: event.target.value })} />
                  </label>
                  <label>
                    Baby’s age in months
                    <input required type="number" inputMode="numeric" min="0" max="60" value={customer.babyAgeMonths} onChange={(event) => setCustomer({ ...customer, babyAgeMonths: event.target.value })} />
                  </label>
                </div>
                <label className="consent-row">
                  <input required type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                  <span>I agree to the Flow Mama <a href="/terms" target="_blank">Terms &amp; Conditions</a>, including the cancellation and refund policy.</span>
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="pay-button" type="submit" disabled={submitting}>
                  {submitting ? <><LoaderCircle className="spin" aria-hidden="true" size={18} /> Opening secure checkout…</> : `Continue to payment · £${total.toFixed(2)}`}
                </button>
                <p className="confirmation-note dark">Your card is only charged after all of your selected places are confirmed.</p>
              </form>
            </>
          )}
        </section>

        <aside ref={summaryRef} className="booking-summary" aria-label="Booking summary">
          <p className="summary-kicker">Your booking</p>
          <div className="summary-count">
            <strong>{selected.size}</strong>
            <span>{selected.size === 1 ? "class selected" : "classes selected"}</span>
          </div>

          {selectedSessions.length ? (
            <ul className="selected-list">
              {selectedSessions.slice(0, 4).map((session) => (
                <li key={session.id}>
                  <span>{session.date}</span>
                  <small>{session.variantName}</small>
                </li>
              ))}
              {selectedSessions.length > 4 && <li className="more-dates">+ {selectedSessions.length - 4} more dates</li>}
            </ul>
          ) : (
            <p className="empty-summary">Choose at least one class to continue.</p>
          )}

          {saving > 0 && (
            <div className="summary-saving">
              <span>Multi-class saving</span>
              <strong>−£{saving.toFixed(2)}</strong>
            </div>
          )}

          <div className="summary-total">
            <span>Total</span>
            <strong>£{total.toFixed(2)}</strong>
          </div>

          {step === "dates" && (
            <button className="continue-button" disabled={selected.size === 0} type="button" onClick={() => setStep("details")}>
              Continue to your details
            </button>
          )}
          <p className="confirmation-note">Places are confirmed once payment is complete.</p>
        </aside>
      </div>

      {step === "dates" && selected.size > 0 && (
        <button
          className={`mobile-cart-bar${summaryVisible ? "" : " is-visible"}`}
          type="button"
          onClick={showSummary}
          aria-hidden={summaryVisible}
          tabIndex={summaryVisible ? -1 : 0}
          aria-label={`View booking summary: ${selected.size} ${selected.size === 1 ? "class" : "classes"}, £${total.toFixed(2)} total`}
        >
          <span className="mobile-cart-icon"><ShoppingBag aria-hidden="true" size={19} /></span>
          <span className="mobile-cart-copy">
            <strong>View booking</strong>
            <small>{selected.size} {selected.size === 1 ? "class" : "classes"} selected</small>
          </span>
          <strong className="mobile-cart-total">£{total.toFixed(2)}</strong>
          <ChevronUp aria-hidden="true" size={19} />
        </button>
      )}
    </main>
  );
}
