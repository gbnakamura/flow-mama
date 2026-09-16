import { CalendarPlus, ChartNoAxesColumnIncreasing, LayoutDashboard, Users } from "lucide-react";
import { signOutAdmin } from "@/app/admin/actions";

type AdminHeaderProps = {
  title: string;
  eyebrow?: string;
  active?: "overview" | "customers" | "revenue" | "availability";
};

export function AdminHeader({ title, eyebrow = "Admin", active = "overview" }: AdminHeaderProps) {
  return (
    <>
      <header className="admin-header">
        <a href="/admin" aria-label="Flow Mama admin home"><img src="/images/logo.svg" alt="Flow Mama" /></a>
        <div><p>{eyebrow}</p><h1>{title}</h1></div>
        <form action={signOutAdmin}><button type="submit">Sign out</button></form>
      </header>
      <nav className="admin-nav" aria-label="Admin navigation">
        <a className={active === "overview" ? "active" : undefined} aria-current={active === "overview" ? "page" : undefined} href="/admin"><LayoutDashboard size={16} /> Overview</a>
        <a className={active === "customers" ? "active" : undefined} aria-current={active === "customers" ? "page" : undefined} href="/admin/customers"><Users size={16} /> Customers</a>
        <a className={active === "revenue" ? "active" : undefined} aria-current={active === "revenue" ? "page" : undefined} href="/admin/revenue"><ChartNoAxesColumnIncreasing size={16} /> Revenue</a>
        <a className={`admin-nav-primary${active === "availability" ? " active" : ""}`} aria-current={active === "availability" ? "page" : undefined} href="/admin/availability/new"><CalendarPlus size={16} /> New availability</a>
      </nav>
    </>
  );
}
