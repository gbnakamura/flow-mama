import type { Metadata } from "next";
import { AdminResetPasswordForm } from "@/components/admin-reset-password-form";

export const metadata: Metadata = { title: "Reset admin password" };

export default function AdminResetPasswordPage() {
  return (
    <main className="admin-login-page">
      <img src="/images/logo.svg" alt="Flow Mama" className="status-logo" />
      <p className="booking-eyebrow">Private admin</p>
      <h1>Choose a new password.</h1>
      <p>This secure page is only available from a valid password-recovery email.</p>
      <AdminResetPasswordForm />
    </main>
  );
}
