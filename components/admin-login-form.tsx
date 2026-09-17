"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

export function AdminLoginForm() {
  const [email, setEmail] = useState("amber@flowmamanorthfields.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <label>
        Password
        <span className="password-input-wrap">
          <input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button
            className="password-visibility-button"
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
          </button>
        </span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="pay-button" disabled={submitting} type="submit">
        {submitting && <LoaderCircle className="spin" aria-hidden="true" size={18} />}
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
