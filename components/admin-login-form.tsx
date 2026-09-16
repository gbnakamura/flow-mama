"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";

export function AdminLoginForm() {
  const [email, setEmail] = useState("amber@flowmamanorthfields.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = (await response.json()) as { error?: string };
    setSubmitting(false);
    if (!response.ok) return setError(result.error ?? "Sign-in failed.");
    window.location.assign("/admin");
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="pay-button" disabled={submitting} type="submit">
        {submitting && <LoaderCircle className="spin" aria-hidden="true" size={18} />}
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
