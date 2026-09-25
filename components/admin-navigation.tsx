"use client";

import { useState } from "react";
import { BarChart3, CalendarCheck2, CalendarPlus, ChartNoAxesColumnIncreasing, LayoutDashboard, Mail, Menu, Users, X } from "lucide-react";
import type { AdminProgrammeFilter } from "@/lib/admin/programme-filter";

export type AdminNavItem = "overview" | "bookings" | "customers" | "revenue" | "analytics" | "emails" | "availability";

type AdminNavigationProps = {
  active: AdminNavItem;
  programme: AdminProgrammeFilter;
};

export function AdminNavigation({ active, programme }: AdminNavigationProps) {
  const [open, setOpen] = useState(false);
  const programmeQuery = programme === "all" ? "" : `?programme=${programme}`;

  return (
    <nav className={`admin-nav${open ? " open" : ""}`} aria-label="Admin navigation">
      <button className="admin-nav-toggle" type="button" aria-expanded={open} aria-controls="admin-nav-links" onClick={() => setOpen((current) => !current)}>
        <span>{open ? <X size={19} /> : <Menu size={19} />} Menu</span>
        <small>{open ? "Close" : "Admin navigation"}</small>
      </button>
      <div className="admin-nav-links" id="admin-nav-links">
        <a className={active === "overview" ? "active" : undefined} aria-current={active === "overview" ? "page" : undefined} href={`/admin${programmeQuery}`}><LayoutDashboard size={16} /> Overview</a>
        <a className={active === "bookings" ? "active" : undefined} aria-current={active === "bookings" ? "page" : undefined} href={`/admin/bookings${programmeQuery}`}><CalendarCheck2 size={16} /> Bookings</a>
        <a className={active === "customers" ? "active" : undefined} aria-current={active === "customers" ? "page" : undefined} href={`/admin/customers${programmeQuery}`}><Users size={16} /> Customers</a>
        <a className={active === "revenue" ? "active" : undefined} aria-current={active === "revenue" ? "page" : undefined} href={`/admin/revenue${programmeQuery}`}><ChartNoAxesColumnIncreasing size={16} /> Revenue</a>
        <a className={active === "analytics" ? "active" : undefined} aria-current={active === "analytics" ? "page" : undefined} href="/admin/analytics"><BarChart3 size={16} /> Analytics</a>
        <a className={active === "emails" ? "active" : undefined} aria-current={active === "emails" ? "page" : undefined} href="/admin/email-previews"><Mail size={16} /> Email previews</a>
        <a className={`admin-nav-primary${active === "availability" ? " active" : ""}`} aria-current={active === "availability" ? "page" : undefined} href="/admin/availability/new"><CalendarPlus size={16} /> New availability</a>
      </div>
    </nav>
  );
}
