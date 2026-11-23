"use client";

import { useState, type FormEvent } from "react";
import { giftPacks } from "@/lib/gift-vouchers";

export function GiftVoucherExperience({ cancelled }: { cancelled: boolean }) {
  const [classes, setClasses] = useState<number>(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/gift-vouchers/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classes, recipientName: form.get("recipientName"), recipientEmail: form.get("recipientEmail") }),
      });
      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error ?? "Unable to start checkout.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again."); setBusy(false);
    }
  }
  return <main className="booking-shell">
    <header className="booking-header"><a className="back-link" href="/">← Home</a><a href="/" aria-label="Flow Mama home"><img className="booking-logo" src="/images/logo.svg" alt="Flow Mama" /></a><span className="secure-note">A little time for her</span></header>
    <section className="booking-intro"><p className="booking-eyebrow">Flow Mama gift vouchers</p><h1>Give her a moment<br /><em>for herself.</em></h1><p className="booking-lede">Movement, coffee and connection. Treat a mum to a pack of Flow Mama classes, with a gift voucher emailed personally by Amber.</p></section>
    <form className="gift-form details-form" onSubmit={checkout}>
      {cancelled && <p role="status">Checkout was cancelled. You can choose a pack and try again.</p>}
      <fieldset disabled={busy} className="gift-packs"><legend>1. Choose a class pack</legend><div className="gift-pack-grid">{giftPacks.map((pack) => <label className={`gift-pack ${classes === pack.classes ? "selected" : ""}`} key={pack.classes}><input type="radio" name="pack" checked={classes === pack.classes} onChange={() => setClasses(pack.classes)} /><span>{pack.classes} class pack</span><strong>£{pack.pricePence / 100}</strong><small>Gift voucher</small></label>)}</div></fieldset>
      <div className="details-heading"><h2>2. Who’s the lucky mama?</h2><p className="details-lede">Amber will manually email the voucher to this person after payment. Enter your own email for the payment receipt at Stripe checkout.</p></div>
      <label>Recipient’s name<input name="recipientName" autoComplete="off" required maxLength={120} disabled={busy} /></label>
      <label>Recipient’s email<input name="recipientEmail" type="email" autoComplete="off" required maxLength={254} disabled={busy} /></label>
      <p className="gift-note">This is a gift voucher; no class dates are reserved at checkout.</p>
      {error && <p role="alert">{error}</p>}
      <button className="status-button" disabled={busy} type="submit">{busy ? "Opening Stripe…" : `Continue to Stripe — £${giftPacks.find((pack) => pack.classes === classes)!.pricePence / 100}`}</button>
      <p className="gift-note">Secure payment through Stripe. <a href="/terms">Read our terms</a>.</p>
    </form>
  </main>;
}
