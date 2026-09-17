import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = { title: "Admin sign in" };

type AdminLoginPageProps = { searchParams: Promise<{ result?: string }> };

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const message = await searchParams;
  return (
    <main className="admin-login-page">
      <img src="/images/logo.svg" alt="Flow Mama" className="status-logo" />
      <p className="booking-eyebrow">Private admin</p>
      <h1>Welcome back, Amber.</h1>
      <p>Sign in with your approved email address and password.</p>
      {message.result === "password-updated" && <p className="admin-success">Your password has been updated. Sign in with the new password.</p>}
      <AdminLoginForm />
    </main>
  );
}
