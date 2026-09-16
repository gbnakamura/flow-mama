import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <img src="/images/logo.svg" alt="Flow Mama" className="status-logo" />
      <p className="booking-eyebrow">Private admin</p>
      <h1>Welcome back, Amber.</h1>
      <p>Use your approved email address to receive a secure sign-in link. No password needed.</p>
      <AdminLoginForm />
    </main>
  );
}
