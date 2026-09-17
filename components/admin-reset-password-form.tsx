"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminResetPasswordForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkError = hash.get("error_description");
    if (linkError) {
      setError(linkError.replace(/\+/g, " "));
      return;
    }

    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least eight characters.");
    if (password !== confirmation) return setError("The passwords do not match.");

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      return setError(updateError.message);
    }

    await supabase.auth.signOut();
    window.location.assign("/admin/login?result=password-updated");
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>New password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!ready || submitting} /></label>
      <label>Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={!ready || submitting} /></label>
      {!ready && !error && <p className="form-helper">Checking your recovery link…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="pay-button" disabled={!ready || submitting} type="submit">
        {submitting && <LoaderCircle className="spin" aria-hidden="true" size={18} />}
        {submitting ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
