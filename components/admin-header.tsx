import { BarChart3, CalendarPlus, ChartNoAxesColumnIncreasing, LayoutDashboard, Mail, Users } from "lucide-react";
import { signOutAdmin } from "@/app/admin/actions";
import type { AdminProgrammeFilter } from "@/lib/admin/programme-filter";

type AdminHeaderProps = {
  title: string;
  eyebrow?: string;
  active?: "overview" | "customers" | "revenue" | "analytics" | "emails" | "availability";
  programme?: AdminProgrammeFilter;
};

export function AdminHeader({ title, eyebrow = "Admin", active = "overview", programme = "all" }: AdminHeaderProps) {
  const programmeQuery = programme === "all" ? "" : `?programme=${programme}`;
  return (
    <>
      <header className="admin-header">
        <a href={`/admin${programmeQuery}`} aria-label="Flow Mama admin home"><img src="/images/logo.svg" alt="Flow Mama" /></a>
        <div><p>{eyebrow}</p><h1>{title}</h1></div>
        <form action={signOutAdmin}><button type="submit">Sign out</button></form>
      </header>
      <nav className="admin-nav" aria-label="Admin navigation">
        <a className={active === "overview" ? "active" : undefined} aria-current={active === "overview" ? "page" : undefined} href={`/admin${programmeQuery}`}><LayoutDashboard size={16} /> Overview</a>
        <a className={active === "customers" ? "active" : undefined} aria-current={active === "customers" ? "page" : undefined} href={`/admin/customers${programmeQuery}`}><Users size={16} /> Customers</a>
        <a className={active === "revenue" ? "active" : undefined} aria-current={active === "revenue" ? "page" : undefined} href={`/admin/revenue${programmeQuery}`}><ChartNoAxesColumnIncreasing size={16} /> Revenue</a>
        <a className={active === "analytics" ? "active" : undefined} aria-current={active === "analytics" ? "page" : undefined} href="/admin/analytics"><BarChart3 size={16} /> Analytics</a>
        <a className={active === "emails" ? "active" : undefined} aria-current={active === "emails" ? "page" : undefined} href="/admin/email-previews"><Mail size={16} /> Email previews</a>
        <a className={`admin-nav-primary${active === "availability" ? " active" : ""}`} aria-current={active === "availability" ? "page" : undefined} href="/admin/availability/new"><CalendarPlus size={16} /> New availability</a>
      </nav>
    </>
  );
}
