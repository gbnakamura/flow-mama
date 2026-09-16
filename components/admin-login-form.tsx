"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";

export function AdminLoginForm() {
  const [email, setEmail] = useState("amber@flowmamanorthfields.com");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = (await response.json()) as { error?: string };
    setSubmitting(false);
    if (!response.ok) return setError(result.error ?? "Sign-in failed.");
    setSent(true);
  }

  if (sent) {
    return <div className="admin-login-message"><h2>Check your inbox</h2><p>We sent Amber a secure sign-in link. It can only be used for a short time.</p></div>;
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="pay-button" disabled={submitting} type="submit">
        {submitting && <LoaderCircle className="spin" aria-hidden="true" size={18} />}
        {submitting ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
